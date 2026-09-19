# Tibyan Supervisor Protocol

## Purpose

This document defines the low-touch orchestration workflow where **Codex supervises** and **Antigravity implements**, using GitHub as the shared message bus.

The objective is to let the user step away during normal work while keeping review quality high and Codex usage economical.

## Communication Model

```text
User approves phase/scope
        ↓
Codex (Supervisor / Orchestrator)
        ↓ task order on GitHub
Antigravity (Implementer)
        ↓ branch + code + tests + PR
GitHub PR
        ↓
Codex review
   ├─ SUPERVISOR_STATUS=REQUEST_CHANGES
   │          ↓
   │     Antigravity fixes only findings
   │
   └─ SUPERVISOR_STATUS=APPROVED
              ↓
         Antigravity merges
              ↓
         Codex may issue next already-approved task
```

ChatGPT remains available as an architect or backup reviewer when the user asks or when Codex/Antigravity encounter a genuinely difficult decision.

## Authoritative Surfaces

1. **Active Pull Request**
   - Source of truth for implementation evidence, review findings, and approval.
   - One PR per task.
   - Latest valid supervisor status comment wins.

2. **[CONTROL] Tibyan Agent Supervisor Channel**
   - Permanent coordination issue.
   - Used for orchestration, exceptional blockers, and cross-PR coordination.

3. **Phase / Task Kickoff Issues**
   - Hold the approved architecture, acceptance criteria, and task sequencing.
   - Current Phase 3 kickoff issue: **#3**.

4. **Repository handoff files**
   - `TIBYAN_AI_HANDOFF.json`
   - `TIBYAN_AI_HANDOFF.md`
   - `TIBYAN_NEXT_TASK.md`
   - Updated only when work is actually completed/merged.

## Codex Supervisor Contract

Codex should:
- read `AGENTS.md` and this protocol,
- read the active kickoff/task issue,
- avoid broad codebase re-analysis when the changed scope is already known,
- review the PR diff, changed contracts/migrations, exact test evidence, security boundaries, and stated non-goals,
- post exactly one current decision:
  - `SUPERVISOR_STATUS=APPROVED`
  - `SUPERVISOR_STATUS=REQUEST_CHANGES`,
- keep requested changes finite and concrete,
- avoid taking over implementation unless the user explicitly asks,
- advance to the next task only inside the already-approved current phase.

## Antigravity Implementer Contract

Before coding, Antigravity must:
- sync `master` with fast-forward only,
- read `AGENTS.md`,
- read this protocol,
- read the active GitHub task/kickoff issue and latest supervisor comment,
- search currently installed skills and use only those actually present,
- install nothing without user approval.

Before requesting review, Antigravity must provide in the PR:
- canonical task identity,
- branch and exact head commit,
- concise scope/non-goals,
- files/areas changed,
- exact unit/component test counts,
- typecheck result,
- DB drift result when relevant,
- build/package result when relevant,
- packaged E2E result when relevant,
- security/data-integrity notes,
- dependency status,
- visual evidence when required,
- `IMPLEMENTER_STATUS=READY_FOR_REVIEW`.

## Supervisor States

### Approval

```text
SUPERVISOR_STATUS=APPROVED
```

Approval means:
- task scope matches,
- no unresolved blocker is known,
- required verification is green,
- no unapproved dependency or scope expansion exists,
- required user visual/product approval has been satisfied.

### Changes Requested

```text
SUPERVISOR_STATUS=REQUEST_CHANGES
```

The comment must contain a short, finite list of concrete findings. Antigravity fixes only those findings and does not restart or broaden the task.

## Merge Contract

Antigravity may merge only when all are true:
1. latest supervisor PR state is `APPROVED`,
2. required tests/checks are green,
3. PR is not stale/conflicted,
4. no unapproved dependency exists,
5. any required user visual/product approval is complete.

After merge:
- update handoff files if required,
- sync `master`,
- report final master SHA,
- return control to Codex through GitHub.

## Autonomous Progress Inside an Approved Phase

Once the user has explicitly started a phase and the canonical task decomposition is approved, Codex may sequence the tasks within that phase without asking the user after every merge.

This autonomy stops immediately if:
- a new dependency/plugin/skill is needed,
- Phase scope must expand,
- a new phase would begin,
- a genuine product/architecture choice needs the user,
- a security/data-loss concern appears,
- or final visual/product approval is required.

## Token / Review Economy

Codex is the supervisor, not the primary coder.

To conserve usage:
- do not rewrite working implementation,
- do not re-read the entire repository on every PR,
- focus on active task spec + diff + touched boundaries + verification,
- use one final review cycle by default,
- request a second cycle only when concrete findings require it.

Antigravity owns the expensive implementation/test loop.

## Dependency Gate

If implementation genuinely requires a new package/plugin/skill:
- Antigravity stops,
- states exactly why the current stack is insufficient,
- proposes one package/version,
- Codex records the blocker,
- the user must explicitly approve before installation.

## Current State

- Phase 2: COMPLETE
- Phase 3: STARTED
- Phase 3 architecture/task decomposition is being finalized in GitHub Issue #3
- Phase 4 remains out of scope until explicit user approval
