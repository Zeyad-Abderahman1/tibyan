# Tibyan Supervisor Protocol

## Purpose

This document defines how ChatGPT and Antigravity coordinate through GitHub so the user does not need to relay reports manually.

## Communication Model

```text
User
  ↓
ChatGPT (Supervisor)
  ↓ task brief / review on GitHub
Antigravity (Implementer)
  ↓ branch + commits + tests + PR
GitHub PR
  ↓
ChatGPT review
  ├─ SUPERVISOR_STATUS=REQUEST_CHANGES
  │      ↓
  │   Antigravity fixes only the findings and updates the same PR
  │
  └─ SUPERVISOR_STATUS=APPROVED
         ↓
      Antigravity may merge, then hard stop
```

## Authoritative Surfaces

1. **Pull Request**
   - Source of truth for implementation evidence, review findings, and approval.
   - One PR per task.
   - Latest supervisor status comment wins.

2. **[CONTROL] Tibyan Agent Supervisor Channel**
   - Permanent coordination issue.
   - Used for task handoff, exceptional blockers, and cross-PR coordination.
   - Not a substitute for PR review.

3. **Repository handoff files**
   - `TIBYAN_AI_HANDOFF.json`
   - `TIBYAN_AI_HANDOFF.md`
   - `TIBYAN_NEXT_TASK.md`
   - Updated only when a task is actually completed/merged.

## Required Implementer PR Report

Antigravity must put the following in the PR body before requesting review:
- canonical task identity,
- exact branch and head commit,
- concise scope/non-goals,
- files/areas changed,
- exact test counts,
- typecheck result,
- DB drift result when relevant,
- build/package result when relevant,
- full packaged E2E result when relevant,
- security/data-integrity notes,
- dependency status,
- final visual artifacts when required,
- `IMPLEMENTER_STATUS=READY_FOR_REVIEW`.

## Supervisor Review Contract

ChatGPT reviews the diff and evidence and posts one current decision:

### Approval

```text
SUPERVISOR_STATUS=APPROVED
```

Approval means:
- scope matches the task,
- no unresolved blocker is known,
- required verification evidence is green,
- no forbidden dependency/scope expansion is present,
- any required final visual approval has been satisfied.

### Changes Requested

```text
SUPERVISOR_STATUS=REQUEST_CHANGES
```

The comment must contain a short, finite set of concrete findings. Antigravity should not restart the task from scratch or add unrelated improvements.

## Merge Contract

Antigravity may merge only when all are true:
1. latest supervisor PR state is `APPROVED`,
2. required tests/checks are green,
3. PR is not known to be stale/conflicted,
4. no unapproved dependency exists,
5. user-required visual approval has been obtained.

After merge:
- update handoff files if required,
- sync `master`,
- report final master SHA,
- hard stop,
- do not start the next task automatically.

## Dependency Gate

If implementation genuinely requires a new package/plugin/skill:
- stop once,
- state exactly why the current stack is insufficient,
- propose one package/version,
- wait for explicit user approval,
- do not install first and ask later.

## Review Noise Policy

Default: one implementation cycle and one final review.

Do not create extra audits or approval gates because they are "nice to have." Use additional review only for a real blocker, regression, security/data-loss risk, or a user-requested change.

## Current State

- Phase 2: COMPLETE
- Phase 3: NOT_STARTED
- No Phase 3 work may begin until the user explicitly starts it.
