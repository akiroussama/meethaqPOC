#!/usr/bin/env ts-node
import Anthropic from '@anthropic-ai/sdk';
import * as chalk from 'chalk';
import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { minimatch } from 'minimatch';
import * as YAML from 'yaml';

type ConstitutionRule = {
  id: string;
  title: string;
  category: string;
  rule: string;
  type: string;
  enforcement: string;
  status: string;
  confidence: string;
};

type JurisprudenceCase = {
  rule_id: string;
  type: string;
  given: string;
  when: string;
  then: string;
  source: string;
};

type CadastreMapping = { rule_id: string; paths: string[] };

type CbcConfig = {
  llm: { provider: string; model: string; max_tokens: number };
  analysis: { min_confidence: number; max_code_context_chars: number; max_rules_per_analysis: number };
};

type Violation = {
  rule_id: string;
  confidence: number;
  file: string;
  line_range: string;
  description: string;
  question: string;
  jurisprudence_ref: string;
  suggested_fix: string;
};

type AnalysisResult = {
  branch: string;
  violations: Violation[];
  no_violation_files: string[];
  analysis_notes: string;
};

const program = new Command()
  .option('--branch <name>', 'analyze a branch against main')
  .option('--all', 'analyze all bug/* branches')
  .option('--dry-run', 'print prompt only, do not call Claude API')
  .parse(process.argv);

const opts = program.opts<{ branch?: string; all?: boolean; dryRun?: boolean }>();

function run(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function readYaml<T>(path: string): T {
  return YAML.parse(readFileSync(path, 'utf8')) as T;
}

function ensureGitRef(ref: string): void {
  run(`git rev-parse --verify ${ref}`);
}

function listTargetBranches(): string[] {
  if (opts.branch) return [opts.branch];
  if (!opts.all) throw new Error('Provide --branch <name> or --all');

  let lines = run('git for-each-ref --format="%(refname:short)" refs/heads/bug/')
    .split('\n')
    .filter(Boolean);

  if (lines.length === 0) {
    try {
      run('git fetch origin');
    } catch {
      // ignore fetch errors and keep local fallback behavior
    }

    const remotes = run('git for-each-ref --format="%(refname:short)" refs/remotes/origin/bug/')
      .split('\n')
      .filter(Boolean);

    for (const remote of remotes) {
      const local = remote.replace('origin/', '');
      try {
        run(`git branch --track ${local} ${remote}`);
      } catch {
        // already exists locally
      }
      lines.push(local);
    }
  }

  return lines;
}

function resolveRulesForFiles(files: string[], mappings: CadastreMapping[], maxRules: number): string[] {
  const matched = new Set<string>();
  for (const file of files) {
    for (const mapping of mappings) {
      if (mapping.paths.some((pattern) => minimatch(file, pattern, { dot: true }))) {
        matched.add(mapping.rule_id);
      }
    }
  }
  return [...matched].slice(0, maxRules);
}

function safeBranchFile(branch: string): string {
  return branch.replaceAll('/', '__');
}

function extractJson(raw: string): AnalysisResult {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('No JSON object found in model response');
  return JSON.parse(raw.slice(start, end + 1)) as AnalysisResult;
}

function pickSourceContext(branch: string, files: string[], maxChars: number): string {
  let remaining = maxChars;
  const chunks: string[] = [];

  for (const file of files) {
    if (remaining <= 0) break;
    let content = '';
    try {
      content = run(`git show ${branch}:${file}`);
    } catch {
      continue;
    }

    const header = `\n### FILE: ${file}\n`;
    const allowed = Math.max(0, remaining - header.length);
    const slice = content.slice(0, allowed);
    chunks.push(`${header}${slice}`);
    remaining -= header.length + slice.length;
  }

  return chunks.join('\n');
}

function buildPrompt(
  rules: ConstitutionRule[],
  jurisprudence: JurisprudenceCase[],
  diff: string,
  sourceCodeContext: string,
  minConfidence: number
): string {
  const rulesYaml = YAML.stringify({ rules });
  const jurisprudenceYaml = YAML.stringify({ cases: jurisprudence });

  return `Tu es un agent de conformité métier. Tu analyses un diff Git pour détecter des violations de règles métier.

## Règles métier à vérifier

${rulesYaml}

## Cas de référence (Jurisprudence)

${jurisprudenceYaml}

## Diff à analyser

${diff}

## Code source des fonctions impactées (contexte)

${sourceCodeContext}

## Instructions

Analyse le diff ci-dessus et détermine si des règles métier sont violées.

Pour chaque violation détectée, réponds avec ce format JSON :

{
  "violations": [
    {
      "rule_id": "BR-XXX",
      "confidence": 0.95,
      "file": "src/modules/xxx/xxx.service.ts",
      "line_range": "42-48",
      "description": "Description courte du problème détecté",
      "question": "Question formulée pour le développeur (format non-accusatoire)",
      "jurisprudence_ref": "Référence au cas de jurisprudence le plus pertinent",
      "suggested_fix": "Suggestion de correction"
    }
  ],
  "no_violation_files": ["liste des fichiers analysés sans problème"],
  "analysis_notes": "Notes optionnelles sur le contexte ou les limites de l'analyse"
}

Si aucune violation n'est détectée, retourne : { "violations": [], "no_violation_files": [...], "analysis_notes": "..." }

IMPORTANT :
- Ne signale une violation que si tu es confiant à ≥ ${Math.round(minConfidence * 100)}%.
- Préfère rater un bug que faire un faux positif.
- Formule la "question" de manière non-accusatoire (c'est une question, pas un jugement).
- Cite toujours un cas de jurisprudence si pertinent.
- Retourne uniquement du JSON valide.`;
}

async function callClaude(prompt: string, cfg: CbcConfig): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required (unless --dry-run)');

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: cfg.llm.model,
    max_tokens: cfg.llm.max_tokens,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  return extractJson(text);
}

function printSummary(results: AnalysisResult[]): void {
  const rows = results.map((result) => {
    const avg =
      result.violations.length > 0
        ? result.violations.reduce((acc, v) => acc + v.confidence, 0) / result.violations.length
        : 0;
    const rules = [...new Set(result.violations.map((v) => v.rule_id))].join(', ') || '-';
    return {
      branch: result.branch,
      violations: result.violations.length,
      confidence: `${Math.round(avg * 100)}%`,
      rules
    };
  });

  const totalViolations = rows.reduce((acc, row) => acc + row.violations, 0);
  const confidences = results.flatMap((r) => r.violations.map((v) => v.confidence));
  const avgConfidence = confidences.length > 0 ? Math.round((confidences.reduce((a, c) => a + c, 0) / confidences.length) * 100) : 0;

  console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                    CBC ANALYSIS REPORT                          ║'));
  console.log(chalk.cyan('╠══════════════════════════╦═══════════╦════════════╦═════════════╣'));
  console.log(chalk.cyan('║ Branch                   ║ Violations║ Confidence ║ Rules Hit   ║'));
  console.log(chalk.cyan('╠══════════════════════════╬═══════════╬════════════╬═════════════╣'));
  for (const row of rows) {
    const line = `║ ${row.branch.padEnd(24)} ║ ${String(row.violations).padEnd(9)} ║ ${row.confidence.padEnd(10)} ║ ${row.rules.padEnd(11)} ║`;
    console.log(chalk.cyan(line));
  }
  console.log(chalk.cyan('╠══════════════════════════╬═══════════╬════════════╬═════════════╣'));
  console.log(chalk.cyan(`║ TOTAL                    ║ ${String(totalViolations).padEnd(9)} ║ Avg ${String(avgConfidence).padEnd(3)}%  ║             ║`));
  console.log(chalk.cyan('╠══════════════════════════╩═══════════╩════════════╩═════════════╣'));
  console.log(chalk.cyan('║ True Positives: N/A | False Positives: N/A | Missed: N/A        ║'));
  console.log(chalk.cyan('║ Precision: N/A | Cost: N/A                                      ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════╝\n'));
}

async function main(): Promise<void> {
  ensureGitRef('main');
  const cfg = readYaml<CbcConfig>('.cbc/config.yaml');
  const constitution = readYaml<{ rules: ConstitutionRule[] }>('.cbc/constitution.yaml');
  const jurisprudence = readYaml<{ cases: JurisprudenceCase[] }>('.cbc/jurisprudence.yaml');
  const cadastre = readYaml<{ mappings: CadastreMapping[] }>('.cbc/cadastre.yaml');

  const branches = listTargetBranches();
  if (branches.length === 0) throw new Error('No branch matched the selection');

  const reportsDir = join('.cbc', 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const results: AnalysisResult[] = [];
  for (const branch of branches) {
    ensureGitRef(branch);
    const diff = run(`git diff main..${branch}`);
    const files = run(`git diff --name-only main..${branch}`).split('\n').filter(Boolean);
    const ruleIds = resolveRulesForFiles(files, cadastre.mappings, cfg.analysis.max_rules_per_analysis);
    const rules = constitution.rules.filter((rule) => ruleIds.includes(rule.id));
    const cases = jurisprudence.cases.filter((item) => ruleIds.includes(item.rule_id));
    const sourceCodeContext = pickSourceContext(branch, files, cfg.analysis.max_code_context_chars);
    const prompt = buildPrompt(rules, cases, diff, sourceCodeContext, cfg.analysis.min_confidence);

    if (opts.dryRun) {
      console.log(chalk.yellow(`\n===== DRY RUN: ${branch} =====\n`));
      console.log(prompt);
      console.log(chalk.yellow(`\n===== END DRY RUN: ${branch} =====\n`));
      const dryResult: AnalysisResult = {
        branch,
        violations: [],
        no_violation_files: files,
        analysis_notes: 'Dry-run mode: no LLM call performed.'
      };
      results.push(dryResult);
      writeFileSync(join(reportsDir, `${safeBranchFile(branch)}.json`), JSON.stringify(dryResult, null, 2));
      continue;
    }

    const llmResult = await callClaude(prompt, cfg);
    const normalized: AnalysisResult = {
      branch,
      violations: llmResult.violations ?? [],
      no_violation_files: llmResult.no_violation_files ?? [],
      analysis_notes: llmResult.analysis_notes ?? ''
    };
    results.push(normalized);
    writeFileSync(join(reportsDir, `${safeBranchFile(branch)}.json`), JSON.stringify(normalized, null, 2));
    console.log(chalk.green(`Analyzed ${branch}: ${normalized.violations.length} violation(s).`));
  }

  printSummary(results);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`cbc-analyze failed: ${message}`));
  process.exit(1);
});
