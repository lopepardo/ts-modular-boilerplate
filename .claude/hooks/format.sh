#!/usr/bin/env bash
# PostToolUse(Edit|Write): runs prettier on the file just edited.
# Exit 2 cannot undo the edit but sends stderr to Claude: used only for real prettier errors.
f=$(jq -r '.tool_input.file_path // empty') || exit 0
[ -n "$f" ] && [ -f "$f" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Local binary directly (~3x faster than "pnpm exec"); falls back to pnpm exec if missing.
if [ -x node_modules/.bin/prettier ]; then
  run() { node_modules/.bin/prettier "$@"; }
else
  command -v pnpm >/dev/null 2>&1 || exit 0
  run() { pnpm exec prettier "$@"; }
fi

out=$(run --write --ignore-unknown "$f" 2>&1) || { printf 'prettier failed on %s:\n%s\n' "$f" "$out" >&2; exit 2; }
exit 0