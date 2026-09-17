# Task 15 Execution Context — Real-Data Today Dashboard UI

> **Notice:** This document contains targeted execution context specifically for **Task 15**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.
>
> **Task 15 Status:** **NOT STARTED** (Zero Task 15 code has been written).

---

## 1. Task Objective

Task 15 delivers the real-data Today Dashboard UI for the independent teacher:
1. **Today Dashboard Primary View (`TodayPage.tsx`):** Replace current placeholder with the live daily command center connecting to `window.tibyan.dashboard.getTodaySummary()`.
2. **Class Schedule Card (`ClassScheduleCard.tsx`):** Display today's class occurrences sorted by `effectiveStartTime`, with badges for rescheduled sessions, cancelled sessions, room/group info, and quick actions.
3. **Needs Attention Card (`NeedsAttentionCard.tsx`):** Action items derived exclusively from `NEEDS_FOLLOW_UP` student notes, with quick navigation to student profiles.
4. **Quick Metrics Banner:** Metric indicators showing today's total scheduled classes, remaining sessions, and active follow-up count.
5. **Dashboard Hook (`useDashboard.ts`):** TanStack Query hook managing cache keys, background refetch, and query invalidation.
6. **Unit & Component Tests (`TodayPage.test.tsx`):** Comprehensive Vitest suite covering real SQLite data integration, rescheduled session display, follow-up filtering, empty states, and permission checks.

---

## 2. Key Files to Create / Modify

```text
apps/desktop/
├─ src/
│  ├─ features/
│  │  └─ dashboard/
│  │     ├─ TodayPage.tsx             # Primary dashboard view (replaces placeholder)
│  │     ├─ ClassScheduleCard.tsx     # Class session occurrence card
│  │     └─ NeedsAttentionCard.tsx    # Follow-up attention card
│  ├─ hooks/
│  │  └─ useDashboard.ts              # React Query hook for dashboard IPC
│  └─ app/
│     └─ router.tsx                   # Wire TodayPage to '/' route
└─ tests/
   └─ TodayPage.test.tsx              # Vitest suite covering Today Dashboard UI
```

---

## 3. Actual Preload Surface & Contracts

The Electron Main process and `@tibyan/core` already provide complete, verified dashboard IPC handlers:
- `window.tibyan.dashboard.getTodaySummary(date?)`: Returns `IpcResult<TodaySummaryDto>` containing:
  - `date`: string (ISO `YYYY-MM-DD`)
  - `totalClasses`: number
  - `completedClasses`: number
  - `classes`: `TodayClassDto[]` (sorted by `effectiveStartTime`, includes `isRescheduled`, `status`, `groupName`, `scheduledStartTime`, etc.)
  - `needsAttention`: `StudentFollowUpDto[]` (filtered strictly by `NEEDS_FOLLOW_UP` notes)

---

## 4. Key Architectural & Domain Invariants for Task 15

1. **Dashboard is Strictly Read-Only:**
   - `DashboardService` executes read-only queries; it never mutates sessions or inserts audit entries.
   - It **never** triggers session materialization.
2. **Strict Follow-Up Filtering:**
   - `needsAttention` items are driven exclusively by notes tagged `NEEDS_FOLLOW_UP`.
   - Other note types (`ACADEMIC_WEAKNESS`, `BEHAVIOR`, `GENERAL`) do not appear in `needsAttention`.
3. **Rescheduled Highlighting:**
   - Sessions where `rescheduledAt !== null || scheduledDate !== effectiveDate || scheduledStartTime !== effectiveStartTime` must display clear visual distinction (e.g. amber badge and original time callout).
4. **Strict Layer Isolation:**
   - Zero imports of `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path` in renderer.
   - All IPC communication goes through `window.tibyan.dashboard`.
5. **Do NOT Start Task 16:**
   - Complete Task 15 in isolation and halt for user review.

---

## 5. Verification Checklist for Task 15

- [ ] Run `pnpm --filter @tibyan/desktop test` — all existing and new dashboard UI tests pass.
- [ ] Run `pnpm -r typecheck` — 0 TypeScript errors.
- [ ] Verify schedule rendering, rescheduled badges, follow-up action cards, and empty state.
- [ ] Run full workspace tests `pnpm -r test` (baseline is 432 + new Task 15 tests).
- [ ] Verify zero schema drift (`pnpm --filter @tibyan/db db:generate`).
- [ ] Halt and await user review.
