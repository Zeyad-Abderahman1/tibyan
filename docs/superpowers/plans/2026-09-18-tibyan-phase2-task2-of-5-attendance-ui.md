# Phase 2 — Task 2 of 5: Attendance UI, QR/Barcode Scanner & Parent Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **Mode:** PLANNING_ONLY  
> **Repository Root:** `F:\tebyan`  
> **Spec Reference:** `docs/superpowers/specs/2026-09-18-tibyan-phase2-task2-of-5-attendance-ui-design.md`  
> **Current Baseline:** Tasks 1–18 Complete; Task 1 of 5 (Task 18 Hardened) Complete; 555 unit tests passing; 2 Playwright E2E tests passing; Clean working tree; Official Logo SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

---

## 1. Executive Summary & Objective

Build the complete desktop user interface for class attendance, USB/webcam scanning, session completion, and parent follow-up in the **تِبيان (Tibyan)** desktop application.

### Exact Objective:
Deliver a fast, responsive, and aesthetically stunning teacher-facing attendance workspace that leverages the existing Task 1 of 5 attendance core (`window.tibyan.attendance` and `window.tibyan.sessions.complete`), providing:
1. Live session roster with real-time status counters (`Present`, `Late`, `Absent`, `Excused`, `Unmarked`).
2. Single-click manual attendance marking, late arrival time modal/popover, and bulk mark-all-present actions.
3. Hardware USB barcode scanner keyboard wedge integration with sub-35ms discrimination.
4. Camera QR scanning viewfinder with authorized Electron camera access.
5. Safe End-of-Day parent follow-up drawer with polite Arabic WhatsApp drafts, clipboard copying, and secure allowlisted `wa.me` external launching.
6. Session completion dialog with auto-absence warnings and post-completion correction auditing.
7. Staged visual approval gates ensuring adherence to the accepted Tibyan design standard.

### Exact Non-Goals (Boundaries):
- **Phase 2 — Task 3 of 5:** Does NOT generate printable student cards, render card templates, or generate Code128 barcodes / PDF exports. Task 2 consumes `studentCode` directly.
- **Phase 2 — Task 4 of 5:** Does NOT process payments, fees, subscriptions, or financial ledgers.
- **Phase 2 — Task 5 of 5:** Does NOT print thermal receipts (ESC/POS).
- **Backend / Database Changes:** Task 1 of 5 already migrated and hardened `attendance_records` and SQLite CHECK constraints. No database migrations or core business logic rewrites are permitted in Task 2.

---

## 2. Discovered Live Architecture & Preload Contracts

Task 1 of 5 already exposed the following typed methods on `window.tibyan.attendance` and `window.tibyan.sessions`:
- `window.tibyan.attendance.getRoster(sessionId: string): Promise<IpcResult<SessionAttendanceRosterDto>>`
- `window.tibyan.attendance.record(input: RecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto>>`
- `window.tibyan.attendance.batchRecord(input: BatchRecordAttendanceInput): Promise<IpcResult<AttendanceRecordDto[]>>`
- `window.tibyan.attendance.getEndOfDay(date: string): Promise<IpcResult<EndOfDayFollowUpDto>>`
- `window.tibyan.sessions.complete(input: CompleteSessionInput): Promise<IpcResult<SessionDto>>`

In addition, safe external WhatsApp navigation requires one minimal, strictly allowlisted IPC method in Main process security:
- `window.tibyan.system.openWhatsApp(input: { phone: string; message: string }): Promise<IpcResult<void>>`
This opens `https://wa.me/20...` via `shell.openExternal` without exposing arbitrary URL navigation.

---

## 3. Exact Files to Create and Modify

### 3.1 Contracts Layer (`@tibyan/contracts`)
- Modify: `packages/contracts/src/ipc/channels.ts` (Add `SYSTEM_OPEN_WHATSAPP: 'system:openWhatsApp'`)
- Modify: `packages/contracts/src/ipc/api.ts` (Add `system.openWhatsApp` to `TibyanApi`)
- Modify: `packages/contracts/src/models/system.dto.ts` (Add `OpenWhatsAppInputSchema`)

### 3.2 Electron Main / Security Layer (`apps/desktop`)
- Modify: `apps/desktop/electron/security.ts` (Grant `'media'` permission for main window; add URL validator for WhatsApp external links)
- Modify: `apps/desktop/electron/ipc/system.ipc.ts` (Register `SYSTEM_OPEN_WHATSAPP` handler)
- Modify: `apps/desktop/electron/preload.ts` (Expose `openWhatsApp` on `window.tibyan.system`)

### 3.3 Desktop Renderer State & Hooks (`apps/desktop`)
- Create: `apps/desktop/src/hooks/useAttendance.ts` (TanStack Query hooks: `useSessionRoster`, `useRecordAttendance`, `useBatchRecordAttendance`, `useEndOfDayFollowUp`, `useCompleteSession`, query keys)
- Create: `apps/desktop/src/hooks/useUsbScanner.ts` (Timing-based keyboard wedge listener hook)
- Create: `apps/desktop/src/hooks/useWebcamQr.ts` (Media stream and frame decoding hook)

### 3.4 Desktop Renderer Components (`apps/desktop`)
- Create: `apps/desktop/src/features/attendance/AttendancePage.tsx` (Main workspace view)
- Create: `apps/desktop/src/features/attendance/AttendanceSummaryStrip.tsx` (Summary metric cards)
- Create: `apps/desktop/src/features/attendance/AttendanceRosterTable.tsx` (Student roster table/rows)
- Create: `apps/desktop/src/features/attendance/StatusSegmentedControl.tsx` (Compact status selector)
- Create: `apps/desktop/src/features/attendance/LateTimeModal.tsx` (Quick arrival time dialog)
- Create: `apps/desktop/src/features/attendance/CompleteSessionModal.tsx` (Session completion dialog)
- Create: `apps/desktop/src/features/attendance/UsbScannerIndicator.tsx` (Scanner status & visual feedback)
- Create: `apps/desktop/src/features/attendance/CameraScannerModal.tsx` (Webcam QR viewfinder)
- Create: `apps/desktop/src/features/attendance/ParentFollowUpDrawer.tsx` (End-of-day follow-up drawer)
- Modify: `apps/desktop/src/components/layout/DynamicIslandNav.tsx` (Include `الحضور` `/attendance` nav item)
- Modify: `apps/desktop/src/app/router.tsx` (Mount `/attendance` route)
- Modify: `apps/desktop/src/features/dashboard/ClassScheduleCard.tsx` (Enable "تسجيل الحضور" button navigating to `/attendance?sessionId=...`)

### 3.5 Automated Tests
- Create: `apps/desktop/tests/useUsbScanner.test.ts` (Unit test for scanner timing discrimination)
- Create: `apps/desktop/tests/AttendancePage.test.tsx` (Component tests: roster rendering, status changes, late modal, completion dialog)
- Create: `apps/desktop/tests/ParentFollowUp.test.tsx` (Follow-up list, WhatsApp draft, clipboard copy)
- Create: `apps/desktop/tests/attendance-ipc-security.test.ts` (WhatsApp link validation and camera permission handler tests)
- Modify: `apps/desktop/e2e/smoke.spec.ts` (Packaged E2E test exercising attendance workflow)

---

## 4. Step-by-Step Implementation Tasks

### Task 1: Safe WhatsApp IPC Handler & Camera Permission Security Scaffolding

**Files:**
- Modify: `packages/contracts/src/ipc/channels.ts`
- Modify: `packages/contracts/src/ipc/api.ts`
- Modify: `packages/contracts/src/models/system.dto.ts`
- Modify: `apps/desktop/electron/security.ts`
- Modify: `apps/desktop/electron/ipc/system.ipc.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Test: `apps/desktop/tests/attendance-ipc-security.test.ts`

- [ ] **Step 1: Write failing security unit test**
  Verify that `configureSessionSecurity` grants `'media'` permission to the main window and denies other requests, and verify that `openWhatsApp` validates Egyptian mobile numbers and opens `https://wa.me/` via `shell.openExternal`.
- [ ] **Step 2: Run test to verify it fails**
  `pnpm --filter @tibyan/desktop test attendance-ipc-security`
- [ ] **Step 3: Implement contracts and security updates**
  1. Add `OpenWhatsAppInputSchema` in `contracts`.
  2. In `security.ts`: allow `media` permission for `mainWindow.webContents.id`.
  3. In `system.ipc.ts`: implement `IPC_CHANNELS.SYSTEM_OPEN_WHATSAPP` validating URL against `^https:\/\/wa\.me\/201[0125]\d{8}\?text=`.
  4. In `preload.ts`: expose `system.openWhatsApp(input)`.
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
  `git commit -m "feat(security): allow local media permissions and add safe WhatsApp launcher"`

---

### Task 2: Attendance React Query Hooks & State Management

**Files:**
- Create: `apps/desktop/src/hooks/useAttendance.ts`
- Test: `apps/desktop/tests/useAttendance.test.tsx`

- [ ] **Step 1: Write failing hook test**
  Test `useSessionRoster`, `useRecordAttendance`, and `useCompleteSession` caching, query keys, and optimistic invalidation.
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `useAttendance.ts`**
  - Define canonical `attendanceKeys`.
  - Implement query hooks using `window.tibyan.attendance`.
  - Invalidate `attendanceKeys.roster(sessionId)` and `dashboardKeys.today()` on mutations.
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**
  `git commit -m "feat(desktop): implement attendance query hooks and cache management"`

---

### Task 3: USB Barcode Scanner Keyboard Wedge Hook

**Files:**
- Create: `apps/desktop/src/hooks/useUsbScanner.ts`
- Test: `apps/desktop/tests/useUsbScanner.test.ts`

- [ ] **Step 1: Write failing test for timing-based barcode discrimination**
  Verify that keystrokes arriving $< 35\,\text{ms}$ apart ending in `Enter` trigger `onScan(code)`, while keystrokes $> 70\,\text{ms}$ apart are ignored as human typing.
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `useUsbScanner.ts`**
  - Track keystroke timestamps (`performance.now()`).
  - Buffer scan characters.
  - Intercept Enter event if buffer meets timing velocity criteria.
  - Return `{ isListening, lastScannedCode }`.
- [ ] **Step 4: Run test to verify success**
- [ ] **Step 5: Commit**
  `git commit -m "feat(desktop): implement timing-based USB barcode scanner hook"`

---

### Task 4: Attendance Status Segmented Control & Late Time Modal

**Files:**
- Create: `apps/desktop/src/features/attendance/StatusSegmentedControl.tsx`
- Create: `apps/desktop/src/features/attendance/LateTimeModal.tsx`
- Test: `apps/desktop/tests/StatusSegmentedControl.test.tsx`

- [ ] **Step 1: Write failing test for status controls**
  Verify that clicking PRESENT, ABSENT, EXCUSED triggers immediate change, while LATE opens the arrival time modal pre-filled with current `HH:mm`.
- [ ] **Step 2: Implement components**
  - Use Tibyan tokens (`--color-brand-primary`, `--color-brand-accent`, `--color-status-danger`, `--color-status-info`).
  - Support keyboard navigation (`1`, `2`, `3`, `4`).
- [ ] **Step 3: Run test to verify success**
- [ ] **Step 4: Commit**
  `git commit -m "feat(desktop): implement attendance status segmented control and late time modal"`

---

### Task 5: Session Completion Modal with Auto-Absence Explanation

**Files:**
- Create: `apps/desktop/src/features/attendance/CompleteSessionModal.tsx`
- Test: `apps/desktop/tests/CompleteSessionModal.test.tsx`

- [ ] **Step 1: Write failing test for completion modal**
  Verify that the modal warns when unmarked students exist, stating that they will be automatically marked as ABSENT.
- [ ] **Step 2: Implement `CompleteSessionModal.tsx`**
  - Display summary breakdown.
  - Prominent Arabic warning if `unmarkedCount > 0`.
  - Optional session notes input.
  - Calls `useCompleteSession`.
- [ ] **Step 3: Run test to verify success**
- [ ] **Step 4: Commit**
  `git commit -m "feat(desktop): implement session completion modal with auto-absence warning"`

---

### Task 6: Attendance Main Screen (Roster, Summary & Session Selector)

**Files:**
- Create: `apps/desktop/src/features/attendance/AttendancePage.tsx`
- Create: `apps/desktop/src/features/attendance/AttendanceSummaryStrip.tsx`
- Create: `apps/desktop/src/features/attendance/AttendanceRosterTable.tsx`
- Modify: `apps/desktop/src/components/layout/DynamicIslandNav.tsx`
- Modify: `apps/desktop/src/app/router.tsx`
- Modify: `apps/desktop/src/features/dashboard/ClassScheduleCard.tsx`
- Test: `apps/desktop/tests/AttendancePage.test.tsx`

- [ ] **Step 1: Write comprehensive component tests**
  Test roster loading, summary metric calculation, student search filtering, status mutation dispatch, and completed session state.
- [ ] **Step 2: Implement components**
  - Mount `/attendance` route.
  - Add `الحضور` nav item to `DynamicIslandNav`.
  - Enable "تسجيل الحضور" button on `ClassScheduleCard` navigating to `/attendance?sessionId=...`.
  - Implement spacious roster table with `tibyan-media://` student photos, codes, names, and status segmented controls.
  - Implement bulk "تحديد الكل كـ حاضر" action.
- [ ] **Step 3: Run test to verify success**
- [ ] **Step 4: Commit**
  `git commit -m "feat(desktop): implement attendance page, session selector, and roster table"`

---

### Task 7: Visual Approval Gate 1 — Attendance Main Screen

- [ ] **Step 1: Launch test preview / browser subagent**
- [ ] **Step 2: Capture screenshots**
  - 1920x1080 Light Mode
  - 1920x1080 Dark Mode
  - 1366x768 Compact View
- [ ] **Step 3: STOP and present screenshots for User Visual Approval**
  Do NOT proceed to scanner feedback or follow-up before user confirms Gate 1.

---

### Task 8: Scanner Integration (USB Feedback & Webcam QR Viewfinder)

**Files:**
- Create: `apps/desktop/src/features/attendance/UsbScannerIndicator.tsx`
- Create: `apps/desktop/src/features/attendance/CameraScannerModal.tsx`
- Modify: `apps/desktop/src/features/attendance/AttendancePage.tsx`
- Test: `apps/desktop/tests/ScannerExperience.test.tsx`

- [ ] **Step 1: Write failing test for scanner event handling**
  Test scan success toast, duplicate scan warning, wrong-group scan error, and camera modal open/close.
- [ ] **Step 2: Implement scanner components**
  - Attach `useUsbScanner` to `AttendancePage`.
  - Implement `UsbScannerIndicator` displaying connection status and last scanned student info.
  - Implement `CameraScannerModal` using `navigator.mediaDevices.getUserMedia` with fallback between `BarcodeDetector` and `jsqr`.
  - Add audio chime and visual green/amber row flash on scan.
- [ ] **Step 3: Run test to verify success**
- [ ] **Step 4: Commit**
  `git commit -m "feat(desktop): integrate USB barcode wedge feedback and webcam QR modal"`

---

### Task 9: Visual Approval Gate 2 — Scanner Experience

- [ ] **Step 1: Capture screenshots of active scanner feedback and camera modal**
- [ ] **Step 2: STOP and present for User Visual Approval**

---

### Task 10: Parent Follow-Up & Safe WhatsApp Drawer

**Files:**
- Create: `apps/desktop/src/features/attendance/ParentFollowUpDrawer.tsx`
- Modify: `apps/desktop/src/features/attendance/AttendancePage.tsx`
- Test: `apps/desktop/tests/ParentFollowUp.test.tsx`

- [ ] **Step 1: Write failing follow-up test**
  Test loading absent/late students, clipboard copy action, contact status toggle (`UNCONTACTED` -> `CONTACTED`), and WhatsApp opener.
- [ ] **Step 2: Implement `ParentFollowUpDrawer.tsx`**
  - Queries `useEndOfDayFollowUp`.
  - Renders absent and late cards with pre-generated Arabic WhatsApp templates.
  - Provides "نسخ الرسالة" button and "فتح واتساب" button calling `window.tibyan.system.openWhatsApp`.
  - Provides contact state selectors (`CONTACTED`, `UNCONTACTED`, `UNREACHABLE`).
- [ ] **Step 3: Run test to verify success**
- [ ] **Step 4: Commit**
  `git commit -m "feat(desktop): implement parent follow-up drawer and WhatsApp workflow"`

---

### Task 11: Visual Approval Gate 3 — Parent Follow-Up Experience

- [ ] **Step 1: Capture screenshots of the parent follow-up drawer and contact states**
- [ ] **Step 2: STOP and present for User Visual Approval**

---

### Task 12: Playwright Packaged E2E Verification & Full Regression

**Files:**
- Modify: `apps/desktop/e2e/smoke.spec.ts`

- [ ] **Step 1: Extend Playwright smoke suite**
  Add attendance check-in lifecycle:
  1. Navigate to `/attendance` from Today Dashboard.
  2. Verify roster items render.
  3. Mark student as PRESENT.
  4. Verify summary updates.
  5. Open session completion dialog.
  6. Verify auto-absence notice and complete session.
  7. Verify persistence across application restart.
- [ ] **Step 2: Run complete monorepo regression verification**
  ```bash
  pnpm --filter @tibyan/contracts test
  pnpm --filter @tibyan/db test
  pnpm --filter @tibyan/core test
  pnpm --filter @tibyan/design-system test
  pnpm --filter @tibyan/desktop test
  pnpm -r test
  pnpm -r typecheck
  pnpm --filter @tibyan/desktop build
  pnpm --filter @tibyan/desktop run pack
  pnpm --filter @tibyan/desktop test:e2e
  ```
- [ ] **Step 3: Verify Logo SHA-256 and Git tree**
- [ ] **Step 4: Commit**
  `git commit -m "test(desktop): add packaged E2E test for attendance check-in lifecycle"`

---

## 5. Verification Floor & Guarantees

| Metric | Required Floor |
| :--- | :--- |
| **Unit & Integration Tests** | 555 passing (zero regressions) + new tests |
| **Playwright E2E Tests** | 2/2 passing (plus extended attendance test) |
| **Typecheck** | 0 errors across 5 workspace packages |
| **Database Schema Drift** | 0 schema drift (`drizzle-kit generate` clean) |
| **Official Logo Hash** | `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749` |
| **Packaging** | Successful Windows NSIS build with unpacked `better_sqlite3.node` |
