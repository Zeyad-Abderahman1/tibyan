# Tibyan UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved right-sidebar Tibyan redesign with a navy/indigo design system and authoritative, mutation-aware dashboard KPIs.

**Architecture:** Keep the existing React/Electron four-layer shell and refactor its shared tokens and page composition instead of creating a parallel interface. Correct KPI semantics in the academic repository/service path, then connect every relevant renderer mutation to the canonical dashboard query keys.

**Tech Stack:** React 18, TypeScript, TanStack Query, Tailwind CSS, Electron 34, Drizzle ORM, SQLite, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-tibyan-ui-ux-redesign-design.md`

## Global Constraints

- Work only on `opencode/phase6-ai-assistant-tool-layer` and update PR #13; do not merge.
- Do not enter Phase 7 or install dependencies, plugins, or skills.
- Preserve routes, IPC contracts, Electron security, academic database mounting, AI confirmation/audit/undo, and business behavior.
- Preserve official logo bytes with SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.
- Use one authoritative scrolling workspace and support 1600×900 and 1366×768.

## Review Focus

- Active students without group enrollment must still count in total students.
- Switching academic years must never display cached KPIs from the prior database.
- Student import and creation must refresh the dashboard without restarting the app.
- Long contextual action sets at 1366px must scroll rather than wrap or clip.
- Dark mode must preserve contrast and identical geometry without neon accents.

---

### Task 1: Authoritative Dashboard KPI Semantics

**Files:**
- Modify: `packages/db/src/repositories/academic/student.repository.ts`
- Modify: `packages/core/src/dashboard/dashboard.service.ts`
- Modify: `packages/core/tests/dashboard.service.test.ts`

**Interfaces:**
- Produces: `StudentRepository.countActive(): number`
- Consumes: the active academic-year `AcademicDrizzle` already injected into `DashboardService`

- [ ] Add a dashboard service test with active enrolled, active unenrolled, and inactive students; assert `totalEnrolledStudents` equals the two active students and is independent of enrollment rows.
- [ ] Run `pnpm --filter @tibyan/core test -- dashboard.service.test.ts` and confirm the new assertion fails because the current implementation counts distinct active enrollments.
- [ ] Add `StudentRepository.countActive()` using `count(*) where students.status = 'ACTIVE'` and use it for `totalEnrolledStudents`.
- [ ] Run the focused dashboard test and confirm it passes with all existing dashboard business-rule tests.

### Task 2: Dashboard Cache Invalidation

**Files:**
- Modify: `apps/desktop/src/hooks/useStudents.ts`
- Modify: student-import mutation hook identified during implementation
- Modify: `apps/desktop/src/hooks/useGroups.ts`
- Modify: `apps/desktop/tests/TodayPage.test.tsx`
- Modify/add focused hook tests where existing test structure requires them

**Interfaces:**
- Consumes: `dashboardKeys.all` and `dashboardKeys.today()` from `useDashboard.ts`
- Produces: successful KPI-affecting mutations invalidate the dashboard key hierarchy

- [ ] Add failing mutation tests for student creation and import, plus coverage for group creation and every KPI-affecting mutation not already invalidating the dashboard.
- [ ] Run focused desktop tests and confirm failures name missing invalidations rather than mock setup errors.
- [ ] Add the minimal invalidations on successful mutations only; preserve existing list/detail invalidations.
- [ ] Run focused mutation and dashboard tests and confirm all pass.

### Task 3: Centralized Navy/Indigo Design System

**Files:**
- Modify: `packages/design-system/src/tokens/colors.css`
- Modify: `packages/design-system/src/tokens/layout.css`
- Modify: `packages/design-system/src/tokens/typography.css`
- Modify: `apps/desktop/src/styles/index.css`
- Modify: `packages/design-system/tests/design-system.test.tsx`

**Interfaces:**
- Produces: semantic CSS variables for shared components and pages
- Consumes: existing ThemeProvider `data-theme` contract

- [ ] Add behavioral design-system assertions by rendering representative components in both themes and checking computed semantic styles/focus behavior, without testing raw source text.
- [ ] Run the focused design-system tests and confirm they fail under the teal-heavy tokens.
- [ ] Replace palette tokens with approved warm-neutral/navy/indigo and deep-blue-slate values; add semantic sidebar/topbar/table tokens, spacing tokens, and control-height tokens.
- [ ] Update global utilities to consume semantic tokens and run focused tests until green.

### Task 4: Shell Geometry and Responsive Navigation

**Files:**
- Modify: `apps/desktop/src/components/layout/AppShell.tsx`
- Modify: `apps/desktop/src/components/layout/TopUtilityBar.tsx`
- Modify: `apps/desktop/src/components/layout/RightMainSidebar.tsx`
- Modify: `apps/desktop/src/components/layout/ContextualDynamicIsland.tsx`
- Modify: `apps/desktop/tests/AppShell.test.tsx`
- Modify: `apps/desktop/tests/DynamicIslandContext.test.tsx`

**Interfaces:**
- Produces: 48px utility bar, 224/64px persisted right sidebar, 52px contextual island, single workspace scroll region
- Consumes: semantic tokens from Task 3 and existing routes/actions

- [ ] Add failing layout tests for exact shell geometry, right physical placement, persisted collapse state, absence of topbar primary navigation, and horizontally scrollable island actions.
- [ ] Run focused shell/island tests and confirm expected failures.
- [ ] Refactor shell components to approved dimensions and semantic styling while preserving route behavior and accessible labels.
- [ ] Run focused tests and confirm green at both expanded and collapsed states.

### Task 5: Dashboard Density and Hierarchy

**Files:**
- Modify: `apps/desktop/src/features/dashboard/TodayPage.tsx`
- Modify: `apps/desktop/src/features/dashboard/ClassScheduleCard.tsx`
- Modify: `apps/desktop/src/features/dashboard/NeedsAttentionCard.tsx`
- Modify: `apps/desktop/tests/TodayPage.test.tsx`

**Interfaces:**
- Consumes: authoritative `TodayDashboardDto` values and design tokens
- Produces: compact KPI grid, sessions area, alerts area, and secondary refresh action

- [ ] Add failing component tests asserting all four real KPI values, compact empty states, and a single secondary refresh control.
- [ ] Run `TodayPage.test.tsx` and confirm failures reflect the old presentation.
- [ ] Implement the compact hierarchy without changing DTOs or query behavior.
- [ ] Run the focused page tests and confirm green.

### Task 6: Page Contextual Actions and Workspace Density

**Files:**
- Modify: `apps/desktop/src/features/students/StudentsPage.tsx`
- Modify: `apps/desktop/src/features/groups/GroupsPage.tsx`
- Modify: `apps/desktop/src/features/attendance/AttendancePage.tsx`
- Modify: `apps/desktop/src/features/curriculum-library/CurriculumLibraryPage.tsx`
- Modify: `apps/desktop/src/features/finance/FinancePage.tsx`
- Modify: `apps/desktop/src/features/settings/SettingsPage.tsx`
- Modify: corresponding existing page tests

**Interfaces:**
- Consumes: shared contextual island and design tokens
- Produces: approved per-page action sets with preserved handlers

- [ ] Add or update failing tests for the approved action labels and preserved handler behavior on each page.
- [ ] Run the focused page tests and confirm expected failures.
- [ ] Apply consistent headers, gutters, density, empty states, and contextual actions without duplicating global navigation.
- [ ] Run all affected page tests and confirm green.

### Task 7: Premium Tibyan AI Workspace

**Files:**
- Modify: `apps/desktop/src/features/tibyan-workspace/TibyanWorkspacePage.tsx`
- Modify: `apps/desktop/src/features/tibyan-workspace/WorkspaceHistory.tsx`
- Modify: `apps/desktop/tests/PlatformControlChat.test.tsx`
- Modify/add existing Tibyan workspace UI tests

**Interfaces:**
- Consumes: existing AI tool hooks and confirmation/audit/undo contracts
- Produces: single main workspace with contextual tools and drawer-based history

- [ ] Add failing tests for no permanent second tools sidebar, drawer history, preserved attachments, and preserved preview/confirm/execute/audit/undo affordances.
- [ ] Run focused Tibyan tests and confirm expected failures.
- [ ] Tighten workspace composition and empty-state scale; retain all existing tool handlers and prohibit Gemini/Math Engine/raw JSON branding.
- [ ] Run focused Tibyan tests and confirm green.

### Task 8: Packaged Responsive Visual Gate

**Files:**
- Modify: `apps/desktop/e2e/ui-redesign-visual-gate.spec.ts`
- Create/update: `docs/screenshots/ui-redesign/*.png`

**Interfaces:**
- Consumes: packaged Windows executable from the approved implementation
- Produces: required screenshots and automated overflow/scroll/visibility checks

- [ ] Update the packaged E2E gate to seed authoritative students, groups, enrollments, and sessions, then assert rendered KPIs equal database-backed expected values.
- [ ] Add viewport assertions for no page overflow, visible actions, one scrolling workspace, and workspace width growth after sidebar collapse.
- [ ] Build a fresh Windows package with `pnpm --filter @tibyan/desktop build:win`.
- [ ] Run the packaged visual gate and inspect every required light, dark, 1366×768, and 1600×900 screenshot; fix discovered defects using a failing regression assertion before production changes.

### Task 9: Complete Verification and Delivery

**Files:**
- Verify all changed files and generated evidence

**Interfaces:**
- Produces: verified branch commit and updated unmerged PR #13

- [ ] Verify official logo SHA-256 matches the required hash.
- [ ] Run `pnpm -r typecheck`, `pnpm -r test`, `pnpm build`, focused UI/dashboard tests, packaged E2E, and Phase 3–6 critical workflow gates.
- [ ] Review the full branch diff against this spec, resolve Important/Critical findings test-first, and record any deferred minor findings.
- [ ] Commit approved changes, push `opencode/phase6-ai-assistant-tool-layer`, update PR #13 with exact verification evidence, attach the PR to the task, and confirm it remains open and unmerged.
