#!/usr/bin/env bash
# Creates a GitHub issue from a repo template (Feature, Bug, or Chore).
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/gh-new-issue.sh <feature|bug|chore> "Title" [body-file]

Opens the GitHub issue form template in the browser when body-file is omitted.
When body-file is provided, creates the issue non-interactively.

Examples:
  ./scripts/gh-new-issue.sh feature "Cash export"
  ./scripts/gh-new-issue.sh bug "OpenRouter 429" /tmp/issue-body.md
EOF
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

kind="$1"
title="$2"
body_file="${3:-}"

case "$kind" in
  feature|bug|chore) template_name="$(tr '[:lower:]' '[:upper:]' <<< "${kind:0:1}")${kind:1}" ;;
  *)
    echo "Unknown template kind: $kind (use feature, bug, or chore)"
    exit 1
    ;;
esac

if [[ -z "$body_file" ]]; then
  gh issue create --template "$template_name" --title "$title" --web
  exit 0
fi

if [[ ! -f "$body_file" ]]; then
  echo "Body file not found: $body_file"
  exit 1
fi

gh issue create --template "$template_name" --title "$title" --body-file "$body_file"
