#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="${1:-origin}"

branches=(
  "legit/refactor-pricing-extract-method"
  "legit/add-shipping-weight-validation"
  "legit/rename-loyalty-method"
  "legit/add-order-logging"
  "legit/add-cart-total-method"
  "subtle/off-by-one-shipping-threshold"
  "subtle/rounding-before-vat"
  "subtle/promo-stackable-ignored"
  "subtle/loyalty-points-shipping-included"
  "subtle/quantity-discount-boundary"
)

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Remote '$REMOTE_NAME' is not configured."
  echo "Add it first, for example: git remote add $REMOTE_NAME <repo-url>"
  exit 1
fi

echo "Fetching $REMOTE_NAME..."
git fetch "$REMOTE_NAME"

echo "Syncing local main with $REMOTE_NAME/main (rebase)..."
git checkout main
if git show-ref --verify --quiet "refs/remotes/$REMOTE_NAME/main"; then
  git pull --rebase "$REMOTE_NAME" main
fi

echo "Pushing main..."
git push -u "$REMOTE_NAME" main

for branch in "${branches[@]}"; do
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "Pushing $branch..."
    git push -u "$REMOTE_NAME" "$branch"
  else
    echo "Skipping $branch (missing locally)."
  fi
done

echo "Done."
