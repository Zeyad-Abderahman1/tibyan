# Tibyan Agent Collaboration Protocol

This repository uses a three-role workflow with GitHub as the shared coordination channel.

## Roles

- **Antigravity — Primary Implementer**
  - Writes implementation code.
  - Works only on feature/chore branches.
  - Runs required tests, typecheck, schema drift checks, build/package, and packaged E2E when relevant.
  - Pushes the branch and opens/updates one Pull Request per task.
  - Responds to supervisor findings with focused fixes.
  - Does not self-approve.

- **Codex — Primary Supervisor / Orchestrator**
  - Reads the approved task scope and repository protocol.
  - Breaks the approved phase into sequenced tasks when needed.
  - Posts or maintains the active task order through GitHub.
  - Reviews Antigravity PR diffs, test evidence, security boundaries, migrations, and scope.
  - Publishes exactly one current supervisor state on the PR:
    - `SUPERVISOR_STATUS=APPROVED`
    - `SUPERVISOR_STATUS=REQUEST_CHANGES`
  - Should not write the implementation itself unless Antigravity is genuinely blocked and the user explicitly asks Codex to take over.

- **ChatGPT — Architect / Backup Reviewer**
  - Used for architecture decisions, disputed reviews, difficult debugging, or user-requested second opinions.
  - Not part of the normal high-frequency implementation loop unless needed.

- **User — Product Owner**
  - Gives final product/visual approval where required.
  - Approves new dependencies/plugins/skills.
  - Resolves genuine product choices and phase-boundary decisions.

## Goal

The normal loop should minimize user relay work and conserve Codex usage:

```text
Codex issues task brief on GitHub
        ↓
Antigravity implements + tests + opens PR
        ↓
Codex reviews only the changed scope/evidence
        ↓
REQUEST_CHANGES or APPROVED
        ↓
Antigravity fixes or merges
        ↓
Codex advances to the next already-approved task in the same phase
```

## Canonical Git Workflow

1. Sync `master` using fast-forward only.
2. Codex confirms the active task and acceptance criteria on GitHub.
3. Antigravity creates a dedicated branch. Never implement directly on `master`.
4. Antigravity implements the complete task in one implementation cycle.
5. Antigravity runs required verification.
6. Antigravity pushes the branch and opens/updates one PR into `master`.
7. Antigravity sets `IMPLEMENTER_STATUS=READY_FOR_REVIEW`.
8. Codex reviews the PR diff and evidence.
9. If Codex posts `SUPERVISOR_STATUS=REQUEST_CHANGES`, Antigravity fixes only the documented findings, re-runs affected verification, pushes, and marks ready again.
10. If Codex posts `SUPERVISOR_STATUS=APPROVED` and required checks are green, Antigravity may merge.
11. After merge, Antigravity updates handoff files when required and reports the final master SHA.
12. Codex may issue the next task **only when it is already inside the user-approved current phase/scope**.

## User Interruption Rules

Do not interrupt the user for normal implementation/review traffic.

Interrupt the user only for:
- a new dependency/plugin/skill,
- a genuine architectural product choice with multiple materially different outcomes,
- a security or data-loss risk,
- a required final visual/product approval,
- a blocker neither agent can resolve safely,
- or a new phase / scope expansion beyond the already-approved phase.

## Hard Rules

- Never self-declare supervisor approval.
- Never fabricate, copy, or edit a supervisor approval marker.
- Never merge while the latest supervisor state is missing or `REQUEST_CHANGES`.
- Never force-push `master`.
- Never rewrite repository history unless explicitly instructed by the user.
- Never install a new dependency, plugin, or skill without explicit user approval.
- Never commit credentials, tokens, production/local SQLite data, build artifacts, or machine-specific caches.
- Keep trusted authorization and sensitive mutations outside the renderer.
- Preserve the official Tibyan logo bytes unless the user explicitly approves a replacement.
  - SHA-256: `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`

## Review Efficiency Rule

Tibyan uses **one implementation cycle + one final review cycle** by default.

Codex should conserve review tokens by focusing on:
- the active task specification,
- the PR diff,
- changed migrations/contracts,
- exact verification evidence,
- and any security-sensitive boundaries touched.

Do not repeatedly re-audit unrelated unchanged areas unless a real risk or regression points there.

## Task Naming

Always use canonical phase/task names, for example:

`Phase 3 — Task 1 of 6: Curriculum Hierarchy & Group Progress Tracking`

Do not invent global Task 20/21/22 numbering.

## GitHub as the Communication Channel

For active work:
- The active PR is authoritative for implementation evidence and review state.
- The permanent issue **[CONTROL] Tibyan Agent Supervisor Channel** is the coordination channel.
- Phase/task kickoff issues hold approved architecture and acceptance criteria.
- Antigravity must read the latest relevant GitHub comments before acting.
- Codex should post review findings and next-task orders to GitHub.
- The user should not need to copy/paste reports between agents when the information is already on GitHub.

## Current Project Boundary

- Phase 2: COMPLETE.
- Phase 3: COMPLETE.
- Phase 4: COMPLETE (PR #11 merged).
- Phase 5: IN PROGRESS.
- Current Phase 5 branch: `opencode/phase5-paper-correction-analytics`.
- Do not expand into Phase 6 without explicit user approval.
