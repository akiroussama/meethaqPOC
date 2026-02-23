# CBC (Constitutional Business Check)

This folder contains the business-rule constitution and analyzer configuration.

## Run analysis

```bash
# Single branch
npx ts-node scripts/cbc-analyze.ts --branch bug/tax-rate-hygiene

# All bug/* branches
npx ts-node scripts/cbc-analyze.ts --all

# Dry-run (prompt only)
npx ts-node scripts/cbc-analyze.ts --branch bug/tax-rate-hygiene --dry-run
```

## Requirements

```bash
export ANTHROPIC_API_KEY=sk-...
```

Reports are written to `.cbc/reports/*.json`.
