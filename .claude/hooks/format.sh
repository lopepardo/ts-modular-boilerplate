#!/usr/bin/env bash
# .claude/hooks/format.sh — PostToolUse(Edit|Write): prettier sobre el archivo recién editado.
# PostToolUse corre DESPUÉS de que la herramienta ya actuó: exit 2 no deshace nada, pero
# manda stderr a Claude. Lo usamos solo para errores reales de prettier (p. ej. sintaxis).
f=$(jq -r '.tool_input.file_path // empty') || exit 0
[ -n "$f" ] && [ -f "$f" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Binario local directo (~3x más rápido que "pnpm exec"); si no existe, cae a pnpm exec.
if [ -x node_modules/.bin/prettier ]; then
  run() { node_modules/.bin/prettier "$@"; }
else
  command -v pnpm >/dev/null 2>&1 || exit 0
  run() { pnpm exec prettier "$@"; }
fi

out=$(run --write --ignore-unknown "$f" 2>&1) || { printf 'prettier falló en %s:\n%s\n' "$f" "$out" >&2; exit 2; }
exit 0