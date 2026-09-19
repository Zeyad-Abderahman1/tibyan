# Tibyan Agent Collaboration Protocol

This repository uses a two-agent workflow with the user as final product owner.

## Roles

- **Antigravity — Implementer**
  - Plans and implements approved work.
  - Works only on feature/chore branches.
  - Runs required tests and packaged verification.
  - Pushes the branch and opens/updates a Pull Request.
  - Responds to supervisor findings with focused fixes.

- **ChatGPT — Supervisor / Reviewer**
  - Defines or reviews task scope and architecture.
  - Reviews PR diffs, tests, security, scope boundaries, and evidence.
  - Publishes exactly one current supervisor state on the PR:
    - `SUPERVISOR_STATUS=APPROVED`
    - `SUPERVISOR_STATUS=REQUEST_CHANGES`
  - Does not invent extra review cycles after the required verification is green.

- **User — Product Owner**
  - Gives the final visual/product approval when a task requires it.
  - Approves new dependencies when needed.
  - Decides when a new phase/task starts.

## Canonical Git Workflow

1. Start from an up-to-date `master`.
2. Create a dedicated branch. Never implement directly on `master`.
3. Implement the complete task in one implementation cycle.
4. Run the required verification.
5. Push the branch to GitHub.
6. Open or update one PR into `master`.
7. Set the PR body marker to `IMPLEMENTER_STATUS=READY_FOR_REVIEW`.
8. Stop implementation and wait for supervisor review.
9. If the supervisor posts `SUPERVISOR_STATUS=REQUEST_CHANGES`, fix only the documented findings, re-run affected verification, push, and mark ready again.
10. Merge only after the latest supervisor decision is `SUPERVISOR_STATUS=APPROVED` and all required checks are green.

## Hard Rules

- Never self-declare supervisor approval.
- Never fabricate, copy, or edit a supervisor approval marker.
- Never merge a task PR while the latest supervisor state is missing or `REQUEST_CHANGES`.
- Never force-push `master`.
- Never squash/rewrite repository history unless explicitly instructed by the user.
- Never start the next task/phase automatically after merge.
- Never install a new dependency, plugin, or skill without explicit user approval.
- Never commit credentials, tokens, production/local SQLite data, build artifacts, or machine-specific caches.
- The renderer is never trusted as an authority for financial/security-sensitive mutations; keep trusted validation in the appropriate core/main layer.
- Preserve the official Tibyan logo bytes unless the user explicitly approves a replacement.
  - SHA-256: `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`

## Review Efficiency Rule

Tibyan uses **one implementation cycle + one final review cycle** by default.

Do not create repeated intermediate gates, speculative audits, or visual checkpoints. An early stop is justified only for:
- a genuine blocker,
- a new dependency requiring approval,
- a clear security/data-loss risk,
- or an architectural decision that cannot be safely inferred.

## Task Naming

Always use canonical phase/task names, for example:

`Phase 2 — Task 5 of 5: Thermal Receipts & ESC/POS Printing`

Do not invent global Task 20/21/22 numbering.

## GitHub as the Communication Channel

For active work:
- The PR is the authoritative implementation/review thread.
- The permanent control issue titled **[CONTROL] Tibyan Agent Supervisor Channel** is the shared coordination channel.
- Antigravity must read new PR comments and the control issue before acting on a supervisor request.
- ChatGPT may post task briefs, review findings, or approval state through GitHub.
- The user should not need to copy/paste implementation reports between agents when the information is already in GitHub.

## Current Project Boundary

- Phase 2: COMPLETE.
- Phase 3: NOT_STARTED.
- Do not start Phase 3 until the user explicitly requests it.
