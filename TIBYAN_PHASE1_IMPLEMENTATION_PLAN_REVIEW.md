# تِبيان (Tibyan) — Phase 1: Foundation & Desktop Core
## Architectural Review and Revised Implementation Plan (v2.1 — Final Alignment)

> **Document Type:** Master Implementation Plan & Architectural Review  
> **Revision:** 2.1 (Final Architecture Alignment)  
> **Status:** Awaiting Approval Before Execution  
> **Project:** تِبيان (Tibyan) — مساعد المدرس الذكي  
> **Platform:** Windows-First Local Desktop (Electron + React + TypeScript + SQLite)  
> **Target Output:** `F:\tebyan\TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md`  

---

## 1. Executive Summary & Architectural Vision

**تِبيان (Tibyan)** is a **Teacher Operating System** crafted specifically for independent mathematics educators teaching grades 1 Prep through 3 Secondary across both General Egyptian and Egyptian Baccalaureate educational systems, covering Arabic and English/Math-Language tracks.

Tibyan is fundamentally **not** a school ERP, nor is it a retail POS/cashier software. Its UX balances **70% high-focus productivity application** (reminiscent of Linear, Notion, and Apple desktop tools) with **30% educational domain intelligence**. 

Phase 1 establishes the foundational infrastructure of this ecosystem. It is **explicitly a foundation release** and does not constitute the complete usable Tibyan V1. Phase 1 delivers:
1. A **local-first desktop shell** running on Windows using Electron, React, and TypeScript.
2. A **two-database SQLite architecture** using `better-sqlite3`:
   - A persistent global system database: `tibyan-system.sqlite` (stores users, assistant accounts, permissions, global app settings, theme preferences, academic-year registry, and multi-year backup records).
   - An isolated academic-year database per year: `tibyan-<YYYY-YYYY>.sqlite` (stores students, student notes, groups, enrollments with per-group payment overrides, recurring weekly schedules, and concrete session instances).
3. A **secure multi-layered architecture** where renderer code never touches the filesystem or database directly, communicating strictly over typed, schema-validated IPC channels.
4. A **domain core (`@tibyan/core`)** containing 100% of business logic, validations, and rules. This core is decoupled from Electron IPC, guaranteeing direct reuse when local-area mobile connectivity (Phase 7) and local AI tool invocation (Phase 6) are introduced.
5. An **authentic Arabic RTL and English LTR interface** driven by the exact official Tibyan branding (petrol teal `#0B3D3D`, muted luxury gold `#C59B27`, and calm slate neutrals), complete with Light and Dark themes and self-hosted offline fonts (`Cairo`, `Inter`, `KaTeX`).
6. **Local authentication and granular permissions** distinguishing Teacher/Owner from Assistants with a fixed 4-digit PIN, scrypt hashing, 5-attempt brute-force cooldown (30 seconds), and append-only audit logging enforced by SQLite database triggers supporting both `USER` and `SYSTEM` actors.
7. Complete **Student & Group management**, **enrollment-scoped payment inheritance**, re-enrollment history semantics, recurring weekly schedules, and **idempotent 4-week rolling session generation with stable occurrence identity** that strictly prevents replacement sessions from being created for rescheduled slots.
8. A **local automated weekly backup engine (`BackupService`)** utilizing native SQLite online backup APIs that backs up the system DB and all registered academic-year databases and media, with retention management and restore verification.
9. A **live Today Dashboard** powered exclusively by local SQLite queries using effective session dates and times.

---

## 2. Review Section: Final Architectural Alignments (v2.1)

Below is the summary of the final architectural adjustments incorporated into Plan v2.1:

| # | Topic | Prior Formulation | Corrected Formulation (Plan v2.1) | Architectural Rationale & Guarantees |
|---|---|---|---|---|
| **1** | **Stable Session Occurrence Identity** | Unique constraint on `(group_id, session_date, start_time)`. | **Immutable occurrence identity: `occurrence_key` = `${schedule_id}_${scheduled_date}` with immutable `scheduled_date` & `scheduled_start_time`, separate from mutable `effective_date` & `effective_start_time`.** | Rescheduling changes `effective_date` and `effective_start_time`. Because `scheduled_date` and `schedule_id` remain unchanged, the rolling materializer recognizes the occurrence as already materialized and **never recreates a duplicate replacement session for the original recurring slot**. |
| **2** | **Payment Override Scope** | Payment overrides placed on `Student`. | **Move `paymentTypeOverride` and `paymentAmountOverride` to `GroupEnrollment`.** | A student enrolled in multiple groups (e.g. standard class vs specialized intensive group) must have independent pricing terms per group. Null enrollment overrides inherit that group's defaults. |
| **3** | **System-Generated Audit Events** | Required authenticated `actor_user_id`. | **Add `actor_type` (`USER` \| `SYSTEM`); allow nullable `actor_user_id` when `actor_type = 'SYSTEM'`.** | Background automated backups, health checks, and system tasks log audit events legitimately without forging or requiring a human user ID. |
| **4** | **Atomic Mutation & Audit Logging** | Audit recorded separately. | **Atomic execution in the same SQLite transaction (`db.transaction`).** | If an audit insert fails (e.g. trigger violation), the business mutation rolls back automatically. If business mutation fails, no orphaned audit record remains. |
| **5** | **Egyptian Baccalaureate Terminology** | Generic/French Baccalaureate mentions. | **Standardize exclusively on the Egyptian Baccalaureate System (`EGYPTIAN_BACCALAUREATE`).** | Reflects the specific Egyptian national system (نظام البكالوريا المصرية). Modeling `EducationSystem` independently from `GradeLevel` allows extensible rules without hardcoding temporary combinations. |
| **6** | **Backup Scope** | Backed up active year DB only. | **Weekly backup encompasses `tibyan-system.sqlite`, ALL registered academic-year DBs, and their managed media.** | Prevents data loss for historical academic years and ensures full system recoverability on a single Windows machine. |

---

## 3. Database Architecture: System DB vs. Academic Year DB

### 3.1 Persistent Global Database: `tibyan-system.sqlite`
Located at: `%APPDATA%\Tibyan\data\system\tibyan-system.sqlite`

Contains application-wide data that persists across all academic years:
1. **Users & Authentication:** Teacher/Owner and Assistants.
2. **Permissions & User Grants:** Granular operational capabilities.
3. **Academic Year Registry:** Registered academic years (`id`, `name`, `db_filename`, `is_active`, `is_archived`).
4. **Global Application Settings:** Theme preferences (`light` | `dark` | `system`), window state, UI options.
5. **System Audit Log:** Append-only log of user creation, role changes, login locks, and backup events, supporting `USER` and `SYSTEM` actors.
6. **Backup Records:** Metadata for local backup generations.

### 3.2 Year-Scoped Database: `tibyan-<YYYY-YYYY>.sqlite`
Located at: `%APPDATA%\Tibyan\data\academic-years\tibyan-<YYYY-YYYY>.sqlite`

Contains academic data scoped exclusively to that specific academic year:
1. **Students:** Student identity, code, photo path, education system, grade level, track, guardian phone, status (`ACTIVE` | `INACTIVE`), QR token, barcode.
2. **Student Notes:** Cumulative academic and behavioral notes with author snapshot.
3. **Groups:** Classes with education system, grade level, track, optional focus math branch, default payment terms.
4. **Group Enrollments:** Association with `enrolled_at`, `left_at`, `status` (`ACTIVE` | `ENDED`), and group-specific `payment_type_override` and `payment_amount_override`.
5. **Group Schedules:** Recurring weekly schedule templates (`weekday`, `start_time`, `duration_minutes`).
6. **Sessions:** Concrete class instances with stable immutable occurrence identity (`occurrence_key`, `schedule_id`, `scheduled_date`, `scheduled_start_time`), mutable execution slot (`effective_date`, `effective_start_time`, `duration_minutes`), status (`SCHEDULED`, `COMPLETED`, `RESCHEDULED`, `CANCELLED_BY_TEACHER`), and reschedule metadata.
7. **Academic Audit Log:** Append-only log of student, group, enrollment, and session mutations, supporting `USER` and `SYSTEM` actors.

### 3.3 Database Triggers: Append-Only Audit Enforcement
Both databases enforce audit log immutability via SQLite triggers:
```sql
-- System Audit Log Triggers
CREATE TRIGGER IF NOT EXISTS trg_system_audit_no_update
BEFORE UPDATE ON system_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit log records are immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_system_audit_no_delete
BEFORE DELETE ON system_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit log records are immutable and cannot be deleted');
END;

-- Academic Audit Log Triggers
CREATE TRIGGER IF NOT EXISTS trg_academic_audit_no_update
BEFORE UPDATE ON academic_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit log records are immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_academic_audit_no_delete
BEFORE DELETE ON academic_audit_log
BEGIN
  SELECT RAISE(ABORT, 'Audit log records are immutable and cannot be deleted');
END;
```

---

## 4. Single Source of Truth: Drizzle Schema Definitions

### 4.1 System Schema (`packages/db/src/schema/system.schema.ts`)
```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUIDv4
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  salt: text('salt').notNull(),
  role: text('role', { enum: ['OWNER', 'ASSISTANT'] }).notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'), // ISO8601 UTC timestamp or null
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const permissions = sqliteTable('permissions', {
  code: text('code').primaryKey(),
  nameAr: text('name_ar').notNull(),
  descriptionAr: text('description_ar').notNull(),
  category: text('category').notNull(),
});

export const userPermissions = sqliteTable('user_permissions', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionCode: text('permission_code').notNull().references(() => permissions.code, { onDelete: 'cascade' }),
  grantedAt: text('granted_at').notNull(),
}, (t) => ({
  pk: { columns: [t.userId, t.permissionCode] }
}));

export const academicYears = sqliteTable('academic_years', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g. "2026-2027"
  dbFilename: text('db_filename').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const globalSettings = sqliteTable('global_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const systemAuditLog = sqliteTable('system_audit_log', {
  id: text('id').primaryKey(),
  actorType: text('actor_type', { enum: ['USER', 'SYSTEM'] }).notNull().default('USER'),
  actorUserId: text('actor_user_id'), // Nullable when actorType is SYSTEM
  actorNameSnapshot: text('actor_name_snapshot').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
});

export const backupRecords = sqliteTable('backup_records', {
  id: text('id').primaryKey(),
  backupPath: text('backup_path').notNull(),
  backupDate: text('backup_date').notNull(),
  status: text('status', { enum: ['SUCCESS', 'FAILED'] }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  academicYearsIncludedJson: text('academic_years_included_json').notNull(),
  createdAt: text('created_at').notNull(),
});
```

### 4.2 Academic Schema (`packages/db/src/schema/academic.schema.ts`)
```ts
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  studentCode: text('student_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  photoPath: text('photo_path'),
  educationSystem: text('education_system', { enum: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'] }).notNull(),
  gradeLevel: text('grade_level', { enum: ['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3'] }).notNull(),
  languageTrack: text('language_track', { enum: ['ARABIC', 'LANG_ENGLISH'] }).notNull(),
  guardianPhone: text('guardian_phone').notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  qrToken: text('qr_token').notNull().unique(),
  barcodeValue: text('barcode_value').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const studentNotes = sqliteTable('student_notes', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  authorUserId: text('author_user_id'),
  authorNameSnapshot: text('author_name_snapshot').notNull(),
  noteText: text('note_text').notNull(),
  tag: text('tag', { enum: ['GENERAL', 'ACADEMIC_WEAKNESS', 'EXCELLENT', 'BEHAVIOR', 'NEEDS_FOLLOW_UP'] }).notNull().default('GENERAL'),
  createdAt: text('created_at').notNull(),
});

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  educationSystem: text('education_system', { enum: ['GENERAL', 'EGYPTIAN_BACCALAUREATE'] }).notNull(),
  gradeLevel: text('grade_level', { enum: ['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3'] }).notNull(),
  languageTrack: text('language_track', { enum: ['ARABIC', 'LANG_ENGLISH'] }).notNull(),
  focusMathBranch: text('focus_math_branch', { enum: ['GENERAL_MATH', 'ALGEBRA', 'GEOMETRY', 'TRIGONOMETRY', 'CALCULUS', 'STATISTICS', 'APPLIED_MATH'] }),
  defaultPaymentType: text('default_payment_type', { enum: ['MONTHLY', 'PER_SESSION'] }).notNull(),
  defaultPaymentAmount: real('default_payment_amount').notNull(),
  status: text('status', { enum: ['ACTIVE', 'ARCHIVED'] }).notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const groupEnrollments = sqliteTable('group_enrollments', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  enrolledAt: text('enrolled_at').notNull(),
  leftAt: text('left_at'),
  status: text('status', { enum: ['ACTIVE', 'ENDED'] }).notNull().default('ACTIVE'),
  paymentTypeOverride: text('payment_type_override', { enum: ['MONTHLY', 'PER_SESSION'] }),
  paymentAmountOverride: real('payment_amount_override'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  // Partial unique index: only one active enrollment per student-group pair, allows re-enrollment history
  activeEnrollmentIdx: uniqueIndex('idx_group_enrollments_active')
    .on(t.groupId, t.studentId)
    .where(sql`status = 'ACTIVE'`),
}));

export const groupSchedules = sqliteTable('group_schedules', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(), // 0=Sunday, 6=Saturday
  startTime: text('start_time').notNull(), // 'HH:mm'
  durationMinutes: integer('duration_minutes').notNull().default(120),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  scheduleId: text('schedule_id').references(() => groupSchedules.id, { onDelete: 'set null' }),
  // Immutable occurrence identity
  occurrenceKey: text('occurrence_key').notNull().unique(), // e.g. `${scheduleId}_${scheduledDate}` or UUID for ad-hoc
  scheduledDate: text('scheduled_date').notNull(),          // Immutable original date
  scheduledStartTime: text('scheduled_start_time').notNull(),// Immutable original time
  // Mutable effective execution slot
  effectiveDate: text('effective_date').notNull(),          // Used for Today Dashboard queries
  effectiveStartTime: text('effective_start_time').notNull(),// Used for Today Dashboard ordering
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status', { enum: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED_BY_TEACHER'] }).notNull().default('SCHEDULED'),
  rescheduleReason: text('reschedule_reason'),
  rescheduledAt: text('rescheduled_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  // Unique occurrence constraint prevents rolling generator from recreating rescheduled sessions
  occurrenceUniqueIdx: uniqueIndex('idx_sessions_occurrence').on(t.occurrenceKey),
  effectiveDateIdx: uniqueIndex('idx_sessions_effective_slot').on(t.groupId, t.effectiveDate, t.effectiveStartTime),
}));

export const academicAuditLog = sqliteTable('academic_audit_log', {
  id: text('id').primaryKey(),
  actorType: text('actor_type', { enum: ['USER', 'SYSTEM'] }).notNull().default('USER'),
  actorUserId: text('actor_user_id'), // Nullable when actorType is SYSTEM
  actorNameSnapshot: text('actor_name_snapshot').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
});
```

---

## 5. Domain Logic: Occurrence Identity, Payment Inheritance & Transactions

### 5.1 Stable Session Occurrence Identity & Rescheduling Defense

#### Problem Solved:
In naive scheduling systems, sessions are queried by their current execution date. If a Thursday session is rescheduled to Saturday, the Thursday slot becomes "vacant" on the calendar, causing the next run of the 4-week materializer to regenerate Thursday as a duplicate session!

#### The Tibyan Solution:
1. Every generated recurring session has an **immutable occurrence key**:
   $$\text{occurrenceKey} = \text{scheduleId} + \text{"\_"} + \text{scheduledDate}$$
2. The materializer operates as follows:
   - For every day in the rolling horizon $[D, D + 28]$ matching a recurring slot:
   - Compute the deterministic $\text{targetOccurrenceKey}$.
   - Check if a session already exists with that `occurrenceKey`:
     - If it exists (whether status is `SCHEDULED`, `RESCHEDULED`, `COMPLETED`, or `CANCELLED_BY_TEACHER`), **do nothing**. It is already materialized.
     - If it does not exist, insert the new `SCHEDULED` session with:
       - `scheduledDate = targetDate`, `scheduledStartTime = slot.startTime`
       - `effectiveDate = targetDate`, `effectiveStartTime = slot.startTime`
       - `occurrenceKey = targetOccurrenceKey`
3. When rescheduling:
   - `occurrenceKey`, `scheduledDate`, and `scheduledStartTime` remain **completely untouched**.
   - `effectiveDate` and `effectiveStartTime` are updated to the new date/time.
   - `status` is set to `'RESCHEDULED'`.
4. Today Dashboard queries strictly filter by `effectiveDate = :today`.

#### Mandatory Automated Regression Test:
> Generate 4 weeks of sessions for Group A (Sundays). Select the first Sunday session, reschedule it to Tuesday. Re-execute the 4-week materializer. Assert:
> 1. Total session count remains exactly the same.
> 2. No replacement session was created for the original Sunday slot.
> 3. The rescheduled session's `scheduledDate` remains Sunday while `effectiveDate` is Tuesday.

### 5.2 Enrollment-Scoped Payment Inheritance

#### Business Rule:
Payment terms are strictly evaluated at the **Enrollment** level, not globally on the Student:
```ts
export interface EffectivePaymentTerms {
  paymentType: 'MONTHLY' | 'PER_SESSION';
  amount: number;
  isOverridden: boolean;
}

export function calculateEffectivePayment(
  group: { defaultPaymentType: 'MONTHLY' | 'PER_SESSION'; defaultPaymentAmount: number },
  enrollment: { paymentTypeOverride: 'MONTHLY' | 'PER_SESSION' | null; paymentAmountOverride: number | null }
): EffectivePaymentTerms {
  return {
    paymentType: enrollment.paymentTypeOverride ?? group.defaultPaymentType,
    amount: enrollment.paymentAmountOverride ?? group.defaultPaymentAmount,
    isOverridden: enrollment.paymentTypeOverride !== null || enrollment.paymentAmountOverride !== null,
  };
}
```

#### Mandatory Automated Regression Test:
> Enroll Student 1 in Group A (default: 400 EGP) with null overrides. Enroll Student 1 in Group B (default: 500 EGP) with override 600 EGP. Assert that Student 1's effective fee in Group A is 400 EGP, while in Group B it is 600 EGP.

### 5.3 Atomic Business Mutations & Audit Rollback

#### Business Rule:
In `better-sqlite3`, any mutation and its audit log record targeting the same database must execute synchronously inside a single `db.transaction`:
```ts
export function runInAuditTransaction<T>(
  db: Database.Database,
  mutationFn: () => { result: T; auditEntry: AuditEntryInput }
): T {
  return db.transaction(() => {
    const { result, auditEntry } = mutationFn();
    insertAuditLog(db, auditEntry);
    return result;
  })();
}
```
If `insertAuditLog` fails (for example, if an audit trigger or constraint is violated), the database rolls back the mutation completely. Conversely, if `mutationFn` throws, no audit entry is committed.

#### Mandatory Automated Regression Test:
> Execute a student creation wrapped in `runInAuditTransaction`. Force an audit trigger abort. Assert that:
> 1. The transaction throws.
> 2. No new student row exists in the `students` table.
> 3. No new entry exists in the `academic_audit_log` table.

### 5.4 System-Generated Audit Events

#### Business Rule:
Audit entries support both human user actors and automated background system actors:
- When a user performs an action: `actorType = 'USER'`, `actorUserId = session.userId`, `actorNameSnapshot = session.fullName`.
- When an automated job executes (e.g., weekly backup, horizon extension): `actorType = 'SYSTEM'`, `actorUserId = null`, `actorNameSnapshot = 'System Engine'`.

#### Mandatory Automated Regression Test:
> Insert an audit entry with `actorType: 'SYSTEM'`, `actorUserId: null`, and `actorNameSnapshot: 'BackupEngine'`. Assert that the record is written successfully and can be queried without foreign key errors.

---

## 6. Multi-Year Automated Backup System (`BackupService`)

### 6.1 Comprehensive Multi-Year Scope
The automated weekly backup covers:
1. `tibyan-system.sqlite` (global users, permissions, registry, settings).
2. **ALL registered academic-year databases** (both active and inactive years) discovered via `academic_years` table.
3. Managed student media directories for all registered years.

### 6.2 Archival Backups
When an academic year is marked `isArchived = true`, the system creates an immediate, dedicated archival backup bundle:
`%APPDATA%\Tibyan\backups\archive-<year>-<timestamp>\`
This archival bundle is verified via `PRAGMA integrity_check;` and protected from rolling retention pruning.

### 6.3 Backup Retention & Verification
- Automated weekly backups maintain a rolling 4-generation retention window.
- Every backup file is opened and validated with `PRAGMA integrity_check;` before being marked `SUCCESS`.
- Failed backups trigger a notification in the Settings UI and log an audit security event.

---

## 7. Electron Native Module Packaging (`better-sqlite3`)

1. **Root `package.json` Rebuild Script:**
   ```json
   {
     "scripts": {
       "postinstall": "electron-builder install-app-deps"
     }
   }
   ```
2. **`apps/desktop/electron-builder.json5`:**
   ```json5
   {
     "appId": "com.tibyan.desktop",
     "productName": "تِبيان",
     "asar": true,
     "asarUnpack": ["**/*.node"],
     "npmRebuild": true,
     "win": {
       "target": "nsis",
       "icon": "resources/icon.ico"
     }
   }
   ```
3. **Production Verification Requirement:**
   Testing in Task 17 must run `pnpm --filter @tibyan/desktop build:win` and execute Playwright tests against the resulting packaged executable, validating that `better-sqlite3` native binaries unpack and execute in production ASAR mode.

---

## 8. Offline Typography & Exact Brand Asset Preservation

- **Typography:** 100% bundled offline via `@fontsource/cairo` (Arabic UI), `@fontsource/inter` (Latin UI / numbers), and bundled KaTeX fonts for mathematics. Zero external Google Font calls.
- **Official Logo:** The supplied PNG file (`ChatGPT Image Sep 17, 2026, 02_47_35 AM.png`) is preserved bit-for-bit as `packages/design-system/src/assets/tibyan-official-logo.png`. No AI re-generation or auto-tracing.

---

## 9. Monorepo Directory Structure

```text
F:\tebyan\
├─ .agents\
├─ .gitignore
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ vitest.workspace.ts
├─ README.md
├─ 2026-09-17-tibyan-design.md
├─ 2026-09-17-tibyan-phase1-foundation.md
├─ ChatGPT Image Sep 17, 2026, 02_47_35 AM.png
├─ TIBYAN_PHASE1_IMPLEMENTATION_PLAN_REVIEW.md
│
├─ packages\
│  ├─ contracts\                          # DTOs, Enums, IPC Channels, Zod Schemas
│  │  ├─ src\
│  │  │  ├─ enums\
│  │  │  │  ├─ academic.ts                # EducationSystem (GENERAL, EGYPTIAN_BACCALAUREATE), GradeLevel, Track, Branch
│  │  │  │  ├─ auth.ts                    # UserRole, PermissionCode, ActorType (USER, SYSTEM)
│  │  │  │  ├─ payment.ts                 # PaymentType
│  │  │  │  ├─ student.ts                 # StudentStatus, NoteTag
│  │  │  │  └─ session.ts                 # SessionStatus, Weekday
│  │  │  ├─ models\
│  │  │  │  ├─ auth.dto.ts
│  │  │  │  ├─ student.dto.ts
│  │  │  │  ├─ group.dto.ts
│  │  │  │  ├─ enrollment.dto.ts          # Payment overrides live here
│  │  │  │  ├─ session.dto.ts             # Stable occurrence key & effective slot
│  │  │  │  ├─ audit.dto.ts               # ActorType, nullable actorUserId
│  │  │  │  ├─ backup.dto.ts
│  │  │  │  └─ dashboard.dto.ts
│  │  │  ├─ ipc\
│  │  │  │  ├─ channels.ts
│  │  │  │  └─ api.ts
│  │  │  └─ index.ts
│  │
│  ├─ db\                                 # Dual Drizzle Schemas, Migrations, Repositories
│  │  ├─ src\
│  │  │  ├─ schema\
│  │  │  │  ├─ system.schema.ts          # Users, Permissions, AcademicYears, SystemAudit
│  │  │  │  └─ academic.schema.ts        # Students, Groups, Enrollments, Sessions, AcademicAudit
│  │  │  ├─ migrations\
│  │  │  │  ├─ system\
│  │  │  │  ├─ academic\
│  │  │  │  └─ migrator.ts
│  │  │  ├─ connection.ts                 # Dual SQLite connection manager
│  │  │  ├─ repositories\
│  │  │  │  ├─ system\
│  │  │  │  │  ├─ user.repository.ts
│  │  │  │  │  ├─ academic-year.repository.ts
│  │  │  │  │  └─ system-audit.repository.ts
│  │  │  │  └─ academic\
│  │  │  │     ├─ student.repository.ts
│  │  │  │     ├─ group.repository.ts
│  │  │  │     ├─ enrollment.repository.ts
│  │  │  │     ├─ session.repository.ts
│  │  │  │     └─ academic-audit.repository.ts
│  │  │  ├─ test-db.ts                    # In-memory dual DB test harness
│  │  │  └─ index.ts
│  │
│  ├─ core\                               # Pure Domain Services
│  │  ├─ src\
│  │  │  ├─ common\
│  │  │  │  └─ transaction.ts             # Atomic mutation + audit transaction helper
│  │  │  ├─ auth\
│  │  │  │  ├─ pin.service.ts             # scrypt hashing + 5-attempt cooldown
│  │  │  │  ├─ permissions.ts
│  │  │  │  └─ auth.service.ts
│  │  │  ├─ students\
│  │  │  │  ├─ student.service.ts
│  │  │  │  └─ photo.service.ts
│  │  │  ├─ groups\
│  │  │  │  ├─ group.service.ts
│  │  │  │  ├─ enrollment.service.ts      # Enrollment-scoped payment terms
│  │  │  │  ├─ payment-inheritance.ts
│  │  │  │  └─ session.service.ts         # OccurrenceKey materialization & rescheduling
│  │  │  ├─ dashboard\
│  │  │  │  └─ dashboard.service.ts       # Queries effectiveDate
│  │  │  ├─ backup\
│  │  │  │  └─ backup.service.ts          # Multi-year online backup & verify
│  │  │  ├─ audit\
│  │  │  │  └─ audit.service.ts           # Handles USER & SYSTEM actors
│  │  │  └─ index.ts
│  │
│  └─ design-system\                      # UI Primitives, Tokens, Official Logo
│     ├─ src\
│     │  ├─ tokens\
│     │  │  ├─ colors.css
│     │  │  ├─ typography.css
│     │  │  └─ spacing.css
│     │  ├─ assets\
│     │  │  └─ tibyan-official-logo.png   # Preserved official PNG
│     │  ├─ providers\
│     │  │  ├─ ThemeProvider.tsx
│     │  │  └─ DirectionProvider.tsx
│     │  ├─ components\
│     │  │  ├─ Button\
│     │  │  ├─ Input\
│     │  │  ├─ Select\
│     │  │  ├─ Modal\
│     │  │  ├─ Card\
│     │  │  ├─ Badge\
│     │  │  ├─ PinPad\                    # 4-digit numeric pad with cooldown timer
│     │  │  └─ Table\
│     │  └─ index.ts
│
└─ apps\
   └─ desktop\                            # Electron Shell & React UI
      ├─ electron\
      │  ├─ main.ts
      │  ├─ preload.ts                    # Typed contextBridge
      │  ├─ security.ts
      │  └─ ipc\
      │     ├─ auth.ipc.ts
      │     ├─ students.ipc.ts
      │     ├─ groups.ipc.ts
      │     ├─ sessions.ipc.ts
      │     ├─ dashboard.ipc.ts
      │     ├─ backup.ipc.ts
      │     └─ system.ipc.ts
      ├─ src\
      │  ├─ main.tsx
      │  ├─ app\
      │  │  ├─ App.tsx
      │  │  ├─ router.tsx
      │  │  └─ providers.tsx
      │  ├─ components\
      │  │  └─ layout\
      │  │     ├─ AppShell.tsx
      │  │     ├─ Sidebar.tsx
      │  │     └─ Topbar.tsx
      │  ├─ features\
      │  │  ├─ auth\
      │  │  │  ├─ LoginScreen.tsx
      │  │  │  └─ auth.state.ts           # Zustand store
      │  │  ├─ onboarding\
      │  │  │  └─ FirstRunWizard.tsx
      │  │  ├─ dashboard\
      │  │  │  ├─ TodayPage.tsx
      │  │  │  └─ ClassScheduleCard.tsx
      │  │  ├─ students\
      │  │  │  ├─ StudentsPage.tsx
      │  │  │  ├─ StudentCreateModal.tsx
      │  │  │  └─ StudentProfilePage.tsx
      │  │  ├─ groups\
      │  │  │  ├─ GroupsPage.tsx
      │  │  │  ├─ GroupCreateModal.tsx
      │  │  │  ├─ GroupDetailsPage.tsx
      │  │  │  ├─ EnrollmentModal.tsx     # Handles payment overrides per group
      │  │  │  └─ RescheduleSessionModal.tsx
      │  │  └─ settings\
      │  │     ├─ SettingsPage.tsx
      │  │     ├─ AcademicYearManager.tsx
      │  │     ├─ UserManagementTab.tsx
      │  │     └─ BackupSettingsTab.tsx
      │  └─ styles\
      │     └─ index.css                  # Tailwind + offline fonts + tokens
      └─ tests\
         └─ smoke.spec.ts                 # Playwright Electron smoke test
```

---

## 10. Step-by-Step Task Breakdown & Git Checkpoints

---

### Task 1: Monorepo Foundation, Build Tooling & Offline Dependencies
- **Goal:** Configure pnpm workspace, TypeScript project references, Vitest workspace, Tailwind CSS, offline fonts (`@fontsource/cairo`, `@fontsource/inter`), and native rebuild scripts.
- **Files to Create:**
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `vitest.workspace.ts`
  - `.gitignore`
  - Package descriptors for all 5 workspace projects.
- **Verification:** `pnpm install` and `pnpm -r typecheck`.
- **Git Commit:** `git commit -m "chore: scaffold Tibyan monorepo workspace and offline dependencies"`

---

### Task 2: Core Contracts, Enums & Domain Interfaces
- **Goal:** Author domain enums (`EducationSystem` including `EGYPTIAN_BACCALAUREATE`, `GradeLevel`, `LanguageTrack`, `MathBranch`, `PaymentType`, `UserRole`, `PermissionCode`, `ActorType`), DTOs with enrollment-scoped payment overrides, and typed IPC channel contracts.
- **Files to Create:**
  - `packages/contracts/src/enums/academic.ts`
  - `packages/contracts/src/enums/auth.ts`
  - `packages/contracts/src/enums/payment.ts`
  - `packages/contracts/src/enums/student.ts`
  - `packages/contracts/src/enums/session.ts`
  - `packages/contracts/src/models/auth.dto.ts`
  - `packages/contracts/src/models/student.dto.ts`
  - `packages/contracts/src/models/group.dto.ts`
  - `packages/contracts/src/models/enrollment.dto.ts`
  - `packages/contracts/src/models/session.dto.ts`
  - `packages/contracts/src/models/audit.dto.ts`
  - `packages/contracts/src/models/backup.dto.ts`
  - `packages/contracts/src/models/dashboard.dto.ts`
  - `packages/contracts/src/ipc/channels.ts`
  - `packages/contracts/src/ipc/api.ts`
  - `packages/contracts/src/index.ts`
- **Verification:** Unit tests asserting Zod validation on 4-digit PIN, Egyptian phone format, and ISO dates.
- **Git Commit:** `git commit -m "feat(contracts): define core domain enums, models, and IPC contracts"`

---

### Task 3: Dual Database Architecture, Drizzle Schemas & Immutability Triggers
- **Goal:** Implement Drizzle schema definitions for `tibyan-system.sqlite` and `tibyan-<year>.sqlite`, configure `drizzle-kit` migration generation, SQLite WAL pragmas, and append-only database triggers.
- **Files to Create:**
  - `packages/db/src/schema/system.schema.ts`
  - `packages/db/src/schema/academic.schema.ts`
  - `packages/db/src/connection.ts`
  - `packages/db/src/migrations/system/`
  - `packages/db/src/migrations/academic/`
  - `packages/db/src/migrations/migrator.ts`
  - Repositories in `packages/db/src/repositories/system/` and `packages/db/src/repositories/academic/`.
  - `packages/db/src/test-db.ts`
- **Verification:** Vitest suite asserting:
  1. System DB and Academic DB are distinct SQLite files.
  2. SQL `UPDATE` or `DELETE` against `system_audit_log` or `academic_audit_log` aborts with SQLite trigger error.
  3. Re-enrolling a student who has `status = 'ENDED'` succeeds, while a duplicate `ACTIVE` enrollment fails.
- **Git Commit:** `git commit -m "feat(db): implement dual SQLite architecture, Drizzle schemas, and audit triggers"`

---

### Task 4: PIN Cryptography, Brute-Force Cooldown & User Auth Core
- **Goal:** Implement 4-digit PIN authentication using Node `crypto.scrypt`, 5-attempt brute-force cooldown (30 seconds), role permissions, and atomic audit logging in `@tibyan/core`.
- **Files to Create:**
  - `packages/core/src/common/transaction.ts`
  - `packages/core/src/auth/pin.service.ts`
  - `packages/core/src/auth/permissions.ts`
  - `packages/core/src/auth/auth.service.ts`
  - `packages/core/tests/pin.service.test.ts`
  - `packages/core/tests/auth.service.test.ts`
- **Verification:**
  - Entering invalid PIN 5 times sets `lockedUntil` for 30s; subsequent attempts are rejected with `ACCOUNT_LOCKED`.
  - Plaintext PIN is never stored or audited.
  - Regression Test 3: SYSTEM actor audit event inserts successfully without a user ID.
- **Git Commit:** `git commit -m "feat(core): implement 4-digit PIN authentication with brute-force cooldown"`

---

### Task 5: Students Domain Core & Media Storage Service
- **Goal:** Implement student creation with `EducationSystem` and `GradeLevel`, student notes, and app-managed photo storage with atomic audit logging in `@tibyan/core`.
- **Files to Create:**
  - `packages/core/src/students/photo.service.ts`
  - `packages/core/src/students/student.service.ts`
  - `packages/core/tests/student.service.test.ts`
  - `packages/core/tests/photo.service.test.ts`
- **Verification:**
  - Student code `TB-XXXX` generated uniquely.
  - Uploaded photo copied to app-managed media directory under UUID.
  - Regression Test 4: A failed audit insert aborts student creation and rolls back the SQLite transaction completely.
- **Git Commit:** `git commit -m "feat(core): implement student service, photo storage, and atomic audit transactions"`

---

### Task 6: Groups, Enrollment-Scoped Payment Inheritance & Stable Rolling Sessions
- **Goal:** Implement group creation with optional `focusMathBranch`, enrollment-scoped payment terms, re-enrollment history, and the idempotent 4-week rolling session materializer with stable occurrence identity and rescheduling.
- **Files to Create:**
  - `packages/core/src/groups/payment-inheritance.ts`
  - `packages/core/src/groups/group.service.ts`
  - `packages/core/src/groups/enrollment.service.ts`
  - `packages/core/src/groups/session.service.ts`
  - `packages/core/tests/payment-inheritance.test.ts`
  - `packages/core/tests/group.service.test.ts`
  - `packages/core/tests/enrollment.service.test.ts`
  - `packages/core/tests/session.service.test.ts`
- **Verification:**
  - Regression Test 1: Reschedule an occurrence, rerun 28-day materialization, and assert the original slot is **not** recreated.
  - Regression Test 2: One student enrolled in two groups independently inherits or overrides payment terms.
  - Student who left a group can re-enroll later; partial unique index blocks duplicate active enrollments.
- **Git Commit:** `git commit -m "feat(core): implement groups, enrollment payment inheritance, and stable rolling sessions"`

---

### Task 7: Multi-Year Automated Backup Service (`BackupService`)
- **Goal:** Implement `BackupService` backing up `tibyan-system.sqlite`, all registered academic-year databases, and media directories using `better-sqlite3` native online backup APIs (`db.backup(...)`), with rolling 4-week retention and restore integrity checks.
- **Files to Create:**
  - `packages/core/src/backup/backup.service.ts`
  - `packages/core/tests/backup.service.test.ts`
- **Verification:**
  - Online backup creates clean copies of system DB, all registered year DBs, and media.
  - `PRAGMA integrity_check;` passes on all backup copies.
  - System audit event logged with `actorType: 'SYSTEM'`.
- **Git Commit:** `git commit -m "feat(core): implement multi-year SQLite online backup engine and verification"`

---

### Task 8: Today Dashboard Aggregation Service
- **Goal:** Implement the aggregation service for the real-data Today Dashboard in `@tibyan/core` using effective session dates and times.
- **Files to Create:**
  - `packages/core/src/dashboard/dashboard.service.ts`
  - `packages/core/tests/dashboard.service.test.ts`
- **Verification:**
  - Queries return actual sessions for the requested date based on `effectiveDate`, ordered by `effectiveStartTime`.
  - Rescheduled sessions are highlighted with original date/time indicators.
  - Students with `NEEDS_FOLLOW_UP` notes are flagged in `needsAttention`.
- **Git Commit:** `git commit -m "feat(core): implement real-data Today Dashboard service using effective dates"`

---

### Task 9: Design System, Tokens, Offline Fonts & Exact Official Logo
- **Goal:** Build `@tibyan/design-system` with official Tibyan colors, Cairo/Inter offline typography, Light/Dark theme provider, exact official PNG logo, and UI primitives.
- **Files to Create:**
  - `packages/design-system/src/tokens/colors.css`
  - `packages/design-system/src/tokens/typography.css`
  - `packages/design-system/src/assets/tibyan-official-logo.png`
  - `packages/design-system/src/providers/ThemeProvider.tsx`
  - `packages/design-system/src/providers/DirectionProvider.tsx`
  - UI Primitives: Button, Input, Select, Modal, Card, Badge, Table, PinPad.
- **Verification:** RTL direction assertions and Light/Dark class toggling tested via React Testing Library.
- **Git Commit:** `git commit -m "feat(design-system): build theme tokens, offline typography, official logo, and PinPad"`

---

### Task 10: Electron Desktop Shell, Native Packaging & Typed IPC Bridge
- **Goal:** Configure Vite Electron bundler with `better-sqlite3` native dependency rebuild, preload context bridge, and typed IPC dispatchers.
- **Files to Create:**
  - `apps/desktop/vite.config.ts`
  - `apps/desktop/electron-builder.json5`
  - `apps/desktop/electron/main.ts`
  - `apps/desktop/electron/preload.ts`
  - `apps/desktop/electron/security.ts`
  - Typed IPC dispatchers in `apps/desktop/electron/ipc/`.
- **Verification:** Electron launches with context isolation enabled; typed IPC calls invoke `@tibyan/core` cleanly.
- **Git Commit:** `git commit -m "feat(desktop): configure Electron shell, native rebuild, and typed IPC bridge"`

---

### Task 11: Desktop App Shell, RTL Navigation & First-Run Wizard
- **Goal:** Build React desktop shell, RTL sidebar docking on the right with the official logo, topbar with academic year display, and first-run onboarding wizard.
- **Files to Create:**
  - `apps/desktop/src/main.tsx`
  - `apps/desktop/src/app/App.tsx`
  - `apps/desktop/src/app/router.tsx`
  - `apps/desktop/src/app/providers.tsx`
  - `apps/desktop/src/components/layout/AppShell.tsx`
  - `apps/desktop/src/components/layout/Sidebar.tsx`
  - `apps/desktop/src/components/layout/Topbar.tsx`
  - `apps/desktop/src/features/onboarding/FirstRunWizard.tsx`
  - `apps/desktop/src/styles/index.css`
- **Verification:** App opens in RTL; fresh launch displays First-Run Wizard to configure Owner account and initial academic year.
- **Git Commit:** `git commit -m "feat(desktop): implement AppShell, RTL sidebar, and first-run wizard"`

---

### Task 12: 4-Digit PIN Authentication Screen & Session Store
- **Goal:** Implement user selection and 4-digit PIN entry login screen with cooldown countdown display and Zustand session state.
- **Files to Create:**
  - `apps/desktop/src/features/auth/LoginScreen.tsx`
  - `apps/desktop/src/features/auth/UserCard.tsx`
  - `apps/desktop/src/features/auth/auth.state.ts`
  - `apps/desktop/src/hooks/useAuth.ts`
  - `apps/desktop/tests/LoginScreen.test.tsx`
- **Verification:** PIN pad displays 4-digit entry; 5 failed attempts trigger 30-second cooldown timer.
- **Git Commit:** `git commit -m "feat(desktop): build 4-digit PIN login screen with brute-force cooldown UI"`

---

### Task 13: Student Management UI (List, Add/Edit Modal, Profile & Notes)
- **Goal:** Build students search table, add student modal with `EducationSystem` (`GENERAL`, `EGYPTIAN_BACCALAUREATE`) and `GradeLevel` selectors, photo picker, student profile, and notes timeline.
- **Files to Create:**
  - `apps/desktop/src/features/students/StudentsPage.tsx`
  - `apps/desktop/src/features/students/StudentCreateModal.tsx`
  - `apps/desktop/src/features/students/StudentProfilePage.tsx`
  - `apps/desktop/src/features/students/StudentNotesView.tsx`
  - `apps/desktop/src/hooks/useStudents.ts`
- **Verification:** Create General and Egyptian Baccalaureate students; verify photo upload displays immediately and persists across restarts.
- **Git Commit:** `git commit -m "feat(desktop): build student management, profile, notes, and photo UI"`

---

### Task 14: Group Management UI, Enrollment Picker & Reschedule Modal
- **Goal:** Build group listings, group creation modal with weekly recurring slots, group profile, student enrollment picker with enrollment-specific payment overrides, and single-session reschedule modal.
- **Files to Create:**
  - `apps/desktop/src/features/groups/GroupsPage.tsx`
  - `apps/desktop/src/features/groups/GroupCreateModal.tsx`
  - `apps/desktop/src/features/groups/GroupDetailsPage.tsx`
  - `apps/desktop/src/features/groups/EnrollmentModal.tsx`
  - `apps/desktop/src/features/groups/RescheduleSessionModal.tsx`
  - `apps/desktop/src/hooks/useGroups.ts`
- **Verification:** Enroll students with custom fee overrides; reschedule a single session and verify base schedule is untouched.
- **Git Commit:** `git commit -m "feat(desktop): build group management, enrollment picker, and session rescheduling modal"`

---

### Task 15: Real-Data Today Dashboard UI
- **Goal:** Build the central Today Dashboard screen displaying today's scheduled and rescheduled classes using effective dates, quick stats, and students needing follow-up.
- **Files to Create:**
  - `apps/desktop/src/features/dashboard/TodayPage.tsx`
  - `apps/desktop/src/features/dashboard/ClassScheduleCard.tsx`
  - `apps/desktop/src/features/dashboard/NeedsAttentionCard.tsx`
  - `apps/desktop/src/hooks/useDashboard.ts`
- **Verification:** Displays real sessions matching current weekday or rescheduled to today; "ابدأ الحصة" button disabled with Phase 2 tooltip.
- **Git Commit:** `git commit -m "feat(desktop): build real-data Today Dashboard UI"`

---

### Task 16: Settings, Academic-Year Switcher, Assistant Management & Backup Tab
- **Goal:** Implement Settings tabs for Theme preferences, Academic-Year creation and switching, Assistant account permissions, and Backup status/trigger.
- **Files to Create:**
  - `apps/desktop/src/features/settings/SettingsPage.tsx`
  - `apps/desktop/src/features/settings/AcademicYearManager.tsx`
  - `apps/desktop/src/features/settings/UserManagementTab.tsx`
  - `apps/desktop/src/features/settings/BackupSettingsTab.tsx`
  - `apps/desktop/tests/SettingsPage.test.tsx`
- **Verification:**
  - Switch academic year: mounts new year DB without touching Owner/Assistant accounts in system DB.
  - Trigger "Backup Now": creates verified multi-year backup; updates last backup status.
- **Git Commit:** `git commit -m "feat(desktop): build settings, academic-year switcher, and backup management UI"`

---

### Task 17: Windows Packaging Verification, Playwright Smoke Tests & Hardening
- **Goal:** Execute full monorepo test suite, run Playwright smoke test against packaged Windows binary, verify `better-sqlite3` native operations in production package, and complete Phase 1 handoff documentation.
- **Files to Create / Modify:**
  - `apps/desktop/tests/smoke.spec.ts`
  - `README.md`
  - `walkthrough.md`
- **Verification:**
  ```bash
  pnpm -r typecheck
  pnpm test
  pnpm -r lint
  pnpm --filter @tibyan/desktop build:win
  pnpm --filter @tibyan/desktop test:smoke
  ```
- **Git Commit:** `git commit -m "chore: complete Tibyan Phase 1 packaging verification and hardening suite"`

---

## 11. Explicit Required Regression Test Matrix

Phase 1 development is guarded by four non-negotiable automated regression test suites:

| # | Regression Test Name | Test File | Assertion / Condition Tested |
|---|---|---|---|
| **1** | **Rescheduled Occurrence Idempotency** | `packages/core/tests/session.service.test.ts` | Materialize 28 days of sessions for a weekly Sunday slot. Reschedule the first occurrence to Tuesday. Re-run materialization. Assert: total session count is unchanged; original Sunday slot is NOT recreated. |
| **2** | **Enrollment-Scoped Payment Independence** | `packages/core/tests/enrollment.service.test.ts` | Enroll Student S1 in Group A (default 300 EGP) with null override. Enroll S1 in Group B (default 400 EGP) with override 500 EGP. Assert: S1 owes 300 EGP for Group A and 500 EGP for Group B. |
| **3** | **SYSTEM Actor Audit Logging** | `packages/core/tests/auth.service.test.ts` | Write an audit entry with `actorType: 'SYSTEM'`, `actorUserId: null`, and `actorNameSnapshot: 'BackupEngine'`. Assert: entry writes cleanly without FK failure and queries back accurately. |
| **4** | **Atomic Mutation & Audit Rollback** | `packages/core/tests/student.service.test.ts` | Execute student creation inside `runInAuditTransaction`. Force an audit trigger failure. Assert: transaction rolls back; neither student row nor audit row is committed to SQLite. |

---

## 12. Phase 1 Definition of Done

Phase 1 is officially complete when:
1. `tibyan-system.sqlite` and `tibyan-<year>.sqlite` are fully split; switching academic years retains all user accounts, permissions, and system settings.
2. `EducationSystem` (`GENERAL` | `EGYPTIAN_BACCALAUREATE`) and `GradeLevel` (`PREP_1` to `SEC_3`) operate as independent dimensions.
3. Groups have optional `focusMathBranch` and default payment settings; payment overrides are strictly enrollment-scoped.
4. Group enrollment history supports student departure and subsequent re-enrollment via partial unique indexing.
5. Sessions materialize idempotently with stable `occurrence_key`; rescheduling updates effective date/time without recreating the original slot.
6. Audit logs in both databases strictly reject `UPDATE` and `DELETE` queries via SQLite triggers, and support both `USER` and `SYSTEM` actors.
7. 4-digit PIN authentication enforces a 30-second cooldown after 5 consecutive failed attempts.
8. `BackupService` creates verified weekly SQLite online backups across all registered academic years with rolling 4-week retention.
9. `better-sqlite3` compiles and executes without error in both development and the packaged Windows executable.
10. All four mandatory regression tests pass with 100% success.
11. The UI faithfully renders the exact official Tibyan PNG logo, Cairo/Inter offline typography, true RTL orientation, and instant Light/Dark theme switching.

---

> **Phase 2 Preview:**  
> Following approval of Phase 1 completion, development transitions to:  
> **Tibyan Phase 2 — Attendance, QR/Barcode, Student Cards, Finance & Thermal Receipts.**
