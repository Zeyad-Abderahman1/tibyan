# Tibyan UI Scale, Startup, and Lock Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a larger, coherent Tibyan desktop scale plus polished startup and lock experiences without changing application security or business behavior.

**Architecture:** Central CSS tokens establish the scale; shell/auth components consume those tokens. Electron shows a local splash before long bootstrap work and swaps to the renderer in the same hardened window. The renderer reuses one branded loading component until authoritative setup/session state resolves.

**Tech Stack:** Electron, React 18, TypeScript, Tailwind CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-ui-scale-startup-lock-design.md`

## Global Constraints

- No new dependency, plugin, or skill.
- Preserve routes, IPC, Electron security, migrations, AI workflows, and real dashboard KPIs.
- Keep primary navigation physically right and sidebar widths 224/64px.
- Support identical light/dark geometry at 1600×900 and 1366×768 with no document overflow.
- Do not merge PR #13 or begin Phase 7.

## Review Focus

- Slow runtime migration: splash must already be visible and must not delay initialization.
- Renderer bootstrap rejection: user receives an Arabic retry/error state, not login or blank content.
- Existing-data second launch: splash-to-session restoration must not corrupt or replace databases.
- 1366×768 expanded navigation: enlarged controls must remain reachable without nested scroll traps.
- Reduced-motion preference: loading indicator must remain understandable without animation.

---

### Task 1: Authoritative global scale and shell identity

**Files:**
- Modify: `packages/design-system/src/tokens/typography.css`
- Modify: `packages/design-system/src/tokens/layout.css`
- Modify: `packages/design-system/src/components/Button.tsx`
- Modify: `packages/design-system/src/components/Input.tsx`
- Modify: `apps/desktop/src/components/layout/TopUtilityBar.tsx`
- Modify: `apps/desktop/src/components/layout/TeacherAvatar.tsx`
- Modify: `apps/desktop/src/components/layout/RightMainSidebar.tsx`
- Test: `packages/design-system/tests/design-system.test.tsx`
- Test: `apps/desktop/tests/AppShell.test.tsx`

**Interfaces:**
- Produces: `--topbar-height: 3.625rem`, control heights 36/44/52px, body/caption scale 16/15/13px, `TeacherAvatar` 38px small size.
- Consumes: existing semantic color and geometry tokens.

- [ ] Add failing assertions for scale tokens, 58px top bar, 38px avatar, photo `object-cover`, initials fallback, and physical-right sidebar.
- [ ] Run focused suites and confirm the new assertions fail for the old 48px/28px geometry.
- [ ] Update tokens and shell primitives; increase navigation labels/icons/hit areas without changing sidebar widths.
- [ ] Run focused design-system and AppShell suites to green.
- [ ] Commit `feat(ui): improve desktop scale and teacher identity`.

### Task 2: Renderer startup and lock presentation

**Files:**
- Create: `apps/desktop/src/components/feedback/StartupLoadingScreen.tsx`
- Modify: `apps/desktop/src/app/router.tsx`
- Modify: `apps/desktop/src/features/auth/LoginScreen.tsx`
- Test: `apps/desktop/tests/LoginScreen.test.tsx`

**Interfaces:**
- Produces: `StartupLoadingScreen({ status?, error?, onRetry? })` and branded `data-testid="app-loading"` state.
- Consumes: `TeacherAvatar`, existing `LoginScreen` PIN/auth state and `Logo`/brand components.

- [ ] Add failing markup tests for Tibyan startup identity/status/error/retry, lock copy, selected-user avatar/name, and unchanged PIN controls.
- [ ] Run `LoginScreen.test.tsx` and confirm failures identify missing presentation semantics.
- [ ] Implement the reusable loading screen and redesign LoginScreen layout without altering auth callbacks or cooldown logic.
- [ ] Run the focused auth suite to green.
- [ ] Commit `feat(auth): redesign startup and lock experiences`.

### Task 3: Electron visible-splash lifecycle

**Files:**
- Create: `apps/desktop/electron/startup-splash.ts`
- Modify: `apps/desktop/electron/main.ts`
- Test: `apps/desktop/tests/startup-lifecycle.test.ts`

**Interfaces:**
- Produces: `createStartupSplashHtml(options)` and a BrowserWindow lifecycle using `show:false`, splash `ready-to-show`, runtime bootstrap, then renderer navigation.
- Consumes: unchanged `SECURE_WEB_PREFERENCES`, runtime initialization, media protocol, and IPC registration.

- [ ] Add failing tests for no petrol color, encoded local splash, `show:false`, ready-to-show display, initialization ordering, and startup failure markup.
- [ ] Run the lifecycle test and confirm it fails against current immediate-window implementation.
- [ ] Implement the local splash generator and robust bootstrap ordering without weakening security preferences.
- [ ] Run lifecycle, packaging, IPC, and Electron security tests to green.
- [ ] Commit `fix(electron): show branded splash during bootstrap`.

### Task 4: Packaged regression and visual evidence

**Files:**
- Create: `apps/desktop/e2e/ui-scale-startup-lock.spec.ts`
- Generate ignored screenshots under: `docs/screenshots/ui-scale-startup-lock/`

**Interfaces:**
- Consumes: Tasks 1–3 test IDs and geometry.
- Produces: 11 required packaged screenshots and behavioral evidence for cold/second launch.

- [ ] Extend packaged automation to capture startup and lock screens in both themes, shell scale, avatar, expanded/collapsed navigation, dark dashboard, and both target viewports.
- [ ] Seed/read the real packaged database and assert dashboard student/group service results equal rendered KPIs.
- [ ] Assert 58px top bar, right sidebar placement, 224/64px widths, action reachability, and zero document horizontal overflow.
- [ ] Run focused tests, full typecheck/tests, production and Windows packaged builds, then cold and second-launch packaged E2E.
- [ ] Inspect all 11 screenshots at original resolution and fix Critical/Important defects under TDD.
- [ ] Commit `test(e2e): verify scaled startup and lock experience`.

