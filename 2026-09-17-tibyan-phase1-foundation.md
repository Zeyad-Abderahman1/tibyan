# Tibyan Phase 1 — Foundation & Desktop Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Windows version of تِبيان with a premium RTL desktop shell, local SQLite foundation, PIN/role authentication, students, groups, enrollments, schedules, and a real Today dashboard.

**Architecture:** Use a pnpm monorepo with an Electron + React + TypeScript desktop app and focused shared packages. The renderer never talks to SQLite directly; it calls typed preload APIs, which call main-process application services and repositories. SQLite is the single local source of truth for the active academic-year database, with migrations and explicit domain services so later mobile/LAN and AI tools can reuse the same business rules instead of bypassing them.

**Tech Stack:** Electron, React, TypeScript, Vite, pnpm workspaces, SQLite via `better-sqlite3`, Drizzle ORM + migrations, Zod, React Router, TanStack Query, Zustand (small UI/session state only), Tailwind CSS, Radix/shadcn-style primitives, Lucide icons, Vitest, React Testing Library, Playwright for Electron smoke tests, `argon2` or Node `crypto.scrypt` for PIN hashing.

**Spec:** `docs/superpowers/specs/2026-09-17-tibyan-design.md`

## Global Constraints

- Local-first: one Windows PC is the master data source; no cloud dependency in V1.
- The renderer must not access SQLite or Node APIs directly.
- Every Arabic screen is true RTL, not merely right-aligned text.
- Light and Dark modes are required from the first usable build.
- Visual direction: premium, calm, modern; approximately 70% productivity app and 30% educational intelligence.
- Brand: تِبيان / Tibyan; deep navy + teal + gold accents.
- One academic year = one separate SQLite database file.
- Teacher/Owner has full permissions; every Assistant has an independent account/PIN and configurable permissions.
- Important mutations are audited with actor, timestamp, entity, and before/after data where useful.
- No AI, payments, attendance, question bank, printing, or mobile implementation in Phase 1; Phase 1 must leave clean interfaces for them.
- Prefer small focused files; no giant “god service”, “utils”, or “store” files.
- TDD: each business behavior starts with a failing test, then minimal implementation, then refactor.

---

## File Structure to Create

```text
tibyan/
├─ apps/
│  └─ desktop/
│     ├─ electron/
│     │  ├─ main.ts
│     │  ├─ preload.ts
│     │  ├─ ipc/
│     │  │  ├─ auth.ipc.ts
│     │  │  ├─ students.ipc.ts
│     │  │  ├─ groups.ipc.ts
│     │  │  └─ system.ipc.ts
│     │  └─ windows/
│     │     └─ main-window.ts
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ App.tsx
│     │  │  ├─ router.tsx
│     │  │  └─ providers.tsx
│     │  ├─ components/
│     │  │  ├─ layout/AppShell.tsx
│     │  │  ├─ layout/Sidebar.tsx
│     │  │  ├─ layout/Topbar.tsx
│     │  │  └─ ui/
│     │  ├─ features/
│     │  │  ├─ auth/
│     │  │  ├─ dashboard/
│     │  │  ├─ students/
│     │  │  └─ groups/
│     │  ├─ hooks/
│     │  ├─ lib/
│     │  │  ├─ api.ts
│     │  │  ├─ direction.ts
│     │  │  └─ theme.ts
│     │  └─ styles/index.css
│     ├─ tests/
│     │  └─ smoke.spec.ts
│     └─ vite.config.ts
├─ packages/
│  ├─ contracts/
│  │  └─ src/
│  │     ├─ auth.ts
│  │     ├─ students.ts
│  │     ├─ groups.ts
│  │     ├─ audit.ts
│  │     └─ index.ts
│  ├─ db/
│  │  └─ src/
│  │     ├─ connection.ts
│  │     ├─ schema.ts
│  │     ├─ migrations/
│  │     ├─ repositories/
│  │     │  ├─ user.repository.ts
│  │     │  ├─ student.repository.ts
│  │     │  ├─ group.repository.ts
│  │     │  └─ audit.repository.ts
│  │     └─ test-db.ts
│  ├─ core/
│  │  └─ src/
│  │     ├─ auth/
│  │     │  ├─ auth.service.ts
│  │     │  ├─ pin.ts
│  │     │  └─ permissions.ts
│  │     ├─ students/student.service.ts
│  │     ├─ groups/group.service.ts
│  │     ├─ dashboard/dashboard.service.ts
│  │     └─ audit/audit.service.ts
│  └─ design-system/
│     └─ src/
│        ├─ tokens.css
│        ├─ ThemeProvider.tsx
│        └─ components/
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ vitest.workspace.ts
└─ README.md
```

The exact folder names above are the contract for this plan. Do not collapse packages into the desktop app.

---

### Task 1: Monorepo, Electron Security Boundary, and Premium RTL Shell

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `apps/desktop/electron/main.ts`
- Create: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/electron/windows/main-window.ts`
- Create: `apps/desktop/src/app/App.tsx`
- Create: `apps/desktop/src/app/router.tsx`
- Create: `apps/desktop/src/app/providers.tsx`
- Create: `apps/desktop/src/components/layout/AppShell.tsx`
- Create: `apps/desktop/src/components/layout/Sidebar.tsx`
- Create: `apps/desktop/src/components/layout/Topbar.tsx`
- Create: `apps/desktop/src/styles/index.css`
- Create: `apps/desktop/src/lib/theme.ts`
- Create: `apps/desktop/src/lib/api.ts`
- Create: `packages/design-system/src/tokens.css`
- Create: `packages/design-system/src/ThemeProvider.tsx`
- Test: `apps/desktop/src/components/layout/AppShell.test.tsx`
- Test: `apps/desktop/tests/smoke.spec.ts`

**Interfaces:**
- Produces: `window.tibyan.system.getAppInfo(): Promise<{name:string; version:string}>`
- Produces: `ThemeProvider` with `light | dark | system` support.
- Produces: route shell for `/today`, `/groups`, `/students`, `/settings`.

- [ ] **Step 1: Scaffold the pnpm workspace and desktop app**

Create workspace scripts so the root supports:

```json
{
  "scripts": {
    "dev": "pnpm --filter @tibyan/desktop dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build"
  }
}
```

Use Electron + Vite + React + TypeScript. Configure aliases so packages are imported as `@tibyan/contracts`, `@tibyan/core`, `@tibyan/db`, `@tibyan/design-system`.

- [ ] **Step 2: Write the shell tests before implementation**

`AppShell.test.tsx` must assert:

```tsx
expect(document.documentElement.dir).toBe('rtl')
expect(screen.getByText('تِبيان')).toBeInTheDocument()
expect(screen.getByRole('navigation')).toHaveTextContent('الرئيسية')
expect(screen.getByRole('navigation')).toHaveTextContent('المجموعات')
expect(screen.getByRole('navigation')).toHaveTextContent('الطلاب')
```

Also test that switching theme toggles `data-theme="dark"` on `<html>`.

- [ ] **Step 3: Run the shell test and verify it fails**

Run:

```bash
pnpm vitest apps/desktop/src/components/layout/AppShell.test.tsx --run
```

Expected: FAIL because `AppShell` and theme plumbing do not exist yet.

- [ ] **Step 4: Implement the secure Electron window boundary**

Create the BrowserWindow with:

```ts
webPreferences: {
  preload: preloadPath,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

Do not expose raw `ipcRenderer`. Preload exposes only typed namespaced methods.

- [ ] **Step 5: Implement the design tokens and RTL shell**

`tokens.css` must define semantic CSS variables, including:

```css
:root {
  --tibyan-navy: #0b3d3d;
  --tibyan-teal: #2e7d73;
  --tibyan-gold: #d4af37;
  --bg: #f8f9fa;
  --surface: #ffffff;
  --text: #102a2a;
  --muted: #6b7b7b;
  --border: rgba(16, 42, 42, 0.10);
  --radius-card: 18px;
}

[data-theme='dark'] {
  --bg: #0c1416;
  --surface: #121d20;
  --text: #f5f7f7;
  --muted: #9aabad;
  --border: rgba(255,255,255,0.08);
}
```

Set `dir="rtl"` and `lang="ar"` at the document root. Sidebar is on the right. Keep visual density low; no dashboard chart clutter in this task.

- [ ] **Step 6: Run unit + smoke tests**

Run:

```bash
pnpm test
pnpm typecheck
```

Then run the Electron smoke test asserting the window opens, title contains `تِبيان`, and sidebar is visible.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold Tibyan desktop shell"
```

---

### Task 2: Academic-Year Database, Migrations, and Audit Foundation

**Files:**
- Create: `packages/contracts/src/audit.ts`
- Create: `packages/db/src/connection.ts`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/migrations/0001_foundation.sql`
- Create: `packages/db/src/repositories/audit.repository.ts`
- Create: `packages/db/src/test-db.ts`
- Create: `packages/core/src/audit/audit.service.ts`
- Test: `packages/db/src/connection.test.ts`
- Test: `packages/core/src/audit/audit.service.test.ts`

**Interfaces:**
- Produces: `openAcademicYearDatabase(options: {dataDir:string; academicYear:string}): TibyanDatabase`
- Produces: `AuditService.record(entry: AuditEntryInput): Promise<void>`
- Produces tables: `app_settings`, `users`, `roles`, `permissions`, `role_permissions`, `audit_log`, `students`, `student_notes`, `groups`, `group_enrollments`, `group_schedules`.

- [ ] **Step 1: Write the failing academic-year DB test**

Test that:

```ts
const db = openAcademicYearDatabase({ dataDir, academicYear: '2026-2027' })
expect(db.filePath.endsWith('tibyan-2026-2027.sqlite')).toBe(true)
expect(db.hasTable('students')).toBe(true)
expect(db.hasTable('groups')).toBe(true)
```

Also verify opening `2027-2028` produces a different file.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm vitest packages/db/src/connection.test.ts --run
```

Expected: FAIL because connection/migrations do not exist.

- [ ] **Step 3: Implement connection and migration runner**

Use `better-sqlite3` in WAL mode:

```ts
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')
```

Normalize academic-year input to `YYYY-YYYY`, reject path separators, and always create the DB under the app-controlled data directory.

- [ ] **Step 4: Create the foundation schema**

Use UUID text primary keys. All mutable entities have `created_at` and `updated_at` ISO timestamps.

Minimum `audit_log` columns:

```text
id, actor_user_id, action, entity_type, entity_id,
before_json, after_json, metadata_json, created_at
```

Minimum `students` columns:

```text
id, student_code, full_name, photo_path, grade_code,
language_track, guardian_phone, payment_type, payment_amount,
status, qr_token, barcode_value, created_at, updated_at
```

Minimum `groups` columns:

```text
id, name, grade_code, language_track, math_branch,
default_payment_type, default_payment_amount, status,
created_at, updated_at
```

- [ ] **Step 5: Write and implement AuditService tests**

Test that a record stores actor/action/entity and before/after JSON exactly. Test that audit inserts cannot be updated or deleted through repository public APIs because such methods must not exist.

- [ ] **Step 6: Run DB + audit tests**

```bash
pnpm vitest packages/db/src/connection.test.ts packages/core/src/audit/audit.service.test.ts --run
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db packages/core/src/audit packages/contracts/src/audit.ts
git commit -m "feat: add academic year database foundation"
```

---

### Task 3: Local Users, PIN Authentication, Roles, and Permissions

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/core/src/auth/pin.ts`
- Create: `packages/core/src/auth/permissions.ts`
- Create: `packages/core/src/auth/auth.service.ts`
- Create: `packages/db/src/repositories/user.repository.ts`
- Create: `apps/desktop/electron/ipc/auth.ipc.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/src/features/auth/LoginScreen.tsx`
- Create: `apps/desktop/src/features/auth/session.store.ts`
- Test: `packages/core/src/auth/auth.service.test.ts`
- Test: `apps/desktop/src/features/auth/LoginScreen.test.tsx`

**Interfaces:**
- Produces: `AuthService.createOwner(input)`
- Produces: `AuthService.createAssistant(input)`
- Produces: `AuthService.loginWithPin(userId, pin)`
- Produces: `AuthService.requirePermission(session, permission)`
- Produces preload API:

```ts
window.tibyan.auth.listUsers()
window.tibyan.auth.login({ userId, pin })
window.tibyan.auth.logout()
window.tibyan.auth.getSession()
```

- [ ] **Step 1: Define explicit permission constants**

Create constants such as:

```ts
STUDENTS_READ
STUDENTS_WRITE
GROUPS_READ
GROUPS_WRITE
ATTENDANCE_WRITE
PAYMENTS_READ
PAYMENTS_WRITE
REPORTS_READ
SETTINGS_WRITE
USERS_MANAGE
```

Phase 1 UI uses only student/group/settings permissions, but define the future constants now to avoid renaming later.

- [ ] **Step 2: Write failing auth tests**

Test owner bootstrap, assistant creation, correct PIN login, wrong PIN rejection, and permission denial.

```ts
await expect(auth.loginWithPin(assistant.id, '9999')).rejects.toThrow('INVALID_PIN')
expect(auth.requirePermission(session, 'SETTINGS_WRITE')).toBe(false)
```

- [ ] **Step 3: Implement PIN hashing**

Use Argon2id if dependency packaging is reliable; otherwise Node `crypto.scrypt` with a per-user 16-byte random salt and timing-safe comparison. Never store plaintext PINs or reversible encryption.

- [ ] **Step 4: Implement auth service and audit login-related mutations**

Creating users and changing roles are audited. Successful login does not need before/after JSON, but may record metadata if desired; failed PIN attempts must not log the entered PIN.

- [ ] **Step 5: Implement typed IPC and preload methods**

Validate IPC payloads with Zod in the main process. Never trust renderer data.

- [ ] **Step 6: Implement premium PIN login screen**

Requirements:
- user cards: Owner and assistants;
- numeric PIN pad + keyboard support;
- Arabic RTL;
- clear wrong-PIN feedback without exposing security details;
- light/dark;
- no POS visual language.

- [ ] **Step 7: Run tests**

```bash
pnpm vitest packages/core/src/auth/auth.service.test.ts apps/desktop/src/features/auth/LoginScreen.test.tsx --run
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages apps/desktop
git commit -m "feat: add local PIN authentication and roles"
```

---

### Task 4: Students Domain, Student Profile, Photo, Notes, and Search

**Files:**
- Create: `packages/contracts/src/students.ts`
- Create: `packages/db/src/repositories/student.repository.ts`
- Create: `packages/core/src/students/student.service.ts`
- Create: `apps/desktop/electron/ipc/students.ipc.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/src/features/students/StudentsPage.tsx`
- Create: `apps/desktop/src/features/students/StudentForm.tsx`
- Create: `apps/desktop/src/features/students/StudentProfile.tsx`
- Create: `apps/desktop/src/features/students/StudentNotes.tsx`
- Test: `packages/core/src/students/student.service.test.ts`
- Test: `apps/desktop/src/features/students/StudentForm.test.tsx`

**Interfaces:**
- Produces:

```ts
StudentService.create(input, actor)
StudentService.update(id, patch, actor)
StudentService.get(id)
StudentService.search(query, filters)
StudentService.addNote(studentId, note, actor)
StudentService.setPhoto(studentId, sourceFilePath, actor)
```

- Student fields enforce:
  - `languageTrack: 'ARABIC' | 'ENGLISH'`
  - `paymentType: 'MONTHLY' | 'PER_SESSION'`
  - guardian phone is one primary number in V1.

- [ ] **Step 1: Write failing domain tests**

Cover:
- student code generated and unique;
- QR token and barcode value generated on create;
- Arabic and English tracks accepted;
- invalid guardian phone rejected;
- notes append without overwriting previous notes;
- every create/update/note mutation creates an audit record.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm vitest packages/core/src/students/student.service.test.ts --run
```

Expected: FAIL.

- [ ] **Step 3: Implement repository + service**

Do not put business rules in React or IPC handlers. Generate opaque QR tokens with secure random bytes. Barcode value may use the stable `student_code`, while QR uses an opaque token.

- [ ] **Step 4: Implement controlled photo storage**

Copy selected photos into:

```text
<academic-year-data-dir>/media/students/<student-id>.<ext>
```

Never store arbitrary user-picked absolute paths as the only source; copy into app-managed storage.

- [ ] **Step 5: Write failing UI tests**

Test form fields, language/payment type selection, and RTL labels. Test validation feedback.

- [ ] **Step 6: Implement Students page and profile**

Students page:
- search-first layout;
- clean cards/list toggle optional, but default to a compact modern list;
- Add Student button;
- filters: grade, track, status.

Profile:
- identity/photo;
- guardian phone;
- payment settings summary;
- notes/tags;
- timeline placeholder component that currently shows `لا توجد أحداث بعد` (real events arrive in later phases).

- [ ] **Step 7: Run tests and manual acceptance**

```bash
pnpm vitest packages/core/src/students/student.service.test.ts apps/desktop/src/features/students/StudentForm.test.tsx --run
pnpm typecheck
```

Manual: create Arabic-track student, English-track student, add photos and notes, restart app, verify persistence.

- [ ] **Step 8: Commit**

```bash
git add packages apps/desktop
git commit -m "feat: add student management"
```

---

### Task 5: Groups, Enrollments, Weekly Schedules, and Session-Ready Boundaries

**Files:**
- Create: `packages/contracts/src/groups.ts`
- Create: `packages/db/src/repositories/group.repository.ts`
- Create: `packages/core/src/groups/group.service.ts`
- Create: `apps/desktop/electron/ipc/groups.ipc.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/src/features/groups/GroupsPage.tsx`
- Create: `apps/desktop/src/features/groups/GroupForm.tsx`
- Create: `apps/desktop/src/features/groups/GroupProfile.tsx`
- Create: `apps/desktop/src/features/groups/EnrollmentPanel.tsx`
- Test: `packages/core/src/groups/group.service.test.ts`
- Test: `apps/desktop/src/features/groups/GroupForm.test.tsx`

**Interfaces:**
- Produces:

```ts
GroupService.create(input, actor)
GroupService.update(id, patch, actor)
GroupService.addStudent(groupId, studentId, actor)
GroupService.removeStudent(groupId, studentId, actor)
GroupService.setWeeklySchedule(groupId, slots, actor)
GroupService.listStudents(groupId)
```

- Schedule slot:

```ts
type WeeklyScheduleSlot = {
  weekday: 0|1|2|3|4|5|6
  startTime: string // HH:mm
  durationMinutes: number
}
```

- [ ] **Step 1: Write failing group tests**

Cover:
- Arabic and English groups remain separate;
- a student cannot be enrolled twice in the same group;
- group default payment settings exist but student-level override remains possible later;
- multiple weekly schedule slots allowed;
- changing schedule does not mutate any session history because sessions do not exist yet;
- all mutations audited.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm vitest packages/core/src/groups/group.service.test.ts --run
```

- [ ] **Step 3: Implement group repository/service**

Keep scheduling as recurring template data only in Phase 1. Do not prematurely create future session rows; that belongs to Phase 2 SessionService.

- [ ] **Step 4: Implement Group pages**

Groups overview shows:
- group name;
- grade;
- Arabic/English badge;
- weekly days/times;
- enrolled count;
- payment mode summary.

Group profile tabs:
- نظرة عامة
- الطلاب
- الجدول
- ملاحظات/placeholder for curriculum later

- [ ] **Step 5: Implement enrollment UX**

Use a searchable student picker. Already enrolled students are disabled. Removing a student requires a confirmation dialog.

- [ ] **Step 6: Run tests and manual acceptance**

```bash
pnpm vitest packages/core/src/groups/group.service.test.ts apps/desktop/src/features/groups/GroupForm.test.tsx --run
pnpm typecheck
```

Manual: create Arabic and English groups for same grade, set two weekly slots, enroll students, restart, verify persistence.

- [ ] **Step 7: Commit**

```bash
git add packages apps/desktop
git commit -m "feat: add groups and enrollments"
```

---

### Task 6: Today Dashboard Built from Real Local Data

**Files:**
- Create: `packages/core/src/dashboard/dashboard.service.ts`
- Create: `apps/desktop/src/features/dashboard/TodayPage.tsx`
- Create: `apps/desktop/src/features/dashboard/TodayClassCard.tsx`
- Create: `apps/desktop/src/features/dashboard/NeedsAttentionCard.tsx`
- Modify: `apps/desktop/src/app/router.tsx`
- Test: `packages/core/src/dashboard/dashboard.service.test.ts`
- Test: `apps/desktop/src/features/dashboard/TodayPage.test.tsx`

**Interfaces:**
- Produces:

```ts
type TodayDashboard = {
  date: string
  scheduledGroups: Array<{
    groupId: string
    groupName: string
    time: string
    studentCount: number
  }>
  activeStudentCount: number
  activeGroupCount: number
  needsAttention: Array<{
    studentId: string
    studentName: string
    reason: string
  }>
}
```

Phase 1 `needsAttention` uses only explicit student tags/notes such as `needs-follow-up`; score/absence/payment intelligence arrives in later phases.

- [ ] **Step 1: Write failing dashboard service tests**

Given a Thursday date, assert only groups with a Thursday recurring slot appear and are ordered by start time.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm vitest packages/core/src/dashboard/dashboard.service.test.ts --run
```

- [ ] **Step 3: Implement dashboard queries**

Do not duplicate repository SQL in the renderer. DashboardService composes repositories/services.

- [ ] **Step 4: Implement Today UI to match visual direction**

Primary hierarchy:
1. greeting + date;
2. حصص اليوم;
3. CTA `ابدأ الحصة` disabled with tooltip `سيتم تفعيلها مع نظام الحضور في المرحلة التالية` until Phase 2;
4. students needing follow-up;
5. compact counts for students/groups;
6. no fake charts and no fabricated financial/attendance metrics.

- [ ] **Step 5: Run UI tests**

```bash
pnpm vitest packages/core/src/dashboard/dashboard.service.test.ts apps/desktop/src/features/dashboard/TodayPage.test.tsx --run
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages apps/desktop
git commit -m "feat: add real today dashboard"
```

---

### Task 7: Settings, Academic-Year Creation/Switching, Theme Persistence, and Phase-1 Hardening

**Files:**
- Create: `apps/desktop/electron/ipc/system.ipc.ts`
- Create: `packages/core/src/system/academic-year.service.ts`
- Create: `apps/desktop/src/features/settings/SettingsPage.tsx`
- Create: `apps/desktop/src/features/settings/AcademicYearSettings.tsx`
- Create: `apps/desktop/src/features/settings/UserManagement.tsx`
- Modify: `packages/design-system/src/ThemeProvider.tsx`
- Modify: `apps/desktop/src/lib/theme.ts`
- Modify: `README.md`
- Test: `packages/core/src/system/academic-year.service.test.ts`
- Test: `apps/desktop/src/features/settings/SettingsPage.test.tsx`
- Test: `apps/desktop/tests/smoke.spec.ts`

**Interfaces:**
- Produces:

```ts
AcademicYearService.createYear(label: string)
AcademicYearService.listYears()
AcademicYearService.getActiveYear()
AcademicYearService.switchYear(label: string)
```

Switching closes the current DB cleanly, opens the selected academic-year DB, clears renderer query caches, and reloads app data.

- [ ] **Step 1: Write failing academic-year lifecycle tests**

Test create/list/switch and invalid label rejection.

- [ ] **Step 2: Implement year service and typed IPC**

Do not allow deleting an academic-year DB in Phase 1 UI. Archive/delete workflows belong to the lifecycle phase later.

- [ ] **Step 3: Persist theme and last active year**

Store non-sensitive UI preferences in `app_settings` for the active installation. Theme persists across restart.

- [ ] **Step 4: Build Settings page**

Sections:
- المظهر
- السنة الدراسية
- المستخدمون والصلاحيات
- معلومات تِبيان

Owner-only controls enforce `SETTINGS_WRITE` / `USERS_MANAGE` in the service and IPC layer, not only visually.

- [ ] **Step 5: Add first-run flow**

On an empty installation:
1. show brand welcome screen;
2. create first academic year;
3. create Teacher/Owner name + PIN;
4. enter app.

No fake demo data by default.

- [ ] **Step 6: Execute the Phase-1 verification suite**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @tibyan/desktop test:e2e
```

Expected: all PASS.

Manual acceptance checklist:
- first run creates academic year and owner;
- PIN login works after restart;
- light/dark persists;
- create two assistants with different permissions;
- create students in Arabic and English tracks;
- add student photos and notes;
- create groups, schedules, and enrollments;
- Today dashboard reflects current weekday schedule;
- switch academic year and verify separate data;
- switch back and verify original data is intact;
- inspect DB: no plaintext PIN;
- renderer DevTools cannot call Node `fs` or open SQLite directly.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: complete Tibyan phase 1 foundation"
```

---

## Phase 1 Definition of Done

Phase 1 is complete only when a teacher can install/run the development build, create an academic year and Owner PIN, create assistants with permissions, create and edit students, attach student photos and notes, create Arabic/English math groups, set recurring weekly schedules, enroll students, switch Light/Dark mode, restart without data loss, and see a real Today dashboard sourced from the local SQLite database.

Phase 1 intentionally does **not** implement attendance, finance, thermal receipts, card printing, curriculum, PDF question extraction, AI exams, Math Engine, exam printing, paper correction, mobile/LAN, or Gemini. Those become separate implementation plans so each subsystem can be reviewed and tested independently.

## Next Plans After Phase 1

1. `Tibyan Phase 2 — Sessions, Attendance, QR/Barcode, Student Cards, Finance & Thermal Receipts`
2. `Tibyan Phase 3 — Curriculum, Lesson Planner, PDF Ingestion & Question Bank`
3. `Tibyan Phase 4 — AI Exam Builder, Math Engine & Professional Print Engine`
4. `Tibyan Phase 5 — Paper Capture, AI Correction, Partial Credit & Analytics`
5. `Tibyan Phase 6 — AI Assistant Tool Layer, Confirmations, Audit & Undo`
6. `Tibyan Phase 7 — Mobile App, LAN Pairing, Assistant Scanner & Paper Capture`
