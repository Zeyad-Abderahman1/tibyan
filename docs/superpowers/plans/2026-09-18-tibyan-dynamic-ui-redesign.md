# Tibyan Dynamic Island Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Tibyan desktop UI from a rigid static admin shell into the modern, fluid "Tibyan Dynamic Island System" with a floating adaptive navigation capsule, smooth active-tab gliding, contextual workspace actions, refined surface layering, and preserved brand tokens.

**Architecture:** Replace the static 256px right sidebar and 56px top bar with an integrated `DynamicIslandShell` floating above an elevated `WorkspaceStage` canvas. Implement spring-like navigation indicator physics and micro-interactions entirely using native GPU-accelerated CSS custom properties (`cubic-bezier(0.16, 1, 0.3, 1)`) with zero new runtime JS animation dependencies.

**Tech Stack:** React 18.3.1, TypeScript 5.7.3, Tailwind CSS 3.4.17 + CSS custom property tokens, Lucide React 0.475.0, Vite 6.1.0, Electron 34.2.0, Vitest 3.0.5, Playwright 1.50.1.

**Spec:** `docs/superpowers/specs/2026-09-18-tibyan-dynamic-ui-design.md`

## Global Constraints

- Task 18 attendance backend remains 100% complete and hardened; do NOT touch domain, database, migrations, or IPC contracts.
- Task 19 remains strictly NOT_STARTED. Provide navigation slots and context capability for Attendance and Finance without implementing their business logic.
- Official logo asset bytes and SHA-256 (`66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`) must remain 100% untouched.
- Zero new external runtime animation libraries installed (no Framer Motion/Motion); pure CSS transitions only.
- Strict RTL orientation and offline Cairo typography preservation.
- Full reduced-motion accessibility support (`@media (prefers-reduced-motion: reduce)`).
- 548 existing unit/component tests and 1 Playwright E2E smoke test remain the absolute regression floor.

---

### Task 1: Design System Motion & Surface Tokens Scaffolding

**Files:**
- Modify: `packages/design-system/src/tokens/colors.css:40-126`
- Modify: `packages/design-system/src/tokens/layout.css:1-40`
- Test: `packages/design-system/tests/design-system.test.tsx`

**Interfaces:**
- Consumes: Existing color primitives (`--tibyan-navy: #0B3D3D`, `--tibyan-teal: #1F6E68`, `--tibyan-gold: #C59B27`).
- Produces:
  - `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`
  - `--ease-punch: cubic-bezier(0.4, 0, 0.2, 1)`
  - `--ease-fade: cubic-bezier(0, 0, 0.2, 1)`
  - `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--duration-slow: 350ms`
  - `--color-bg-island`, `--color-border-island`, `--shadow-island` for Light and Dark modes.

- [ ] **Step 1: Write failing test in `packages/design-system/tests/design-system.test.tsx`**

```tsx
it('31. exports dynamic island motion, surface, and shadow tokens', () => {
  const colorsCssPath = path.join(rootDir, 'src/tokens/colors.css');
  const layoutCssPath = path.join(rootDir, 'src/tokens/layout.css');
  const colorsContent = fs.readFileSync(colorsCssPath, 'utf8');
  const layoutContent = fs.readFileSync(layoutCssPath, 'utf8');

  expect(colorsContent).toContain('--color-bg-island');
  expect(colorsContent).toContain('--shadow-island');
  expect(layoutContent).toContain('--ease-spring');
  expect(layoutContent).toContain('prefers-reduced-motion');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tibyan/design-system test`
Expected: FAIL with missing `--color-bg-island` or `--ease-spring`.

- [ ] **Step 3: Implement tokens in `colors.css` and `layout.css`**

In `packages/design-system/src/tokens/colors.css`:
Add `--color-bg-island: rgba(255, 255, 255, 0.88)`, `--color-border-island: rgba(226, 232, 240, 0.8)`, and `--shadow-island` under `:root, [data-theme="light"]`.
Add `--color-bg-island: rgba(15, 31, 36, 0.85)`, `--color-border-island: rgba(30, 59, 68, 0.85)`, and dark `--shadow-island` under `[data-theme="dark"]`.

In `packages/design-system/src/tokens/layout.css`:
Define `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-punch: cubic-bezier(0.4, 0, 0.2, 1)`, duration tokens, and global `@media (prefers-reduced-motion: reduce)` resets.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tibyan/design-system test`
Expected: PASS (31 tests passing).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/tokens/ packages/design-system/tests/
git commit -m "feat(design-system): add dynamic island surface, motion, and shadow tokens"
```

---

### Task 2: Floating Dynamic Island Navigation Component

**Files:**
- Create: `apps/desktop/src/components/layout/DynamicIslandNav.tsx`
- Test: `apps/desktop/tests/DynamicIslandNav.test.tsx`

**Interfaces:**
- Consumes: `NavLink` from `react-router-dom`, `LucideIcon` from `lucide-react`, `cn` from `@tibyan/design-system`.
- Produces: `DynamicIslandNav` component accepting `activePath: string`, rendering all 6 canonical routes:
  1. `اليوم` (`/`)
  2. `الطلاب` (`/students`)
  3. `المجموعات` (`/groups`)
  4. `الحضور` (`/attendance`)
  5. `المالية` (`/finance`)
  6. `الإعدادات` (`/settings`)
  Features a smooth sliding highlight capsule with accessible `role="navigation"` and keyboard focus rings.

- [ ] **Step 1: Write failing test in `apps/desktop/tests/DynamicIslandNav.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DynamicIslandNav } from '../src/components/layout/DynamicIslandNav.js';

describe('DynamicIslandNav Component', () => {
  it('renders all 6 canonical navigation items in RTL order with accessible attributes', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <DynamicIslandNav />
      </MemoryRouter>
    );

    expect(html).toContain('role="navigation"');
    expect(html).toContain('اليوم');
    expect(html).toContain('الطلاب');
    expect(html).toContain('المجموعات');
    expect(html).toContain('الحضور');
    expect(html).toContain('المالية');
    expect(html).toContain('الإعدادات');
    expect(html).toContain('data-testid="dynamic-island-nav"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/DynamicIslandNav.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `DynamicIslandNav.tsx`**

Implement `DynamicIslandNav.tsx` with:
- Navigation array containing all 6 canonical routes with Lucide icons (`LayoutDashboard`, `Users`, `BookOpen`, `UserCheck`, `Coins`, `Settings`).
- Ref tracking on nav container and active item to set `--indicator-x` and `--indicator-w`.
- Sliding active indicator capsule with `transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), width 250ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Accessible `aria-current={isActive ? 'page' : undefined}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/DynamicIslandNav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/layout/DynamicIslandNav.tsx apps/desktop/tests/DynamicIslandNav.test.tsx
git commit -m "feat(desktop): implement dynamic island navigation with gliding capsule indicator"
```

---

### Task 3: Dynamic Island Context & System Cluster Components

**Files:**
- Create: `apps/desktop/src/components/layout/DynamicIslandContext.tsx`
- Create: `apps/desktop/src/components/layout/DynamicIslandSystem.tsx`
- Test: `apps/desktop/tests/DynamicIslandContext.test.tsx`

**Interfaces:**
- Consumes: `useLocation` from `react-router-dom`, `useTheme` from `@tibyan/design-system`, `useAuth` and `useSettings` from desktop hooks.
- Produces:
  - `DynamicIslandContext`: Morphs contextual actions based on active route (Date on Today, Search + Add on Students, Filter on Groups).
  - `DynamicIslandSystem`: Renders Academic Year badge, Teacher name + role badge, animated theme toggle, and logout button.

- [ ] **Step 1: Write failing test in `apps/desktop/tests/DynamicIslandContext.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@tibyan/design-system';
import { DynamicIslandContext } from '../src/components/layout/DynamicIslandContext.js';
import { DynamicIslandSystem } from '../src/components/layout/DynamicIslandSystem.js';

describe('Dynamic Island Context and System Clusters', () => {
  it('renders context tools and system controls cleanly', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/students']}>
            <div data-testid="island-wrapper">
              <DynamicIslandContext />
              <DynamicIslandSystem />
            </div>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="island-context"');
    expect(html).toContain('data-testid="island-system"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/DynamicIslandContext.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `DynamicIslandContext.tsx` and `DynamicIslandSystem.tsx`**

In `DynamicIslandContext.tsx`:
- Detect pathname from `useLocation()`.
- Return contextual slots for `/`, `/students`, `/groups`, `/attendance`, `/finance`, and `/settings`.
In `DynamicIslandSystem.tsx`:
- Render active academic year pill.
- Render user session badge (Owner / Assistant).
- Render accessible theme toggle (`resolvedTheme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'`) with persistence.
- Render logout trigger.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/DynamicIslandContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/layout/DynamicIslandContext.tsx apps/desktop/src/components/layout/DynamicIslandSystem.tsx apps/desktop/tests/DynamicIslandContext.test.tsx
git commit -m "feat(desktop): implement dynamic island context bar and system controls cluster"
```

---

### Task 4: Dynamic Island Shell & Workspace Stage Layout

**Files:**
- Create: `apps/desktop/src/components/layout/DynamicIslandShell.tsx`
- Create: `apps/desktop/src/components/layout/WorkspaceStage.tsx`
- Modify: `apps/desktop/src/components/layout/AppShell.tsx`
- Modify: `apps/desktop/src/components/layout/Sidebar.tsx` (retained as responsive drawer/fallback for compact mode)
- Test: `apps/desktop/tests/AppShell.test.tsx`

**Interfaces:**
- Consumes: `Logo` from `@tibyan/design-system`, `DynamicIslandNav`, `DynamicIslandContext`, `DynamicIslandSystem`.
- Produces: Master `AppShell` with suspended floating island header and elevated `WorkspaceStage` container canvas.

- [ ] **Step 1: Write failing test in `apps/desktop/tests/AppShell.test.tsx`**

Update `apps/desktop/tests/AppShell.test.tsx` to verify:
- `AppShell` renders `data-testid="dynamic-island-shell"`.
- `AppShell` renders `data-testid="workspace-stage"`.
- RTL direction is strictly enforced on root shell.
- Floating island is suspended with rounded-xl surface and backdrop blur.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/AppShell.test.tsx`
Expected: FAIL with `data-testid="dynamic-island-shell"` not found.

- [ ] **Step 3: Implement `DynamicIslandShell.tsx`, `WorkspaceStage.tsx`, and update `AppShell.tsx`**

- `DynamicIslandShell.tsx`:
  Assembles Brand Anchor (official logo framed seal + `تِبيان` wordmark + online status pip), `DynamicIslandNav`, `DynamicIslandContext`, and `DynamicIslandSystem` inside a single floating capsule with `rounded-2xl bg-[var(--color-bg-island)] backdrop-blur-md border border-[var(--color-border-island)] shadow-island`.
- `WorkspaceStage.tsx`:
  Provides the high-focus main canvas: `flex-1 overflow-y-auto rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xs mx-6 mb-6 p-6`.
- `AppShell.tsx`:
  Wraps `DynamicIslandShell` and `WorkspaceStage` in a clean, unified, full-viewport RTL container with zero wasted sidebar space.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tibyan/desktop test apps/desktop/tests/AppShell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/layout/ apps/desktop/tests/AppShell.test.tsx
git commit -m "feat(desktop): integrate dynamic island shell and elevated workspace stage"
```

---

### Task 5: Screen Surface Modernization (Today Dashboard, Students, Groups, Settings)

**Files:**
- Modify: `apps/desktop/src/features/dashboard/TodayPage.tsx`
- Modify: `apps/desktop/src/features/students/StudentsPage.tsx`
- Modify: `apps/desktop/src/features/groups/GroupsPage.tsx`
- Modify: `apps/desktop/src/features/settings/SettingsPage.tsx`
- Test: Existing feature test suites in `apps/desktop/tests/`

**Interfaces:**
- Consumes: Modernized tokens and workspace stage boundaries.
- Produces: Polished page layouts with streamlined headers, soft hover lift, high-contrast badges, and smooth filter expansion.

- [ ] **Step 1: Run feature test suites before edits**

Run: `pnpm --filter @tibyan/desktop test`
Confirm all feature tests pass before updating templates.

- [ ] **Step 2: Modernize `TodayPage.tsx`**

- Refine greeting bar with Cairo typography and live Arabic date tag.
- Upgrade metric summary cards (`Scheduled Sessions`, `Expected Students`, `Attention Needed`) with soft gradient border accents and hover lift.
- Refactor `ClassScheduleCard` timeline with high-contrast pills.

- [ ] **Step 3: Modernize `StudentsPage.tsx` & `GroupsPage.tsx`**

- Streamline top ribbon to blend seamlessly with dynamic island context.
- Modernize student data table with rounded row corners, smooth zebra striping, and accessible action dropdown triggers.
- Modernize group cards with active student counters and academic year indicator.

- [ ] **Step 4: Modernize `SettingsPage.tsx`**

- Segmented pill navigation for settings tabs with smooth active background.
- High-contrast preview chips in Theme Preferences tab.

- [ ] **Step 5: Run all feature tests to verify zero regressions**

Run: `pnpm --filter @tibyan/desktop test`
Expected: PASS (all 212+ tests pass).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/
git commit -m "refactor(desktop): modernize page surfaces and table layouts for dynamic shell"
```

---

### Task 6: Comprehensive Verification, Packaging & E2E Smoke Acceptance

**Files:**
- Test: All workspace test suites (`pnpm -r test`)
- Typecheck: Full workspace check (`pnpm -r typecheck`)
- Build: Desktop production bundle (`pnpm --filter @tibyan/desktop build`)
- Package: Windows unpackaged executable (`pnpm --filter @tibyan/desktop run pack`)
- E2E: Packaged Playwright smoke suite (`pnpm --filter @tibyan/desktop test:e2e`)

- [ ] **Step 1: Run full unit & component test suite across all 5 packages**

Run: `pnpm -r test`
Expected: PASS (all 548+ tests passing across 24 test files).

- [ ] **Step 2: Run workspace typecheck**

Run: `pnpm -r typecheck`
Expected: 0 errors across `@tibyan/contracts`, `@tibyan/db`, `@tibyan/core`, `@tibyan/design-system`, `@tibyan/desktop`.

- [ ] **Step 3: Build production bundle**

Run: `pnpm --filter @tibyan/desktop build`
Expected: Vite build completes cleanly; renderer + electron main/preload bundles emitted without error.

- [ ] **Step 4: Package Windows executable**

Run: `pnpm --filter @tibyan/desktop run pack`
Expected: `release/win-unpacked/تِبيان.exe` generated cleanly.

- [ ] **Step 5: Execute Playwright E2E smoke test**

Run: `pnpm --filter @tibyan/desktop test:e2e`
Expected: 1/1 passed covering setup wizard, dynamic island shell, navigation, theme toggle, logout, PIN security, and restart persistence.

- [ ] **Step 6: Verify official logo SHA-256 hash**

Run: `powershell -Command "(Get-FileHash -Path 'F:\tebyan\packages\design-system\src\assets\tibyan-official-logo.png' -Algorithm SHA256).Hash"`
Expected: `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

- [ ] **Step 7: Check git status and commit plan**

```bash
git status --short
git add docs/superpowers/
git commit -m "docs(plan): add dynamic island visual redesign architecture and implementation plan"
```
