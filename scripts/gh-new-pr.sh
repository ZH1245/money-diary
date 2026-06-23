#!/usr/bin/env bash
# Opens a PR for the current branch using the repo PR template.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
template="$repo_root/.github/PULL_REQUEST_TEMPLATE.md"
base_branch="${1:-main}"

if [[ ! -f "$template" ]]; then
  echo "PR template not found: $template"
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" == "$base_branch" ]]; then
  echo "Refusing to open a PR from $base_branch. Create a feature branch first."
  exit 1
fi

if ! git rev-parse --abbrev-ref "@{u}" >/dev/null 2>&1; then
  git push -u origin HEAD
else
  git push
fi

pr_title="$(git log "$base_branch"..HEAD --oneline --reverse | head -1 | sed 's/^[^ ]* //')"
if [[ -z "$pr_title" ]]; then
  pr_title="$current_branch"
fi

gh pr create --base "$base_branch" --title "$pr_title" --body-file "$template"
