# Task 16 Execution Context — Settings, Academic-Year Switcher, Assistant Management & Backup Tab

> **Notice:** This document contains targeted execution context specifically for **Task 16**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.
>
> **Task 16 Status:** **NOT STARTED** (Zero Task 16 code has been written).

---

## 1. Task Objective

Task 16 builds the administrative control center of Tibyan:
1. **Settings Screen Primary View (`SettingsPage.tsx`):** Replace `SettingsPlaceholder` with a cohesive, tabbed administrative interface.
2. **Academic Year Manager (`AcademicYearManager.tsx`):**
   - List all registered academic years with current active indicator.
   - Create a new academic year with atomic on-disk SQLite initialization and migration before registry commit.
   - Safely switch the active academic year (re-mounting the academic SQLite database in the Main process and invalidating/clearing renderer queries).
3. **Assistant Management Tab (`UserManagementTab.tsx`):**
   - Display list of classroom assistants with status badges (`ACTIVE` / `INACTIVE`).
   - Modal for creating a new assistant account with full name, username, 4-digit PIN, and granular permission selection (`STUDENTS_READ`, `STUDENTS_WRITE`, `GROUPS_READ`, `GROUPS_WRITE`, etc.).
   - Toggle assistant status (activate/deactivate).
   - Reset assistant PIN modal.
   - Update assistant permissions.
4. **Backup Management Tab (`BackupSettingsTab.tsx`):**
   - View automated backup engine status, latest backup timestamp, and total archive count.
   - Trigger manual on-demand snapshot backup with progress and success notification.
   - Display table of recent backup records with archive paths, size, and status.
5. **Theme & Appearance Settings:**
   - Preference switcher for Light / Dark / System theme using existing `ThemeProvider`.
6. **Unit & Component Tests (`SettingsPage.test.tsx`):**
   - Vitest suite testing tabs, permission gates (Owner-only operations), academic year switching, assistant creation, PIN reset, and backup triggers.

---

## 2. Key Files to Create / Modify

```text
apps/desktop/
├─ src/
│  ├─ features/
│  │  └─ settings/
│  │     ├─ SettingsPage.tsx            # Main tabbed settings view (replaces placeholder)
│  │     ├─ AcademicYearManager.tsx     # Year list, creation modal, switcher
│  │     ├─ UserManagementTab.tsx       # Assistant list, creation modal, PIN reset
│  │     └─ BackupSettingsTab.tsx       # Backup status card, manual trigger, history
│  ├─ hooks/
│  │  ├─ useSettings.ts                 # React Query hook for system/academic year IPC
│  │  └─ useBackup.ts                   # React Query hook for backup IPC
│  └─ app/
│     └─ router.tsx                     # Wire SettingsPage to '/settings' route
└─ tests/
   └─ SettingsPage.test.tsx             # Vitest test suite covering Task 16 UI
```

---

## 3. Actual Preload Surface & Contracts

The Main process already exposes the complete typed IPC surface in `window.tibyan`:
- `window.tibyan.system`:
  - `getSettings()`: Promise<IpcResult<GlobalSettingsDto>>
  - `getSetupState()`: Promise<IpcResult<SetupStateDto>>
  - `updateTheme(input)`: Promise<IpcResult<void>>
  - `listAcademicYears()`: Promise<IpcResult<AcademicYearDto[]>>
  - `createAcademicYear(input)`: Promise<IpcResult<AcademicYearDto>>
  - `switchAcademicYear(input)`: Promise<IpcResult<void>>
- `window.tibyan.auth`:
  - `createUser(input)`: Promise<IpcResult<UserDto>>
  - `updatePermissions(input)`: Promise<IpcResult<void>>
  - `changeUserStatus(input)`: Promise<IpcResult<void>>
  - `resetPin(input)`: Promise<IpcResult<void>>
- `window.tibyan.backup`:
  - `trigger(input?)`: Promise<IpcResult<BackupRecordDto>>
  - `getStatus()`: Promise<IpcResult<BackupStatusDto>>
  - `listRecords()`: Promise<IpcResult<BackupRecordDto[]>>

---

## 4. Key Architectural & Domain Invariants for Task 16

1. **Owner-Only Administrative Gates:**
   - Academic year creation/switching, user creation/status/PIN reset, and manual backup triggers require `OWNER` role (or `SETTINGS_WRITE` where permitted by Core).
   - Assistants without permissions must see administrative tabs disabled or hidden.
2. **Safe Academic Year Switch:**
   - Switching years triggers runtime academic DB unmount/mount.
   - Renderer must clear or invalidate all academic-year scoped queries (`groups`, `students`, `dashboard`, `sessions`) upon year switch.
3. **Strict Layer Isolation:**
   - Zero direct imports of `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path` in renderer.
4. **Planning Approval Rule:**
   - An implementation plan must be formulated and explicit user approval must be awaited before modifying production source code.
5. **Do NOT Start Task 17:**
   - Complete Task 16 in isolation and halt for user review.

---

## 5. Verification Checklist for Task 16

- [ ] Formulate detailed implementation plan and wait for user review.
- [ ] Run `pnpm --filter @tibyan/desktop test` — all settings and existing tests pass.
- [ ] Run `pnpm -r typecheck` — 0 TypeScript errors.
- [ ] Run full workspace tests `pnpm -r test` (current baseline is 463 tests).
- [ ] Verify zero database schema drift (`pnpm --filter @tibyan/db db:generate`).
- [ ] Build production desktop app (`pnpm --filter @tibyan/desktop build`).
- [ ] Halt and await user review.
