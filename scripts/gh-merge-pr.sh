#!/usr/bin/env bash
# Merges a PR (squash), deletes the remote branch, and syncs local main.
set -euo pipefail

pr_number="${1:-}"
delete_branch="${2:-true}"

if [[ -z "$pr_number" ]]; then
  pr_number="$(gh pr view --json number -q .number 2>/dev/null || true)"
fi

if [[ -z "$pr_number" ]]; then
  echo "Usage: ./scripts/gh-merge-pr.sh <pr-number>"
  exit 1
fi

gh pr merge "$pr_number" --squash --delete-branch

git checkout main
git pull origin main

if [[ "$delete_branch" == "true" ]]; then
  merged_branch="$(gh pr view "$pr_number" --json headRefName -q .headRefName 2>/dev/null || true)"
  if [[ -n "$merged_branch" ]]; then
    git branch -d "$merged_branch" 2>/dev/null || true
  fi
fi

echo "Merged PR #$pr_number and updated local main."
