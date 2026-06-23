#!/usr/bin/env bash
# Installs repo git hooks into .git/hooks (local only; not committed).
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
hooks_dir="$repo_root/.git/hooks"

if [[ ! -d "$repo_root/.git" ]]; then
  echo "Skipping git hook install: not a git repository."
  exit 0
fi

mkdir -p "$hooks_dir"
for hook in prepare-commit-msg commit-msg; do
  cp "$repo_root/scripts/git-hooks/$hook" "$hooks_dir/$hook"
  chmod +x "$hooks_dir/$hook"
done

echo "Installed prepare-commit-msg and commit-msg hooks."
