# تِبيان (Tibyan) — Canonical AI Continuation Guide & Architectural State Handoff

> **Document Classification:** Master Architectural Handoff & State Capture  
> **Repository Root:** `F:\tebyan`  
> **Target Audience:** Incoming Autonomous AI Engineering Agents  
> **Approved Architecture Version:** `v2.1` (Final Alignment)  
> **Current Project Phase:** Phase 2 (Attendance, Operations & Student Identity)  
> **Tasks Completed:** Tasks 1 through 18 inclusive (Task 17 code: `c11b46c`, Task 18 code: `f2c1e8b`)  
> **Phase 2 Status:** Task 18 Complete; Task 19 Ready  
> **Next Task:** Task 19 — Attendance Scanner & Rapid Check-In UI (Camera/Barcode & Manual Roster)  
> **Regression Test Baseline:** 24 test files, 539 passing unit/component tests across 5 packages (53 contracts + 27 db + 220 core + 29 design-system + 210 desktop) + 1 Playwright E2E smoke suite (8 lifecycle steps passed)  
> **Official Logo SHA-256:** `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`  

---

## 1. Read This First

Welcome, agent. This document is the **single canonical, durable, and authoritative engineering guide** for continuing development on **تِبيان (Tibyan)**. You are operating in a fresh context window without access to prior conversation history; this handoff package encapsulates the full architectural truth, domain constraints, verified baseline, and precise continuation instructions for this repository.

### Critical Rules of Engagement for the Next AI:
1. **Inspect Actual Source Before Changing Architecture:** Do not trust memory or assume conventions. Before modifying any behavior, inspect the actual source code, migration files, and active tests.
2. **Current Source Code Trumps Stale Walkthroughs:** If an older plan document or early design sketch contradicts the current production TypeScript files or latest database migrations in `packages/`, the **current production code and migration journals are authoritative**. Report any discrepancies before proposing architectural changes.
3. **Architecture is v2.1:** All development conforms strictly to the revised v2.1 architectural alignments detailed in [TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md](file:///F:/tebyan/TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md).
4. **Tasks 1 through 18 are COMPLETE:** All foundation, dual-database, domain core services (auth, student, group, session, backup, dashboard, attendance), design system, Electron shell/wizard, PIN login screen, student management UI, group management UI, real-data Today Dashboard UI, Settings/Academic-Year/Assistant UI, Windows packaging & Playwright smoke tests, and Phase 2 Task 18 attendance schema, repository, and core tracking are built, fully tested, and hardened up to commit `f2c1e8b`.
5. **Task 19 Has NOT Started:** Do not assume Task 19 is underway. Task 19 is Attendance Scanner & Rapid Check-In UI (Camera/Barcode & Manual Roster).
6. **One Task at a Time:** Always follow the strict workflow: understand requirements, inspect target files, formulate an implementation plan, obtain user approval, execute, verify against regression tests, and halt for review. Never batch multiple tasks.
7. **Explicit Planning Approval Required Before Execution:** Do not treat creation of an implementation plan as approval to execute it. Stop after planning and wait for an explicit user message approving execution before modifying production code.

---

## 2. Product Vision

**تِبيان (Tibyan)** is a **Windows-first, local-first Teacher Operating System** designed specifically for an independent Egyptian mathematics educator teaching grades 1 Preparatory through 3 Secondary across both the General Egyptian National System and the Egyptian Baccalaureate System (نظام البكالوريا المصرية), covering both Arabic and English/Math-Language tracks.

- **Official Tagline:** مساعد المدرس الذكي (The Smart Teacher Assistant).
- **Core Product Mantra:** من التحضير إلى الامتحان، كل أدوات المدرس في مكان واحد (From preparation to examination, all the teacher's tools in one place).
- **What Tibyan IS NOT:**
  - Tibyan is **NOT a school ERP** (no complex administrative bureaucracy, department hierarchies, or enterprise bloat).
  - Tibyan is **NOT a retail POS/cashier software** (no generic barcode receipts, cash drawer registers, or barcode-scanner-centric cashier paradigms).
- **UX Target:** Balanced at approximately **70% high-focus productivity application** (reminiscent of Linear, Notion, and macOS/Windows desktop craftsmanship) + **30% educational domain intelligence** (deep pedagogical awareness of Egyptian math curricula, exam assembly, and student weaknesses).
- **Typography & Localization:** Authentic Arabic-first RTL application interface with isolated LTR containers for mathematical notation, LaTeX expressions, numbers, code, and English track terminology.

---

## 3. Absolute Product Decisions

The following architectural and product boundaries are permanent and non-negotiable across all development phases:

1. **NO Local/Offline AI Model — Ever:**
   - **NO fully local/offline AI model will ever be added to Tibyan.**
   - **NO Ollama.**
   - **NO local Llama, Mistral, Gemma, or ONNX runtimes.**
   - **NO downloaded LLM or multi-gigabyte weight checkpoints running on the teacher's Windows machine.**
   - The term **"local-first" refers strictly to the application architecture, data storage, and SQLite database**—ensuring the teacher owns 100% of their data on their local NVMe/SSD without cloud dependency.
   - Future AI capabilities (Phase 6+) will utilize **external, API-based cloud models only (e.g. Google Gemini API)** via secure, optional, user-provided API keys.
2. **Controlled AI Tool Execution:**
   - When the external AI assistant is introduced in future phases, it will **NEVER access the SQLite database directly, nor will it generate or execute raw SQL**.
   - All AI interactions will occur through strictly typed, validated `@tibyan/core` tool functions.
   - Any sensitive action initiated by AI must adhere to the lifecycle: `Preview -> Confirm -> Execute -> Audit -> Undo` (where undo is applicable).
3. **No Cloud Database in V1:**
   - No Supabase, Firebase, AWS RDS, MongoDB Atlas, or Vercel backend.
   - The desktop application operates 100% locally with zero external network connectivity required for core functionality.
4. **No Parent/Student App in V1:**
   - V1 is strictly focused on the teacher and their classroom assistants on the local Windows desktop.

---

## 4. Technology Stack

Tibyan is built upon an enterprise-grade, modern desktop JavaScript/TypeScript ecosystem:

| Layer | Technology | Specification / Version Constraints |
|---|---|---|
| **Runtime & Shell** | Electron | `^34.2.0` — Main process strictly isolated from renderer |
| **UI Library** | React | `^18.3.1` — React 18 concurrent mode |
| **Language** | TypeScript | `^5.7.3` — Strict mode across all packages |
| **Bundler / Dev Server** | Vite | `^6.1.0` + `vite-plugin-electron` |
| **Package Manager** | pnpm Workspaces | Monorepo structured with `workspace:*` dependencies |
| **Database Engine** | SQLite via `better-sqlite3` | **Locked at `12.11.1`** (native compilation managed by `electron-builder`) |
| **ORM / Migrations** | Drizzle ORM / `drizzle-kit` | Drizzle ORM `^0.39.3`, Drizzle Kit `^0.30.4` |
| **Data Validation** | Zod | `^3.24.2` — Runtime schema validation across IPC and domain |
| **Client Routing** | React Router | `^6.29.0` — Hash routing (`createHashRouter`) for Electron `file://` safety |
| **Server State / Cache** | TanStack Query | `^5.66.0` — Async query caching and invalidation |
| **Client UI State** | Zustand | `^5.0.3` — **Approved ONLY for minimal presentation cache** (e.g. auth session display) |
| **Styling** | Tailwind CSS | `^3.4.17` + Vanilla CSS custom properties design tokens |
| **Icons** | Lucide React | `^0.475.0` — Consistent iconography |
| **Typography** | Fontsource (Offline) | `@fontsource/cairo` (Arabic), `@fontsource/inter` (Latin/Numbers), local KaTeX |
| **Unit / Integration Tests** | Vitest | `^3.0.5` — Monorepo workspace runner |
| **E2E Testing** | Playwright | `^1.50.1` — Electron application smoke testing |
| **Packaging / Installer** | `electron-builder` | `^25.1.8` — NSIS installer for Windows x64 |

---

## 5. Monorepo Structure & Architectural Boundaries

The codebase is organized as a clean pnpm workspace with strict layer isolation:

```text
F:\tebyan\
├─ packages\
│  ├─ contracts\       # @tibyan/contracts — Pure schemas, enums, DTOs, IPC channels & interfaces
│  ├─ db\              # @tibyan/db — Drizzle schemas, migrations, repositories, connection pool
│  ├─ core\            # @tibyan/core — Domain & application business logic, crypto, services, transactions
│  └─ design-system\   # @tibyan/design-system — Design tokens, official logo, UI components
└─ apps\
   └─ desktop\         # apps/desktop — Electron Main/Preload processes & React Renderer App
```

### Dependency Rules & Layer Invariants:
1. **`@tibyan/contracts`:** Depends on nothing except `zod`. Contains zero platform-specific code. Shared by DB, Core, Electron Main, and React Renderer.
2. **`@tibyan/db`:** Depends on `contracts`, `better-sqlite3`, and `drizzle-orm`. Owns the dual SQLite database connections, schema migrations, and repositories. **Never imported by the renderer.**
3. **`@tibyan/core`:** The **domain and application business-logic layer, decoupled from Electron IPC**. It contains pure domain calculations (e.g. payment inheritance resolution, occurrence key generation, calendar date arithmetic) as well as operational application services (`BackupService`, `PhotoService`, `StudentService`, `AuthService`) that coordinate persistence and filesystem access through injected dependencies and repositories. **Never imported by the renderer.**
4. **`@tibyan/design-system`:** Depends on `contracts`, React, Lucide, Tailwind. Houses official typography, brand tokens, and pure UI components (Button, Modal, Input, PinPad, Table, etc.).
5. **`apps/desktop` (Renderer):** **NEVER imports `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path` directly.** All data access and business actions must pass strictly through the typed preload bridge `window.tibyan`.

---

## 6. Security Architecture

The desktop application enforces multi-layered defense-in-depth:

```text
┌─────────────────────────────────────────────────────────────┐
│                    REACT RENDERER                           │
│  • contextIsolation: true                                   │
│  • nodeIntegration: false                                   │
│  • sandbox: true                                            │
│  • Communicates exclusively via window.tibyan               │
└──────────────────────────────┬──────────────────────────────┘
                               │ typed IPC invoke()
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON PRELOAD                         │
│  • Exposes typed window.tibyan via contextBridge            │
│  • NO raw ipcRenderer exposed                               │
│  • NO generic invoke(channel, payload) escape hatch         │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC Channels
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN                            │
│  • Validates sender frame (validateIpcSender)               │
│  • Validates payload with Zod schemas at boundary           │
│  • Owns authoritative user session (runtime.currentSession) │
│  • Maps domain errors safely (INTERNAL_ERROR fallback)      │
│  • Executes @tibyan/core services inside SQLite transaction │
└─────────────────────────────────────────────────────────────┘
```

### Mandatory Security Guarantees:
1. **Electron Hardening:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, `webviewTag: false`.
2. **Preload Surface:** Only strongly typed methods on `window.tibyan` exist. There is no `window.electron` or raw `ipcRenderer.send`/`invoke`.
3. **MAIN Process is Authoritative:** The Main process owns `runtime.currentSession`. The renderer's cached user state is treated as untrusted presentation metadata. All authorization decisions (`requirePermission`, `requireAuthenticatedActor`) occur inside Main process handlers.
4. **Input Validation:** Every IPC payload is validated against a strict Zod schema before invoking Core services.
5. **Sanitized Error Boundary (`safeIpcCall`):**
   - Known domain errors (`AuthError`, `StudentError`, `GroupError`, `SessionError`, `BackupError`, `DashboardError`) preserve error codes and safe messages.
   - Zod errors return formatted validation issue lists.
   - Unknown internal exceptions are stripped of stack traces and internal paths, returning a safe `INTERNAL_ERROR`.

---

## 7. Database Architecture: Dual-Database Isolation

Tibyan separates persistent global application state from yearly academic records using two distinct SQLite databases:

```text
%APPDATA%\Tibyan\data\
├─ system\
│  └─ tibyan-system.sqlite          <-- Persistent Global System Database
└─ academic-years\
   ├─ tibyan-2026-2027.sqlite       <-- Isolated Academic Year 2026-2027
   └─ tibyan-2027-2028.sqlite       <-- Isolated Academic Year 2027-2028
```

### 7.1 System Database (`tibyan-system.sqlite`)
- **Canonical Path:** `%APPDATA%\Tibyan\data\system\tibyan-system.sqlite` (or `<appDataDir>/data/system/tibyan-system.sqlite`).
- **Contents:**
  - `users`: Teacher/Owner and Assistants, scrypt PIN hashes, salts, failed attempt counters, lockouts.
  - `permissions` & `user_permissions`: Granular capability grants.
  - `academic_years`: Registry of all academic years (`id`, `name`, `db_filename`, `is_active`, `is_archived`).
  - `global_settings`: Persistent theme preferences, app settings.
  - `system_audit_log`: Append-only audit table for system-level actions.
  - `backup_records`: History of all automated and manual backup generations.

### 7.2 Academic-Year Database (`tibyan-<YYYY-YYYY>.sqlite`)
- **Canonical Path:** `%APPDATA%\Tibyan\data\academic-years\tibyan-<YYYY-YYYY>.sqlite`.
- **Contents:**
  - `students`: Student identity, codes (`TB-XXXX`), photo paths, education system, grade level, track, guardian phones, QR/barcodes.
  - `student_notes`: Behavioral and academic notes (`NEEDS_FOLLOW_UP`, `ACADEMIC_WEAKNESS`, etc.).
  - `groups`: Class groups, education system, grade level, track, optional focus branch, default payment terms.
  - `group_enrollments`: Student-to-group enrollments with `ACTIVE`/`ENDED` statuses and group-specific payment overrides.
  - `group_schedules`: Recurring weekly schedule rules (weekday, start time, duration).
  - `sessions`: Concrete class session instances with immutable occurrence keys and mutable execution slots.
  - `academic_audit_log`: Append-only audit table for academic mutations.

### 7.3 Critical Database Invariants:
- **Zero Cross-Database Foreign Keys:** SQLite cannot enforce foreign keys across distinct physical database files. Relationships between system entities (users) and academic entities use snapshot metadata (`authorUserId`, `authorNameSnapshot`).
- **`db_filename` is Authoritative:** The `academic_years` registry stores the exact physical filename (`db_filename`). The runtime must **NEVER synthesize or guess the year database filename from the ID**.
- **Single Active Academic Mount:** Only one academic-year database is mounted for active read/write operations at any time. Switching academic years unmounts the previous year and cleanly mounts the target year without touching system accounts or settings.
- **Path Traversal Guards:** Runtime validates that `db_filename` is a simple relative basename that resolves strictly inside `<appDataDir>/data/academic-years`. Any path containing `..`, separators, or escaping the root triggers an immediate security error.

---

## 8. Domain Model

The educational domain model cleanly reflects the reality of independent Egyptian mathematics tutoring:

1. **`EducationSystem`:**
   - Values: `GENERAL` (التعليم العام) and `EGYPTIAN_BACCALAUREATE` (البكالوريا المصرية).
2. **`GradeLevel`:**
   - Values: `PREP_1`, `PREP_2`, `PREP_3`, `SEC_1`, `SEC_2`, `SEC_3`.
   - **Independence:** `EducationSystem` and `GradeLevel` are completely independent dimensions. They are never combined into a brittle flattened string.
3. **`LanguageTrack`:**
   - Values: `ARABIC` (عام عربي) and `LANG_ENGLISH` (لغات / Math English).
4. **`MathBranch` on Groups:**
   - Values: `GENERAL_MATH`, `ALGEBRA`, `GEOMETRY`, `TRIGONOMETRY`, `CALCULUS`, `STATISTICS`, `APPLIED_MATH`.
   - On the `Group` model, `focusMathBranch` is an **optional focus branch**.
   - Strict mathematical branch association belongs to later curriculum, lesson, and question-bank capability areas, not as a rigid blocker for group creation.

---

## 9. Payment Architecture

Payment terms in Tibyan are strictly **enrollment-scoped**, not student-scoped:

```text
┌───────────────────────────┐
│           GROUP           │
│  defaultPaymentType       │
│  defaultPaymentAmount     │
└─────────────┬─────────────┘
              │ inherits defaults
              ▼
┌───────────────────────────┐
│     GROUP ENROLLMENT      │
│  paymentTypeOverride?     │ <--- Overrides live HERE, per enrollment
│  paymentAmountOverride?   │
└─────────────▲─────────────┘
              │ enrolled in
┌─────────────┴─────────────┐
│          STUDENT          │
│  (NO payment fields)      │
└───────────────────────────┘
```

### Business Rules:
1. `Group` defines default pricing: `defaultPaymentType` (`MONTHLY` | `PER_SESSION`) and `defaultPaymentAmount` (e.g. `400.0` EGP).
2. `Student` has **NO payment override fields**.
3. `GroupEnrollment` defines optional overrides: `paymentTypeOverride` and `paymentAmountOverride`.
4. **Inheritance Resolution (`calculateEffectivePayment`):**
   - If enrollment override is non-null, the override applies.
   - If enrollment override is null, the group default applies.
5. **Multi-Group Independence:** A student enrolled in two groups (e.g. standard class at 400 EGP and intensive revision at 600 EGP) maintains independent pricing for each group.
6. **Re-Enrollment History:** When a student leaves a group, their enrollment row is updated to `status = 'ENDED'` with `left_at`. A partial unique index (`idx_group_enrollments_active`) permits only one `ACTIVE` enrollment per student-group pair, preserving historical records.

---

## 10. Session Architecture & Rescheduling Defense

Naive calendar systems regenerate duplicate sessions if a rescheduled occurrence leaves its original slot vacant. Tibyan completely eliminates this class of bugs through **immutable occurrence identity**:

### 10.1 Key Structure
```sql
sessions (
  id                   TEXT PRIMARY KEY,
  group_id             TEXT NOT NULL,
  schedule_id          TEXT,
  occurrence_key       TEXT NOT NULL UNIQUE,  -- Immutable: `${schedule_id}_${scheduled_date}`
  scheduled_date       TEXT NOT NULL,         -- Immutable original calendar date (YYYY-MM-DD)
  scheduled_start_time TEXT NOT NULL,         -- Immutable original time (HH:mm)
  effective_date       TEXT NOT NULL,         -- Mutable execution date (YYYY-MM-DD)
  effective_start_time TEXT NOT NULL,         -- Mutable execution time (HH:mm)
  duration_minutes     INTEGER NOT NULL,
  status               TEXT NOT NULL          -- SCHEDULED | COMPLETED | RESCHEDULED | CANCELLED_BY_TEACHER
);
```

### 10.2 Invariants:
1. **`occurrenceKey` is Immutable:** Once created, `occurrenceKey`, `scheduledDate`, and `scheduledStartTime` never change under any circumstances.
2. **Rescheduling Semantics:** When a session is rescheduled:
   - `effectiveDate` and `effectiveStartTime` are updated to the new execution slot.
   - `status` is set to `'RESCHEDULED'`.
   - `occurrenceKey`, `scheduledDate`, and `scheduledStartTime` remain untouched.
3. **Exact 28-Day Rolling Horizon:**
   - The materializer evaluates exactly 28 calendar dates: **today through today + 27 days inclusive** ($[D, D + 27]$).
   - The renderer cannot control or change the horizon length.
4. **Idempotent Materialization:** For every matching slot in the horizon, the materializer computes `targetOccurrenceKey`. If a session with that key already exists (regardless of whether status is `SCHEDULED`, `RESCHEDULED`, `COMPLETED`, or `CANCELLED_BY_TEACHER`), **the materializer does nothing**. No duplicate session is ever created for the original recurring slot.
5. **Today Dashboard Queries:** The Today Dashboard strictly queries `effectiveDate = :today` and sorts ascending by `effectiveStartTime`.

---

## 11. Audit & Transaction Rules

Every state modification in Tibyan is recorded in append-only SQLite audit tables:

1. **Trigger-Enforced Immutability:** Both `system_audit_log` and `academic_audit_log` have SQLite triggers:
   - `trg_system_audit_no_update` / `trg_system_audit_no_delete`
   - `trg_academic_audit_no_update` / `trg_academic_audit_no_delete`
   - Any SQL `UPDATE` or `DELETE` against audit tables aborts with a SQLite trigger error.
2. **Actor Polymorphism & Invariants:**
   - `actorType = 'USER'`: Requires a valid non-null `actorUserId` (UUIDv4) and a non-empty `actorNameSnapshot`.
   - `actorType = 'SYSTEM'`: Requires `actorUserId = null` and a required descriptive non-empty `actorNameSnapshot`. The snapshot is not a single hardcoded literal; background services provide an implementation-specific descriptive name (e.g. `BackupService` logs `'Automated Backup Engine'`, while schedule jobs may log a descriptive subsystem name).
3. **Atomic Transactions (`runInAuditTransaction`):**
   - In `better-sqlite3`, the business mutation and the corresponding audit log entry targeting the same database must execute inside a synchronous `db.transaction()`.
   - If the audit insert fails (e.g. trigger violation or missing required field), the business mutation rolls back completely.
   - If the business mutation fails, no orphaned audit row is written.

---

## 12. Authentication & Credential Cryptography

1. **PIN Specification:** Exactly 4 numeric digits (`0-9`), enforced by schema regex `/^\d{4}$/`.
2. **Key Derivation Function:** Node.js built-in `crypto.scrypt`:
   - **Salt:** 16 cryptographically secure random bytes (`crypto.randomBytes(16)`).
   - **Parameters:** $N = 16384$, $r = 8$, $p = 1$, $\text{maxmem} = 32\,\text{MB}$.
   - **Derived Key Length:** 64 bytes (`keylen = 64`).
3. **Constant-Time Verification:** Candidate verification derives a 64-byte key using the stored salt and parameters, then compares via `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
4. **Brute-Force Protection:**
   - Tracked in `users.failed_attempts` and `users.locked_until`.
   - After **5 consecutive failed attempts**, the account is locked with a **30-second cooldown** (`lockedUntil = now + 30s`).
   - Requests during cooldown are rejected with `ACCOUNT_LOCKED` and return the remaining `retryAfterSeconds`.
   - A successful login resets `failedAttempts = 0` and `lockedUntil = null`.
5. **No Plaintext Persistence:** Plaintext PINs are never stored in the database, never written to disk, and never included in audit payloads or log messages.

---

## 13. Backup Architecture (`BackupService`)

The automated backup engine provides full multi-year disaster recovery:

1. **Scope:**
   - Backs up `tibyan-system.sqlite`.
   - Backs up **ALL registered academic-year databases** (both active and inactive years) discovered via `academic_years` registry.
   - Backs up all managed student media directories.
2. **Native SQLite Online Backup:** Uses `better-sqlite3` native `db.backup()` API to capture point-in-time consistent snapshots without blocking ongoing read queries.
3. **Integrity Verification:** Before marking any backup record `SUCCESS`, every backed-up SQLite file is opened and verified with `PRAGMA integrity_check;`. If the pragma does not return `'ok'`, the backup is marked `FAILED` and an error is raised.
4. **Rolling Retention:**
   - Automated weekly backups maintain a rolling retention window of the **newest 4 confirmed successful generations**.
   - Pruning removes older generations only after a new generation is confirmed `SUCCESS`.
5. **Archival Backups:**
   - When an academic year is archived (`isArchived = true`), a dedicated archival backup bundle is created (`archive-<year>-<timestamp>`).
   - Archival backups are permanently excluded from weekly rolling retention pruning.
6. **Storage Path:** Canonical root is `<appDataDir>/backups`. No secondary backup directories are created.
7. **Permissions & Audit:**
   - Manual backup trigger requires `BACKUP_MANAGE` permission.
   - Automated weekly backup executes under `actorType: 'SYSTEM'` with `actorNameSnapshot = 'Automated Backup Engine'`.

---

## 14. Branding & Design System

The visual design system embodies modern luxury, calm focus, and authentic Arab identity:

1. **Official Brand Constants (Immutable across Light and Dark themes):**
   - **Primary Petrol Teal:** `#0B3D3D` (`--tibyan-navy`)
   - **Accent Muted Gold:** `#C59B27` (`--tibyan-gold`)
   - **Supporting Teal:** `#1F6E68` (`--tibyan-teal`)
   - **Gold Hover:** `#B38728` (`--tibyan-gold-hover`)
2. **Dark Mode Palette:**
   - Surfaces use deep teal/slate: App background `#0A1417`, Surface `#0F1F24`, Elevated `#162B32`.
   - **Never pure black (`#000000`).**
3. **Typography:**
   - **Cairo** (`@fontsource/cairo`) for all Arabic UI text.
   - **Inter** (`@fontsource/inter`) for Latin UI text, numbers, and tabular data.
   - Local bundled KaTeX font stack for mathematical formulas.
   - **Zero external font CDNs or Google Fonts URLs.**
4. **Official Logo Asset:**
   - Stored at: `packages/design-system/src/assets/tibyan-official-logo.png`.
   - **Mandatory SHA-256 Checksum:** `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.
   - **Immutable Asset Rule:** Do NOT regenerate, redraw, vectorize, crop, recolor, or recompress the official logo PNG file.
5. **Aesthetic Philosophy:**
   - Avoid childish education software themes, colorful cartoon badges, retail POS aesthetic, giant cards, or heavy glassmorphism.
   - Deliver a sleek, professional, high-density desktop tool that respects the teacher's time and focus.

---

## 15. Electron Native Packaging (`better-sqlite3`)

1. **Locked Native Dependency:** `better-sqlite3` is locked at version `12.11.1`.
2. **Configuration (`apps/desktop/electron-builder.json5`):**
   - `asar: true`
   - `asarUnpack: ["**/*.node"]` (unpacks native C++ addons to `app.asar.unpacked`)
   - `npmRebuild: true`
   - `win.target: "nsis"`
3. **No Native Binaries in Git:** Native `.node` binaries must never be committed to git. They are compiled via `electron-builder install-app-deps`.
4. **Final Packaging Verification:** Task 17 will verify that the packaged NSIS Windows executable unpacks and loads `better_sqlite3.node` cleanly in production mode.

---

## 16. First-Run Wizard Current Behavior (Task 11 State)

The onboarding flow was implemented in Task 11 (`a6c0d04`, hardened in `145e0d3`):

1. **Authoritative Setup State:**
   - The renderer queries `window.tibyan.system.getSetupState()`, which checks the SQLite databases directly.
   - `isSetupComplete = hasOwner && hasActiveAcademicYear`.
   - Neither `localStorage` nor `sessionStorage` has any authority over setup state.
2. **Wizard Steps:**
   - **Fresh Install:** `Welcome -> Owner Account -> Auto-Login -> Initial Academic Year -> Completion`.
   - **Interrupted Setup (Owner exists, No Year):** Displays `resume-auth` step, prompts for Owner PIN, establishes session, and creates the academic year. Does **not** attempt to create a duplicate Owner.
   - **Interrupted Setup (Year exists, No Owner):** Skips year creation and prompts only for Owner creation.
3. **Atomic Academic Year Creation:**
   - File naming: `tibyan-<name>.sqlite` (e.g. `tibyan-2026-2027.sqlite`).
   - The new SQLite file is created and migrated on disk **before** the registry row is committed to the system database.
   - If registry insertion fails, the newly created physical file is cleaned up, preventing orphan files.
   - If migration fails, the partial file is unlinked and no registry entry is written.
   - If mounting fails after successful creation and registry entry, both the registry record and database file are preserved for startup recovery.

---

## 17. Today Dashboard Rules

1. **Strictly Read-Only:** `DashboardService` executes read-only SQLite queries. It performs zero mutations, writes zero audit entries, and **never triggers session materialization**.
2. **Effective Slot Filtering & Sorting:**
   - Sessions are queried by `effectiveDate = :targetDate`.
   - Classes are sorted ascending by `effectiveStartTime`, with deterministic secondary ordering (`groupName`, `groupId`, `sessionId`).
3. **Rescheduled Highlighting:** A session is identified as rescheduled if `rescheduledAt !== null || scheduledDate !== effectiveDate || scheduledStartTime !== effectiveStartTime`. This status is preserved even if the session is subsequently cancelled.
4. **Follow-Up Flagging:**
   - `needsAttention` items are driven **exclusively** by notes tagged `NEEDS_FOLLOW_UP`.
   - Notes tagged `ACADEMIC_WEAKNESS`, `BEHAVIOR`, or `GENERAL` alone do not qualify for `needsAttention`.

---

## 18. Completed Task Ledger (Tasks 1–15)

All commits have been extracted directly from the live Git log:

| Task # | Task Name | Status | Main Commit | Hardening Commit(s) | Scope & Highlights |
|---|---|---|---|---|---|
| **Task 1** | Monorepo Foundation & Tooling | COMPLETE | `dd66744` | — | pnpm workspaces, TS project references, Vitest workspace, offline fonts, Tailwind. |
| **Task 2** | Core Contracts & IPC Definitions | COMPLETE | `8aa1dfa` | `09d7638` | Domain enums (`EGYPTIAN_BACCALAUREATE`, `ActorType`), DTOs, Zod schemas, IPC channel constants. |
| **Task 3** | Dual Database Architecture | COMPLETE | `9307524` | `b19f6c7` | System & Academic Drizzle schemas, migrations, repositories, SQLite audit triggers. |
| **Task 4** | PIN Authentication & Cooldown Core | COMPLETE | `5123c30` | — | 4-digit PIN, scrypt hashing, 5-attempt brute-force cooldown (30s), permissions, audit logging. |
| **Task 5** | Student Management & Photo Storage | COMPLETE | `084b89e` | `5269a67` | Student codes (`TB-XXXX`), photo storage under UUID, notes timeline, atomic audit rollback. |
| **Task 6** | Groups, Pricing & Rolling Sessions | COMPLETE | `0482b56` | `eb9b0b7`, `d2ea1b3` | Group creation, enrollment-scoped payment inheritance, idempotent 28-day sessions with stable occurrence keys. |
| **Task 7** | Multi-Year Automated Backup Service | COMPLETE | `9e39e38` | `464383d` | Online backup (`better-sqlite3`), multi-year database & media inclusion, rolling 4-week retention, restore verification. |
| **Task 8** | Today Dashboard Aggregation Service | COMPLETE | `f599a9c` | — | Live aggregation querying `effectiveDate`, `effectiveStartTime` sorting, `NEEDS_FOLLOW_UP` alerts. |
| **Task 9** | Design System Tokens & Primitives | COMPLETE | `7564386` | `20af589` | Brand colors (`#0B3D3D`, `#C59B27`), typography, Light/Dark themes, official logo hash, `PinPad` component. |
| **Task 10** | Electron Desktop Shell & Typed IPC | COMPLETE | `b207312` | `56724e2` | Electron shell, secure preload bridge, native module packaging, typed IPC handlers. |
| **Task 11** | Desktop AppShell & First-Run Wizard | COMPLETE | `a6c0d04` | `145e0d3` | RTL layout, official logo sidebar, topbar, First-Run Wizard, atomic recovery on setup error. |
| **Task 12** | 4-Digit PIN Auth Screen & Session Store | COMPLETE | `f79c8a3` | — | UserCard, LoginScreen with account-scoped cooldown and absolute deadline derivation, safe LoginUserDto projection, RootLayout splash/retry boot, cross-user cache isolation, immediate PIN wipe. |
| **Task 13** | Student Management UI | COMPLETE | `a88be7f` | `34169ba` | StudentsPage directory with search/filters, StudentCreateModal with independent dimensions and phone validation, StudentProfilePage, StudentNotesView with distinct tag badges, opaque photo token selection, custom `tibyan-media://` protocol. |
| **Task 14** | Group Management UI, Enrollment Picker & Reschedule Modal | COMPLETE | `5b0c0ad` | `3a05971` | Real groups directory, multi-slot schedule editor with duplicate check, student enrollment modal with fee overrides, single-session reschedule modal, permission boundaries and dashboard cache coherence hardening. |
| **Task 15** | Real-Data Today Dashboard UI | COMPLETE | `c9d7ec1` | — | Real-data Today Dashboard connecting to `getToday()`, compact quick stats strip, ClassScheduleCard with historical rescheduled callout, NeedsAttentionCard with STUDENTS_READ permission isolation, dead TodayPlaceholder removal, student mutation cache coherence, zero session materialization calls. |

---

## 19. Current Verified Baseline

The repository has been empirically verified with zero failures across all packages:

- **Vitest Unit & Integration Tests (21 files, 463 tests):**
  - `@tibyan/contracts`: 1 test file, **42 passed**
  - `@tibyan/db`: 1 test file, **25 passed**
  - `@tibyan/core`: 10 test files, **196 passed**
  - `@tibyan/design-system`: 1 test file, **29 passed**
  - `@tibyan/desktop`: 8 test files, **171 passed**
  - **Monorepo Total:** **463 tests passed (0 failed)**
- **TypeScript Typecheck (`pnpm -r typecheck`):** **0 errors** across all 5 workspace projects.
- **Production Desktop Build (`pnpm --filter @tibyan/desktop build`):** **0 errors**, full Vite and Electron bundles built.
- **Database Schema Drift (`pnpm --filter @tibyan/db db:generate`):** **Zero schema drift** ("No schema changes, nothing to migrate 😴").
- **Official Logo Integrity:** SHA-256 is exactly `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.
- **Lint Scripts:** Package-level lint scripts are currently unconfigured in `package.json` (as expected).
- **Working Tree:** Clean at Task 15 code commit `c9d7ec1`.

---

## 20. Remaining Phase 1 Tasks (Tasks 16–17)

| Task # | Task Name | Status | Primary Responsibilities |
|---|---|---|---|
| **Task 16** | Settings, Academic Year Switcher & Backup Tab | **COMPLETE** (`7562a77`) | Academic year manager (create/switch), user & assistant account management, manual backup trigger & status view. |
| **Task 17** | Windows Packaging, Playwright Smoke Tests & Hardening | **COMPLETE** (`c11b46c`) | End-to-end smoke tests against packaged NSIS binary, ASAR native binary verification, release hardening. |

---

## 21. Task 16 Architectural & Security Hardening Summary

Task 16 built the administrative control center of Tibyan and underwent rigorous security, correctness, and lifecycle hardening:

### 21.1 Security & Architecture Implementations
1. **Critical Finding 1 — Management Read Model Decoupled from Pre-Auth Projection:**
   - Kept pre-auth `auth.listUsers()` minimal and active-only (`LoginUserDto`: `id, fullName, username, role`).
   - Introduced dedicated authenticated channel `auth.listManagementUsers()` backed by `AuthService.listManagementUsers(actorUserId)`.
   - Returns `ManagedUserDto` (`id, fullName, username, role, status, permissions, createdAt, updatedAt`), strictly omitting sensitive credential fields (`pinHash`, `salt`, `failedAttempts`, `lockedUntil`).
   - Authoritatively enforced in Main IPC requiring `USERS_MANAGE` or `OWNER`.
   - Accurately includes inactive assistants, allowing deactivation and reactivation workflows.
2. **Critical Finding 2 — Authoritative Core Privilege Escalation Protections:**
   - Disallowed non-Owner actors from granting permissions they do not possess (`USERS_MANAGE` assistant cannot grant `SETTINGS_WRITE`, `BACKUP_MANAGE`, etc.).
   - Disallowed mutating Owner role or creating a second Owner via `createAssistant`.
   - Disallowed mutating Owner permissions or status (`setUserStatus` & `setAssistantPermissions`).
   - Disallowed Assistants from resetting Owner PIN (`resetUserPin`).
   - Disallowed Assistants from mutating their own permissions (self-escalation check: `actor.id === targetUser.id`).
3. **Critical Finding 3 — Authoritative Academic Year Switch IPC Gate:**
   - `SYSTEM_SWITCH_ACADEMIC_YEAR` Main handler authoritatively verifies active session and requires `SETTINGS_WRITE` or `OWNER` role.
   - Validates `SwitchAcademicYearSchema` strictly in Main.
4. **High Finding 4 — Year Switch Cache Isolation:**
   - `useSwitchAcademicYear` purges all academic-year scoped queries by canonical key factories: `studentKeys.all`, `groupKeys.all`, `sessionKeys.all`, `dashboardKeys.all`.
   - System queries (`systemSettings`, `academicYears`, `setupState`) are refreshed rather than destroyed.
5. **High Finding 5 — Theme Restart Hydration:**
   - Implemented `ThemeHydrator` bridge inside `Providers` that reads `system.getSettings().theme` and authoritatively applies it on application startup without requiring visiting `SettingsPage`.
6. **High Finding 6 — Backup Path Isolation:**
   - Introduced `BackupHistoryItemDto` (`id, backupDate, status, sizeBytes, academicYearsIncluded, createdAt`) omitting `backupPath`.
   - Main IPC mappings strictly isolate host filesystem paths (`C:\...`, `AppData`) from the renderer.
7. **High Finding 7 — Direct IPC Backup Authorization:**
   - Main IPC `BACKUP_TRIGGER` authoritatively checks that the actor has `BACKUP_MANAGE` or `OWNER` role.
8. **Medium Finding 8 — Settings Route & Tab Permissions:**
   - Tabs display safe Arabic fallback messages when permissions are absent.
   - Owner deactivation button is hidden in UI and authoritatively rejected in Core.
   - Assistant reactivation action supported for deactivated accounts.

### 21.2 Process Violation Notice & Governance Remediation
- **Process Violation Recorded:** During the initial Task 16 phase, production files were created before receiving explicit user approval following implementation plan creation.
- **Remediation & Binding Rule for Task 17:** For Task 17, planning must operate in `PLANNING_ONLY` mode and terminate the agent turn before modifying any code. Execution may proceed ONLY after a separate explicit user approval message.

---

## 22. Task 17 Completion & Windows Packaging Architecture

Task 17 marks the formal completion of **Phase 1: Foundation & Desktop Core**:
- **Production Packaging Verified:**
  - `electron-builder` configuration in `apps/desktop/electron-builder.json5` builds unpacked Windows directory (`release/win-unpacked/تِبيان.exe`) with `asar: true` and `asarUnpack: ["**/*.node"]`.
  - Configured `scripts/after-pack.cjs` hook that guarantees the Electron ABI-compatible `better_sqlite3.node` (NODE_MODULE_VERSION 132 for Electron 34) is placed into `app.asar.unpacked/node_modules/better-sqlite3/build/Release/` while preserving the host Node.js binary (NODE_MODULE_VERSION 137) in workspace `node_modules` for instant Vitest test execution without version conflicts.
- **Preload Script Sandbox Hardening:**
  - Configured `apps/desktop/vite.config.ts` to bundle `electron/preload.ts` as CommonJS (`preload.cjs`) with `inlineDynamicImports: true`.
  - Updated `apps/desktop/electron/main.ts` to dynamically resolve `preload.cjs` when present, preventing Chromium sandbox `SyntaxError: Cannot use import statement outside a module`.
- **Test-Data Isolation & Packaging Tests:**
  - `apps/desktop/electron/runtime.ts` accepts `process.env.TIBYAN_APP_DATA_DIR` fallback, enabling automated testing to run against temporary isolated directories (`os.tmpdir()`) without polluting or reading `%APPDATA%\تِبيان`.
  - `apps/desktop/tests/packaging.test.ts` asserts runtime path resolution, `electron-builder.json5` configuration integrity, `better-sqlite3` native dependency presence, and official logo SHA-256 matching.
- **Playwright E2E Smoke Suite (`apps/desktop/e2e/smoke.spec.ts`):**
  - Configured `apps/desktop/playwright.config.ts` with single-worker execution and 60s timeout.
  - Smoke suite launches `apps/desktop/release/win-unpacked/تِبيان.exe` against isolated temporary `os.tmpdir()` and verifies 8 full lifecycle stages:
    1. First-Run Wizard welcome screen.
    2. Owner account setup (`fullName`, `username`, `pin`, `confirmPin`).
    3. Academic year creation (`2026-2027`).
    4. Transition into `AppShell` with active academic year badge and teacher name in `Topbar`.
    5. Core route navigation across Students (`/students`), Groups (`/groups`), Settings (`/settings`), and Today Dashboard (`/`).
    6. Dynamic theme toggling (`topbar-theme-toggle-btn`) with DOM class verification.
    7. Clean logout (`topbar-logout-btn`) followed by `LoginScreen` invalid PIN rejection (`9999`) and valid PIN authentication (`1234`).
    8. App shutdown (`electronApp.close()`), restart against existing testDataDir, verification that FirstRunWizard is bypassed, login screen rendered, and session re-established with restored academic year.
- **Regression Verification:**
  - All 504 unit/component tests pass across 24 test files in all 5 workspace packages.
  - Zero typecheck errors (`pnpm -r typecheck`).
  - Zero schema drift (`pnpm --filter @tibyan/db db:generate`).
  - Official logo hash matches `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

---

## 23. Task 18 Completion & Attendance Tracking Core Architecture

Task 18 marks the foundational entry into **Phase 2: Attendance, Operations & Student Identity**:
- **Persistence & Migration:**
  - Added `attendanceRecords` table to `packages/db/src/schema/academic.schema.ts` with foreign keys to `sessions` and `students` (`onDelete: 'restrict'`).
  - Added composite unique index `idx_attendance_session_student` on `(sessionId, studentId)` to prevent duplicate records.
  - Generated and verified deterministic migration `packages/db/src/migrations/academic/0003_neat_krista_starr.sql` and registered it in `migrator.ts`.
  - Implemented `AttendanceRepository` with atomic `upsert`, `batchUpsert`, `findById`, `findBySessionAndStudent`, `listBySessionId`, `countByStatusForSession`, and `listByDateWithDetails`.
  - Extended `SessionRepository` with `updateStatus(id, status)` for lifecycle tracking.
- **Contracts & Validation:**
  - Defined `AttendanceStatus` enum (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) in `packages/contracts/src/enums/attendance.ts`.
  - Added DTOs and Zod validation schemas in `packages/contracts/src/models/attendance.dto.ts` (`AttendanceRecordDto`, `SessionRosterItemDto`, `SessionAttendanceRosterDto`, `EndOfDayFollowUpDto`, `RecordAttendanceInputSchema`, `BatchRecordAttendanceInputSchema`, `CompleteSessionInputSchema`).
  - Registered IPC channels in `packages/contracts/src/ipc/channels.ts` (`attendance:get-roster`, `attendance:record`, `attendance:batch-record`, `attendance:get-end-of-day`, `sessions:complete`).
  - Added `attendance` namespace and `sessions.complete` to `TibyanApi` contract in `packages/contracts/src/ipc/api.ts`.
- **Domain Services & Audit Logging:**
  - Implemented `AttendanceService` in `packages/core/src/attendance/attendance.service.ts`:
    - `getSessionRoster(actor, sessionId)`: Enforces `ATTENDANCE_READ` permission, resolves enrolled students, inherits effective fee/payment terms from group or student override, sorts alphabetically using Arabic locale (`ar-EG`), and computes summary metrics (total, present, absent, late, excused, unmarked).
    - `recordAttendance(actor, input)`: Enforces `ATTENDANCE_RECORD` permission, performs atomic database upsert, and writes an audit log entry (`ATTENDANCE_RECORDED` or `ATTENDANCE_UPDATED`) within the same transaction.
    - `batchRecordAttendance(actor, input)`: Enforces `ATTENDANCE_RECORD` permission, performs atomic batch upsert across multiple students, and logs batch audit entries atomically.
    - `completeSession(input, actor)`: Enforces `ATTENDANCE_RECORD` permission, verifies session exists, updates status to `COMPLETED`, and logs `SESSION_COMPLETED` audit event atomically.
    - `getEndOfDayFollowUp(actor, dateStr)`: Aggregates daily attendance metrics across all sessions on the given date and generates polite Arabic WhatsApp parent notification templates (`أهلاً بحضرتك...`).
- **Electron IPC & Preload Security:**
  - Implemented `attendance.ipc.ts` with frame validation (`validateSenderFrame`), active session checking, and permission enforcement.
  - Implemented `sessions:complete` handler in `sessions.ipc.ts`.
  - Mounted attendance IPC in `apps/desktop/electron/ipc/index.ts` and `runtime.ts`.
  - Exposed sanitized `window.tibyan.attendance` and `window.tibyan.sessions.complete` via `apps/desktop/electron/preload.ts`.
- **Verification Baseline:**
  - All 539 unit/component tests pass across 24 test files in all 5 workspace packages (53 contracts + 27 db + 220 core + 29 design-system + 210 desktop).
  - Zero typecheck errors (`pnpm -r typecheck`).
  - Zero schema drift (`pnpm --filter @tibyan/db db:generate`).
  - Windows packaging succeeds (`pnpm --filter @tibyan/desktop run pack`).
  - Playwright E2E smoke test passes (1/1) on packaged Windows application (`pnpm --filter @tibyan/desktop test:e2e`).
  - Official logo SHA-256 matches `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

---

## 24. Future Phase Roadmap

The overarching roadmap for Tibyan is grounded in the approved v2.1 plan and master specification (`2026-09-17-tibyan-design.md`):

### Approved Immediate Next Phase:
- **Phase 2 — Attendance, QR/Barcode, Student Cards, Finance & Thermal Receipts** (Cited from [TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md](file:///F:/tebyan/TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md) §12):
  - Fast attendance recording via webcam QR scanner / physical USB barcode scanner.
  - Printable student membership cards with QR tokens and Code128 barcodes.
  - Monthly subscription and per-session fee collection, discount management.
  - USB thermal receipt printing (ESC/POS) for payments.
  - Automated WhatsApp message generation for parent notifications.

### Provisional Product Roadmap / Planned Capability Areas (Cited from `2026-09-17-tibyan-design.md`):
The following capability areas represent planned product features. Their exact phase numbering and release boundaries are provisional and will be formalized in dedicated implementation plans prior to execution:
- **Curriculum Hierarchy & Mathematics Engine:**
  - Long-term curriculum taxonomy:
    $$\text{Academic System} \to \text{Grade} \to \text{Language Track} \to \text{Math Branch} \to \text{Unit/Chapter} \to \text{Lesson} \to \text{Concept} \to \text{Skill} \to \text{Questions}$$
  - LaTeX mathematical notation rendering, geometric diagram generation, and formula validation.
- **Question Bank & Exam Assembly Engine:**
  - Question taxonomy, difficulty rating, cognitive levels.
  - Algorithmic exam generation with multiple model versions (A/B/C/D) and answer keys.
  - Print-first layout engine with WYSIWYG preview and direct PDF export.
- **Optical Exam Grading & Student Weakness Analytics:**
  - Optical bubble-sheet grading and photographed student paper correction.
  - Diagnostic student weakness tracking linked directly to curriculum skills.

### Approved Long-Term Architecture Phases:
- **Phase 6 — API-Based AI Assistant (External Cloud AI Only):**
  - **External API-based AI assistant ONLY (e.g. Gemini API).**
  - **EXPLICIT RULE: NO LOCAL AI MODEL WILL EVER BE ADDED.**
  - Safe tool invocations with `Preview -> Confirm -> Execute -> Audit`.
- **Phase 7 — Local-Area Network (LAN) Companion App:**
  - React Native / Expo companion app connecting over the teacher's local Wi-Fi / hotspot.
  - Zero cloud dependency; direct peer-to-peer LAN communication with the Windows desktop host.

---

## 25. Non-Negotiable Regression Rules

Under no circumstances may any future modification violate these invariants:

1. **Rescheduled Occurrence Idempotency:** Rescheduling updates `effective_date` and `effective_start_time` while preserving the immutable `occurrence_key`. The 28-day materializer must never recreate a duplicate session for the original recurring slot.
2. **Enrollment-Scoped Payment Independence:** Overrides live on `GroupEnrollment`. A student enrolled in multiple groups must maintain independent pricing terms per group.
3. **SYSTEM Actor Audit Logging:** Background automated tasks (backups, rolling schedule extensions) must log audit records with `actorType: 'SYSTEM'`, `actorUserId: null`, and a required descriptive `actorNameSnapshot` (e.g. `'Automated Backup Engine'`).
4. **Atomic Mutation & Audit Rollback:** Synchronous SQLite mutations and their corresponding audit entries must be executed in the same transaction. An audit failure must abort the business mutation.
5. **Exact 28-Day Horizon:** Production session materialization evaluates $[D, D + 27]$ inclusive.
6. **No Renderer Database/Filesystem Access:** The renderer must never import `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path`.
7. **No Raw IPC Exposure:** The renderer must communicate exclusively through `window.tibyan`. No `ipcRenderer` or wildcard handlers.
8. **No Renderer Authority Over Roles/Permissions:** The Main process authenticated session is authoritative.
9. **Exact Official PNG Hash:** The official logo at `packages/design-system/src/assets/tibyan-official-logo.png` must match SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.
10. **NO LOCAL AI MODEL:** Local-first refers to SQLite storage and desktop execution, never an offline LLM.
11. **Attendance Atomic Persistence & Audit:** Attendance record upserts and session completion must atomically insert audit log entries (`ATTENDANCE_RECORDED`, `ATTENDANCE_UPDATED`, `SESSION_COMPLETED`) in the academic database transaction.
12. **Attendance Authorization Gate:** IPC and Core service methods for attendance must strictly check authenticated session and required permissions (`ATTENDANCE_READ` or `ATTENDANCE_RECORD`).

---

## 26. Workflow for the Next AI

When resuming development:

1. **Read this Document First:** Read `TIBYAN_AI_HANDOFF.md` completely.
2. **Read Approved v2.1 Plan:** Cross-reference [TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md](file:///F:/tebyan/TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md).
3. **Inspect Target Source Files:** Inspect the actual code files for the upcoming task before proposing changes.
4. **Formulate Implementation Plan:** Create an implementation plan detailing files to create/modify, dependencies, and verification steps.
5. **Execute ONE Task at a Time:** Build only the scoped task. Do not jump ahead.
6. **Run the Full Regression Suite:** Run `pnpm -r test` and `pnpm -r typecheck` to guarantee zero regressions.
7. **Produce Detailed Walkthrough:** Document changes, test results, and status.
8. **Stop and Await User Approval:** Stop after completing the task. Do not automatically proceed to the next task.
9. **Report Discrepancies:** If this handoff document conflicts with the actual source code or latest migrations, report the discrepancy to the user before altering architecture.
