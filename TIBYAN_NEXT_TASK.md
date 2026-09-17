# Task 14 Execution Context — Group Management UI, Enrollment Picker & Reschedule Modal

> **Notice:** This document contains targeted execution context specifically for **Task 14**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.
>
> **Task 14 Status:** **NOT STARTED** (Zero Task 14 code has been written).

---

## 1. Task Objective

Task 14 delivers the complete Group Management, Student Enrollment, and Session Rescheduling UI:
1. **Groups Directory & Schedule Grid (`GroupsPage.tsx`):** High-density view of all academic groups, day/time schedule slots, active student counts, and grade badges.
2. **Group Creation & Edit Modal (`GroupCreateModal.tsx`):** Create and edit groups with name, grade level, language track, weekly recurring schedule slots, default payment type, and default monthly/per-session fee.
3. **Group Details & Enrollment Roster (`GroupDetailsPage.tsx`):** Detailed group view showing active schedule, enrolled students table with effective payment rates (inherited vs overridden), attendance summaries, and session timeline.
4. **Student Enrollment Modal (`EnrollmentModal.tsx`):** Enroll student into group with optional payment override (`paymentTypeOverride`, `paymentAmountOverride`). Re-enrolling historical students preserves audit trail.
5. **Session Reschedule Modal (`RescheduleSessionModal.tsx`):** Single-session exception reschedule modal (date/time mutation of single session without altering the recurring group schedule or duplicating occurrences).
6. **TanStack Query Hook (`useGroups.ts`):** Cached hooks for groups, enrollments, and session scheduling interfacing with `window.tibyan.groups`, `window.tibyan.enrollments`, and `window.tibyan.sessions`.
7. **Unit & Component Tests (`GroupsPage.test.tsx`):** Vitest test suite covering group creation, enrollment payment calculation, session rescheduling, and permission enforcement.

---

## 2. Key Files to Create / Modify

```text
apps/desktop/
├─ src/
│  ├─ features/
│  │  └─ groups/
│  │     ├─ GroupsPage.tsx            # Main groups list and schedule grid
│  │     ├─ GroupCreateModal.tsx      # Modal for creating/editing groups and schedule
│  │     ├─ GroupDetailsPage.tsx      # Group roster, enrolled students, and sessions
│  │     ├─ EnrollmentModal.tsx       # Student enrollment picker with fee override
│  │     └─ RescheduleSessionModal.tsx # Single-occurrence reschedule modal
│  ├─ hooks/
│  │  └─ useGroups.ts                 # React Query hook for groups/enrollment IPC
│  └─ app/
│     └─ router.tsx                   # Connect /groups and /groups/:groupId routes
└─ tests/
   └─ GroupsPage.test.tsx             # Vitest suite covering group management UI
```

---

## 3. Actual Preload Surface & Contracts

The Electron Main process and `@tibyan/core` already provide complete, verified IPC handlers:
- `window.tibyan.groups`: `list()`, `getById(groupId)`, `create(input)`, `update(input)`, `setSchedule(input)`
- `window.tibyan.enrollments`: `listByGroup(groupId)`, `enroll(input)`, `updatePayment(input)`, `end(input)`
- `window.tibyan.sessions`: `materializeRollingSessions()`, `listByRange(input)`, `reschedule(input)`, `cancel(input)`

---

## 4. Key Architectural & Domain Invariants for Task 14

1. **Payment Overrides Belong EXCLUSIVELY to Enrollment:**
   - Group defines defaults: `defaultPaymentType` ('PER_SESSION' | 'MONTHLY') and `defaultPaymentAmount`.
   - `GroupEnrollment` defines optional overrides: `paymentTypeOverride` and `paymentAmountOverride`.
   - If override is null, effective payment rate inherits group defaults via Core `calculateEffectivePayment()`.
   - Students table has NO payment fields.
2. **Occurrence Idempotency & Reschedule Safety:**
   - Single-session rescheduling mutates `effectiveDate` and `effectiveStartTime` on the materialized session.
   - The rolling horizon generator evaluates `occurrenceKey = ${scheduleId}_${scheduledDate}` and NEVER re-creates a deleted/moved slot.
3. **Strict Layer Isolation:**
   - Zero imports of `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path` in renderer.
   - Authorization boundary remains in Electron MAIN process (`GROUPS_WRITE`, `ENROLLMENT_WRITE`, `SESSIONS_WRITE`).
4. **NO LOCAL AI MODEL:**
   - External cloud API only in future phases. No local LLM runtimes.
5. **Do NOT Start Task 15:**
   - Complete Task 14, verify tests, update handoff documents, and halt for user review.

---

## 5. Verification Checklist for Task 14

- [ ] Run `pnpm --filter @tibyan/desktop test` — all existing and new group UI tests pass.
- [ ] Run `pnpm -r typecheck` — 0 TypeScript errors.
- [ ] Verify group creation, schedule slots, enrollment with/without payment override, and session rescheduling.
- [ ] Run full workspace tests `pnpm -r test` (baseline is 415 + new Task 14 tests).
- [ ] Verify zero schema drift (`pnpm --filter @tibyan/db db:generate`).
- [ ] Halt and await user review.
