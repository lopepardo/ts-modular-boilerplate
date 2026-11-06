---
name: commit-pr
description: Verify the project, create a Conventional Commits commit on a feat/ or fix/ branch, push it and open a PR with gh
disable-model-invocation: true
---

Current state:
!`git branch --show-current`
!`git status --short`
!`git diff --stat`

1. Run `pnpm typecheck && pnpm lint && pnpm test`. Stop and report if anything fails. If endpoint behavior changed, check that `docs/api.md` matches.
2. If on `main`, create a branch first: `feat/<short-kebab-name>` or `fix/<short-kebab-name>`.
3. Review the diff and group the changes into one coherent commit. Stage files by name; never commit `.env` or anything gitignored. If a new env var was added, check that `.env.example` and `src/platform/config/env.ts` document it.
4. Write the message in English with Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), imperative and lowercase, under 72 characters in the subject. User hint: $ARGUMENTS
   End the message with the `Co-Authored-By` line given in the session's attribution instructions, if any.
5. Push the current branch with `-u`.
6. Open the PR with `gh pr create` against `main`. The body covers: what changes and why, how it was tested (the commands from step 1, plus any manual check), and risks (API contract changes, migrations, new env vars). End it with the PR attribution line given in the session's attribution instructions, if any.
7. Reply with the PR URL.

Never rewrite already pushed history or edit migrations that were already applied; add a new migration instead.
