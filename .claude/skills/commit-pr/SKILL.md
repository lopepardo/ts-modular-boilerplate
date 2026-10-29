---
name: commit-pr
description: Crea un commit con Conventional Commits, hace push y abre un PR con gh
disable-model-invocation: true
---

Estado actual:
!`git status --short`
!`git diff --stat`

1. Revisa el diff y agrupa los cambios en un commit coherente.
2. Escribe el mensaje con Conventional Commits. Pista del usuario: $ARGUMENTS
3. Haz push de la rama actual.
4. Abre el PR con gh pr create: qué cambia, cómo se probó y riesgos.
