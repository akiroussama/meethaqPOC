# Round 2 branch push troubleshooting

If you see errors like:

- `bash: syntax error near unexpected token newline`
- `non-fast-forward` when pushing `main`
- `src refspec ... does not match any`

use the steps below.

## 1) Configure remote

```bash
git remote add origin https://github.com/akiroussama/meethaqPOC.git
```

If it already exists:

```bash
git remote set-url origin https://github.com/akiroussama/meethaqPOC.git
```

## 2) Sync your local `main`

```bash
git fetch origin
git checkout main
git pull --rebase origin main
```

## 3) Push branches safely

Use the helper script (recommended):

```bash
bash scripts/push-round2-branches.sh origin
```

## Why your previous attempt failed

- The copied command contained literal `\\n` text, which Bash interpreted as invalid syntax.
- `main` was behind `origin/main`, so Git rejected a non-fast-forward push.
- The listed `legit/*` and `subtle/*` branches did not exist in your local repo at that time.
