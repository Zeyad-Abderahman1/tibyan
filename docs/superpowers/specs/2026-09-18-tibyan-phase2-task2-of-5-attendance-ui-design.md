# تِبيان (Tibyan) — Attendance UI, QR/Barcode Scanner & Parent Follow-up Design Specification

> **Document Version:** 1.0.0  
> **Date:** 2026-09-18  
> **Phase & Task:** Phase 2 — Task 2 of 5: Attendance UI, QR/Barcode Scanner & Parent Follow-up  
> **Mode:** PLANNING_ONLY (Design Specification)  
> **Repository Root:** `F:\tebyan`  
> **Canonical Baseline:** Tasks 1–18 Complete; Task 1 of 5 (Task 18 Hardened) Complete; Dynamic UI Redesign Complete; Visual Rescues Accepted (`d82ecc1` and `4cc974c`); 555 tests passing; Working tree clean; Official Logo SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

---

## 1. Executive Summary & Objective

The objective of **Phase 2 — Task 2 of 5: Attendance UI, QR/Barcode Scanner & Parent Follow-up** is to design and implement the complete teacher-facing and assistant-facing desktop Attendance workflow. This interface sits directly upon the robust, hardened attendance core delivered in Task 1 of 5 (Task 18), utilizing existing SQLite schemas, atomic audit logging, DTOs, and typed IPC APIs.

### Core Objectives:
1. **Interactive Attendance Workspace:** A high-craft, high-density desktop workspace (`/attendance` and `/attendance/:sessionId`) matching the accepted Tibyan visual standard (floating top island, spacious `WorkspaceStage` canvas, true Arabic RTL, petrol/teal/gold design tokens).
2. **Rapid Manual Attendance:** Frictionless, single-click status changes (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), fast modal/popover for late arrival time capture, and bulk mark-present actions.
3. **Dual Scanner Integration:**
   - **Physical USB Barcode/QR Scanner:** Seamless keyboard-wedge event listener with sub-35ms timing discrimination, audio/visual toast feedback, duplicate scan defense, and input field collision protection.
   - **Webcam/Camera QR Scanner:** Controlled viewport drawer/modal with Chromium camera permissions handling, live video stream, and barcode detection.
4. **Session Completion & Lifecycle:** Clear confirmation dialog highlighting unmarked students who will be automatically marked `ABSENT`, completed session badges, and post-completion correction support.
5. **Parent Follow-up & Safe WhatsApp Workflow:** End-of-Day follow-up panel displaying absent and late students, localized polite Arabic WhatsApp drafts, one-click clipboard copy, and strict allowlisted WhatsApp Web/Desktop launching without exposing arbitrary URL navigation.

---

## 2. Canonical Scope & Strict Boundary Rules

### 2.1 Explicit Ownership in Task 2 of 5:
- Attendance navigation tab and route `/attendance` (with optional `:sessionId` parameter).
- Session switcher and selector (filter by today's sessions, groups, and calendar dates).
- Session roster table and card views with student avatar (`tibyan-media://`), code (`TB-XXXX`), name, and compact status segmented control.
- Real-time summary strip (`Present`, `Late`, `Absent`, `Excused`, `Unmarked`, `Total`).
- Manual status mutations (`recordAttendance`, `batchRecordAttendance`).
- Late arrival time capture (pre-filled with current system time in 24h `HH:mm` format).
- USB barcode scanner keyboard wedge listener with timing heuristics.
- Camera QR scanner viewfinder with device selection and frame decoding.
- Session completion modal (`completeSession`) with auto-absence explanation and notes.
- Post-completion correction workflow (audited as `ATTENDANCE_UPDATED`).
- End-of-day follow-up drawer/modal (`getEndOfDayFollowUp`).
- Follow-up contact status tracking (`CONTACTED`, `UNCONTACTED`, `UNREACHABLE`) in client daily session cache.
- Safe WhatsApp message copier and allowlisted `wa.me` external link opener.
- Comprehensive unit, component, IPC, and Playwright E2E tests.

### 2.2 Explicit Non-Goals (Strict Boundary Isolation):
- **Phase 2 — Task 3 of 5 (Student Cards, QR Tokens & Code128 Barcodes):** Task 2 does NOT generate printable student cards, does NOT render card templates, and does NOT generate Code128 barcode graphics or PDF exports. Task 2 consumes `studentCode` (already present on students).
- **Phase 2 — Task 4 of 5 (Finance, Payments, Subscriptions, Discounts & Invoicing):** Task 2 does NOT collect fees, record payments, calculate subscription balances, or issue receipts.
- **Phase 2 — Task 5 of 5 (Thermal Receipts & ESC/POS Printing):** Task 2 does NOT interact with ESC/POS thermal receipt printers.
- **Cloud Connectivity / Remote APIs:** No external servers, no cloud WhatsApp APIs, no Twilio. All communication is local desktop or user-confirmed external browser navigation.

---

## 3. Discovered Live Backend Architecture (Reuse of Task 1 of 5)

Task 1 of 5 delivered the complete backend core. Task 2 must reuse it without duplication:

| Backend Component | Canonical Contract / Location | Capabilities Reused by Task 2 |
| :--- | :--- | :--- |
| **`AttendanceStatus`** | `packages/contracts/src/enums/attendance.ts` | `'PRESENT'`, `'ABSENT'`, `'LATE'`, `'EXCUSED'` |
| **`SessionAttendanceRosterDto`** | `packages/contracts/src/models/attendance.dto.ts` | `session`, `groupName`, `roster` (studentId, studentCode, studentName, photoUrl, attendanceRecord), `summary` (total, present, absent, late, excused, unmarked) |
| **`RecordAttendanceInput`** | `packages/contracts/src/models/attendance.dto.ts` | Validates `sessionId`, `studentId`, `status`, `arrivalTime` (`HH:mm` required for `LATE`, null for `ABSENT`/`EXCUSED`), and `notes`. |
| **`BatchRecordAttendanceInput`** | `packages/contracts/src/models/attendance.dto.ts` | Atomic multi-student check-in with duplicate `studentId` rejection. |
| **`EndOfDayFollowUpDto`** | `packages/contracts/src/models/attendance.dto.ts` | Absent/late student aggregation, guardian phone, pre-generated Arabic WhatsApp templates without hardcoded subjects. |
| **`AttendanceService`** | `packages/core/src/attendance/attendance.service.ts` | Enforces permissions, validates temporal enrollment on `effectiveDate`, rejects cancelled sessions, permits completed-session corrections, performs atomic database transactions with academic audit logs (`ATTENDANCE_RECORDED`, `ATTENDANCE_UPDATED`, `SESSION_COMPLETED`). |
| **`SessionService.completeSession`** | `packages/core/src/groups/session.service.ts` | Atomically marks unmarked enrolled students as `ABSENT` with note `'غياب تلقائي عند اكتمال الحصة'`. |
| **IPC Channels** | `packages/contracts/src/ipc/channels.ts` | `ATTENDANCE_GET_ROSTER`, `ATTENDANCE_RECORD`, `ATTENDANCE_BATCH_RECORD`, `ATTENDANCE_GET_END_OF_DAY`, `SESSIONS_COMPLETE`. |
| **Preload Bridge** | `apps/desktop/electron/preload.ts` | `window.tibyan.attendance.getRoster`, `record`, `batchRecord`, `getEndOfDay`, and `window.tibyan.sessions.complete`. |

---

## 4. Visual Language & Workspace Composition

The Attendance workspace adheres strictly to the accepted Tibyan dynamic visual standard established in commits `d82ecc1` (Dynamic Island & Groups Workspace) and `4cc974c` (Login UI).

### 4.1 Page Layout Grid:
```
+--------------------------------------------------------------------------------------------------+
|                                    TIBYAN FLOATING TOP ISLAND                                    |
| [Logo] | (اليوم)  (الطلاب)  (المجموعات)  (الحضور)  (الإعدادات) | [2026-2027] [المستخدم] [الوضع]     |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   WORKSPACE STAGE (max-w-[1600px] mx-auto px-6 lg:px-14 pt-24 pb-12)                            |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | HEADER ROW                                                                               |   |
|   | [Icon + عنوان: تسجيل الحضور] [سياق المجموعة والحصة]             [زر ماسح الباركود] [إنهاء الحصة] |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | SESSION SELECTOR & DATE BAR                                                              |   |
|   | [اختيار الحصة: قائمة الحصص اليوم أو المجدولة]  [التاريخ: اليوم 2026-09-18]  [حالة الحصة]  |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   | ATTENDANCE SUMMARY METRIC STRIP (5 Cards)                                                |   |
|   | [إجمالي الطلاب: 32] [حاضر: 26] [متأخر: 2] [غائب: 3] [معذور: 1] [لم يسجل: 0]             |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                                                                  |
|   +---------------------------------------------------------+ +------------------------------+   |
|   | MAIN ROSTER WORKSPACE (Flexible ~70-75% width)           | | SCANNER & FOLLOW-UP DOCK     |   |
|   | - بحث سريع عن طالب (بالاسم أو الكود)                     | | (Sticky Quick Tools ~25-30%) |   |
|   | - أدوات مجمعة (تحديد الكل حاضر / إعادة ضبط)              | |                              |   |
|   |                                                         | | [ماسح USB: نشط ومستعد]        |   |
|   | جدول الطلاب:                                            | | [زر فتح كاميرا الـ QR]        |   |
|   | [الصورة] [الاسم والكود] [الحالة (أزرار مدمجة)] [وقت الحضور]  | | [آخر عملية مسح: بطاقة طالب]  |   |
|   | ------------------------------------------------------- | |                              |   |
|   | [Row 1: أحمد محمد (TB-0001) | [حاضر][متأخر][غائب][معذور] | | [متابعة أولياء الأمور (اليوم)]|   |
|   | [Row 2: سارة علي (TB-0002)  | [حاضر][متأخر][غائب][معذور] | | [فتح نافذة المتابعة والواتساب]|   |
|   +---------------------------------------------------------+ +------------------------------+   |
+--------------------------------------------------------------------------------------------------+
```

### 4.2 Status Visual Token Mapping:
The status control must be a **compact segmented button group**, never four giant garish POS buttons:
- **PRESENT (حاضر):** Teal / Emerald (`var(--color-brand-primary)` in Light `#0B3D3D`, `#10B981` in status; `#5CE1E6` / `#059669` in Dark).
- **LATE (متأخر):** Warm Amber / Muted Gold (`var(--color-brand-accent)` `#C59B27`, hover `#B38728`, badge `#F59E0B`).
- **ABSENT (غائب):** Coral / Rose Red (`#EF4444` / `#DC2626` / `var(--color-status-danger)`).
- **EXCUSED (معذور):** Slate / Blue-Gray (`#64748B` / `#475569` / `var(--color-status-info)`).
- **UNMARKED (لم يُسجل):** Subtle dashed or neutral border (`var(--color-border-subtle)` / text muted).

---

## 5. Manual Attendance UX & Invariants

1. **Single-Click Interaction:**
   - Clicking **حاضر (PRESENT)** marks the student as present immediately (setting arrival time to null unless already recorded).
   - Clicking **غائب (ABSENT)** marks the student as absent immediately (clearing arrival time to null).
   - Clicking **معذور (EXCUSED)** marks the student as excused immediately (clearing arrival time to null).
   - Clicking **متأخر (LATE)** opens an inline quick-popover or small modal requesting the arrival time:
     - Pre-filled with current system time `HH:mm` (24-hour Egyptian format).
     - Allows quick adjustment or instant Enter/OK confirmation.
     - Enforces backend invariant: `LATE` requires a valid `HH:mm` arrival time.
2. **Bulk Actions:**
   - **"تحديد الكل كـ حاضر" (Mark All as Present):** Collects all unmarked students in the roster and calls `window.tibyan.attendance.batchRecord` with status `PRESENT`.
3. **Completed Session Correction:**
   - When a session is `COMPLETED`, the UI displays a subtle badge "حصة مكتملة".
   - The teacher or authorized assistant can still click any student status to correct attendance. The backend accepts mutations on completed sessions and writes an audit row (`ATTENDANCE_UPDATED`).
4. **Cancelled Session Guard:**
   - If a session has status `CANCELLED_BY_TEACHER`, the UI displays a clear banner: "تم إلغاء هذه الحصة من قِبل المدرس. لا يمكن تسجيل الحضور لحصة ملغاة."
   - All manual and scanner controls are strictly disabled.
5. **Keyboard Shortcuts:**
   - Focus traversal on student rows (`ArrowDown` / `ArrowUp`).
   - Quick numeric keys when row is focused: `1` = حاضر, `2` = متأخر, `3` = غائب, `4` = معذور.
   - Escape closes any open popovers/modals.

---

## 6. Scanner Architecture: USB Barcode & Webcam QR

### 6.1 Physical USB Barcode/QR Scanner (Keyboard Wedge Mode)
Standard USB barcode and 2D QR scanners act as a Human Interface Device (HID) keyboard wedge, streaming character keypresses at high speed terminated by an `Enter` keypress.

#### Global Keyboard Wedge Listener Strategy:
1. **Timing-Based Discrimination:**
   - Human typing speed typically exceeds 70–120ms between keystrokes.
   - Hardware USB scanners emit characters with inter-key intervals of **less than 35ms** (often 5–20ms).
   - Buffer collection: If consecutive keystrokes arrive with $\Delta t < 35\,\text{ms}$, they are buffered into a dedicated scanner accumulator.
   - If a key arrives after $> 60\,\text{ms}$, the buffer is flushed or treated as human typing.
   - On `Enter`: If the buffer length $\ge 3$ characters and was emitted under the timing threshold, the event is intercepted (`e.preventDefault()`, `e.stopPropagation()`) and dispatched as a barcode scan.
2. **Input Element Collision Protection:**
   - If `document.activeElement` is a text `INPUT` or `TEXTAREA` (e.g. the student search box or notes field), the listener checks whether the input stream exhibits scanner velocity ($< 35\,\text{ms}$ per char).
   - If scanner velocity is detected, the input element's text is preserved/reverted and the scan is processed without corrupting the text field.
   - A visible "ماسح الباركود متصل وجاهز" (Scanner Ready) indicator in the UI gives immediate reassurance.
3. **Scan Dispatch & Roster Resolution:**
   - The scanned code (e.g. `TB-0042` or `0042`) is cleaned and matched against the active session roster:
     - Exact match on `student.studentCode`.
     - Secondary match on normalized numeric code (e.g. `42` -> `TB-0042`).
     - JSON parse fallback if code is a formatted QR token (e.g. `{"code":"TB-0042"}`).
4. **Scanner Feedback & Edge Cases:**
   - **Success (Student marked PRESENT):** Row flashes subtle emerald teal (`duration-300`), real-time summary counter increments, brief audio chime (if sound feedback is enabled in UI).
   - **Duplicate Scan (Student already PRESENT):** Visual toast: "الطالب {name} مسجل حاضر بالفعل" (warm amber banner, non-blocking).
   - **Wrong Group / Not Enrolled in Session:** Warning toast: "الطالب {name} ({code}) غير مقيد في هذه المجموعة/الحصة".
   - **Unknown Code:** Error toast: "رمز غير معروف في النظام: {code}".

### 6.2 Webcam / Camera QR Scanner (Desktop Drawer / Modal)
For teachers using an integrated laptop webcam or USB webcam:

1. **Electron Session Security Configuration:**
   - Inspection of `apps/desktop/electron/security.ts` revealed that `configureSessionSecurity` currently rejects all permission requests:
     ```typescript
     session.setPermissionRequestHandler((_webContents, _permission, callback) => {
       callback(false);
     });
     ```
   - **Hardened Permission Rule for Camera:** In `apps/desktop/electron/security.ts`, allow `'media'` permission **strictly and exclusively** for the trusted local main window origin:
     ```typescript
     session.setPermissionRequestHandler((webContents, permission, callback) => {
       if (permission === 'media' && webContents.id === mainWindow?.webContents.id) {
         callback(true);
         return;
       }
       callback(false);
     });
     ```
2. **Video Capture & Frame Decoding:**
   - Uses standard HTML5 `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })`.
   - Video element renders in a collapsible viewfinder drawer or modal.
   - **QR Decoding Engine:**
     - Checks if native `window.BarcodeDetector` is available in the Chromium runtime (`BarcodeDetector.getSupportedFormats()` includes `'qr_code'`).
     - If available, decodes video frames natively via hardware acceleration.
     - If not available, uses pure JavaScript canvas frame decoding via `jsqr` (zero native C++ build requirements, ~40KB bundle, zero Electron ABI friction).
3. **Debounce & Cooldown:**
   - Once a QR code is detected, a 2.5-second cooldown is enforced for that specific student code to prevent rapid multi-frame scan loops, while immediately allowing a different student code.
4. **Camera Controls:**
   - Device selector dropdown (if multiple cameras/webcams are attached).
   - Mirror view toggle.
   - Clean stream release (`track.stop()`) immediately upon closing the scanner drawer or unmounting.

---

## 7. Boundary Resolution with Phase 2 — Task 3 of 5

### The Dependency Decision:
- **Phase 2 — Task 3 of 5:** Owns `Student Cards, QR Tokens & Code128 Barcodes` (rendering print-ready card layouts, calculating bleed margins, generating Code128 barcode SVGs/canvases, and high-resolution PDF exports).
- **Phase 2 — Task 2 of 5 Resolution:**
  - Every student in Tibyan already has a unique, deterministic `studentCode` (`TB-XXXX`) assigned upon creation in Task 5.
  - `SessionRosterItemDto` provides `studentCode: string`.
  - Task 2 scanner architecture is designed to **consume** `studentCode` directly.
  - When Task 3 generates student cards with Code128 barcodes and QR tokens encoding `studentCode`, they will scan and resolve seamlessly with zero modifications required in Task 2.
  - **Result:** Task 2 and Task 3 maintain a clean, orthogonal interface. Task 2 does NOT generate or print cards.

---

## 8. Parent Follow-up & Safe WhatsApp Workflow

### 8.1 End-of-Day Follow-Up Panel
Canonical spec §9.4 dictates:
> "في نهاية اليوم يظهر للـAssistant: الطلاب الغائبون، من تم التواصل مع ولي أمره، من لم يتم التواصل معه، زر فتح WhatsApp برسالة جاهزة بدون API، حالات: تم التواصل / لم يتم / تعذر التواصل."

1. **Data Source:**
   - Fetches live follow-up items via `window.tibyan.attendance.getEndOfDay(selectedDate)`.
   - Aggregates all absent and late students across active sessions on that date (excluding cancelled sessions).
   - Shows student name, group name, session time, status (`ABSENT` or `LATE`), and pre-formatted Arabic WhatsApp message.
2. **Parent Phone Data Minimization:**
   - Notice that `SessionRosterItemDto` in the active check-in roster intentionally hides guardian phone numbers to protect student privacy on shared classroom projectors.
   - In the dedicated **Follow-Up Panel** (accessed via authorized action), the guardian phone number is displayed specifically for parent communication.
3. **Contact Status Tracking:**
   - States:
     - `UNCONTACTED` (لم يتم التواصل) — Default.
     - `CONTACTED` (تم التواصل) — Marked after teacher/assistant copies message or opens WhatsApp.
     - `UNREACHABLE` (تعذر التواصل) — Marked if phone is disconnected or invalid.
   - **Persistence Strategy:**
     - To maintain database schema stability and avoid premature schema migrations before full guardian messaging requirements are formalized, contact status and follow-up notes for the current date are stored in a persistent local-storage cache (`tibyan_followup_state_${academicYearId}_${date}`) or dedicated component state.
     - When a status is clicked, the UI updates instantly with visual badge indicators.

### 8.2 Safe WhatsApp Workflow (Zero Cloud API)
Canonical spec §22 dictates:
> "لا Auto-send في V1. النظام يولد رسالة جاهزة -> يفتح WhatsApp / WhatsApp Web -> المستخدم يضغط Send يدويًا."

1. **One-Click Clipboard Copy:**
   - Button: "نسخ نص الرسالة" (Copy Message).
   - Writes the pre-formatted Arabic message directly to system clipboard via `navigator.clipboard.writeText(...)`.
   - Displays a success confirmation toast: "تم نسخ رسالة المتابعة إلى الحافظة".
2. **Safe WhatsApp Opening via Electron:**
   - Button: "فتح واتساب" (Open WhatsApp).
   - Normalizes the guardian phone number to international format:
     - Egyptian 11-digit mobile (`010...`, `011...`, `012...`, `015...`) normalized to `2010...` / `2011...` / `2012...` / `2015...`.
   - Generates target URL: `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(whatsappMessage)}`.
   - **Security Enforcement:**
     - Electron `apps/desktop/electron/security.ts` blocks untrusted navigation and denies `window.open`.
     - We introduce a strictly validated, secure IPC channel: `system:openExternalUrl` or `attendance:openWhatsApp`:
       - Payload: `{ phone: string, message: string }`.
       - Main process validates that URL matches regex `^https:\/\/wa\.me\/201[0125]\d{8}\?text=.*$`.
       - Calls Electron `shell.openExternal(validatedUrl)`.
       - Zero arbitrary external URL opening allowed.

---

## 9. Session Completion UX

1. **Action Location:**
   - Prominent button in the session header: **"إنهاء الحصة" (Complete Session)**.
   - Styled with secondary/danger border and subtle checkmark icon.
2. **Pre-Completion Inspection & Dialog:**
   - Dialog displays a summary of the session:
     - Present: $X$, Late: $Y$, Absent: $Z$, Excused: $W$, Unmarked: $U$.
   - **If $U > 0$ (Unmarked students exist):**
     - Warning alert banner (Amber/Red):
       "تنبيه: يوجد **{U} طالب** لم يتم تسجيل حضورهم. سيقوم النظام تلقائيًا بتسجيلهم كـ **غائبين**."
   - Notes text area: Optional teacher notes on the session (e.g. "تم شرح درس المصفوفات وحل التمارين").
   - Action buttons: "إلغاء" (Cancel) and "تأكيد إنهاء الحصة" (Confirm Completion).
3. **Execution & Authoritative Core Enforcement:**
   - Calls `window.tibyan.sessions.complete({ sessionId, notes })`.
   - Backend atomically:
     - Updates session status to `COMPLETED`.
     - Creates `ABSENT` attendance records for all unmarked active enrollments with note `'غياب تلقائي عند اكتمال الحصة'`.
     - Emits `SESSION_COMPLETED` and attendance audit records in the academic database transaction.
4. **Post-Completion State:**
   - Header shows a green "حصة مكتملة" badge.
   - The roster remains interactive for retrospective corrections if a student was mistakenly marked absent.

---

## 10. Permissions & Security Matrix

| Role / Capability | View Roster | Record/Update Attendance | USB/Camera Scan | Complete Session | View Parent Follow-Up | Contact WhatsApp |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Assistant (`ATTENDANCE_WRITE`)** | Yes | Yes | Yes | If `SESSIONS_MANAGE` | If `GROUPS_READ` | If `GROUPS_READ` |
| **Assistant (Read-Only)** | Yes (`GROUPS_READ`) | No (Controls disabled) | No | No | Yes | View only |

Main process IPC handlers remain authoritative: `requirePermission('ATTENDANCE_WRITE')` and `requirePermission('SESSIONS_MANAGE')`. The renderer uses permission flags strictly for UI presentation and disabling controls.

---

## 11. State Management & Query Key Architecture

### 11.1 Query Keys:
Centralized in `apps/desktop/src/hooks/useAttendance.ts`:
```typescript
export const attendanceKeys = {
  all: ['attendance'] as const,
  roster: (sessionId: string) => [...attendanceKeys.all, 'roster', sessionId] as const,
  endOfDay: (date: string) => [...attendanceKeys.all, 'endOfDay', date] as const,
};
```

### 11.2 Invalidation & Coherence:
- Mutating attendance for a session invalidates:
  - `attendanceKeys.roster(sessionId)`
  - `dashboardKeys.today()` (to keep Today Dashboard summary statistics synchronized)
- Completing a session invalidates:
  - `attendanceKeys.roster(sessionId)`
  - `sessionKeys.all`
  - `dashboardKeys.today()`
- Changing academic year purges all `attendanceKeys.all`.

---

## 12. Accessibility, Internationalization & Motion

1. **RTL & Number Isolation:**
   - Roster text, student names, status badges, and table headers are authentic Arabic RTL (`dir="rtl"`).
   - Student codes (`TB-0001`), arrival times (`16:30`), phone numbers (`01012345678`), and counts are isolated in `<span dir="ltr">` to prevent bidirectional text corruption.
2. **Keyboard Traversal:**
   - Full keyboard operability for attendance check-in.
   - Focus outline using `--color-brand-accent` (`ring-2 ring-[var(--color-brand-accent)]`).
3. **Motion Constraints:**
   - Micro-animations: Scanner flash (opacity fade), subtle status transition (150ms).
   - Strict adherence to `@media (prefers-reduced-motion: reduce)` disabling all transitions.

---

## 13. Staged Visual Approval Gates

To maintain strict visual quality and prevent unapproved UI sprawl, implementation will proceed through three mandatory visual approval gates:

### Gate 1: Attendance Workspace Shell & Manual Roster
- Implement:
  - Navigation item `الحضور` in `DynamicIslandNav`.
  - Route `/attendance` in `router.tsx`.
  - Session selector and header with status.
  - Summary metric cards.
  - Main student roster table/card layout with compact status segmented controls.
- **Visual Capture & Review:**
  - 1920x1080 Light Mode
  - 1920x1080 Dark Mode
  - 1366x768 Compact Resolution
- **STOP for user review and approval.**

### Gate 2: Scanner Experience
- Implement:
  - USB scanner listener and ready indicator.
  - Audio/visual toast feedback for success, duplicate, and unknown scans.
  - Webcam QR viewfinder drawer with camera stream.
- **Visual Capture & Review:**
  - Active scanner state and feedback modals in Light and Dark modes.
- **STOP for user review and approval.**

### Gate 3: Parent Follow-Up & WhatsApp Workflow
- Implement:
  - End-of-day follow-up drawer/modal.
  - Absent/late cards with WhatsApp message preview.
  - Clipboard copy and WhatsApp launch actions.
  - Session completion dialog.
- **Final Visual Verification & Acceptance.**
