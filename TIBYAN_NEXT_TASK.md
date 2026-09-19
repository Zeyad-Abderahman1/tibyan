# Phase 2 — Task 3 of 5 Complete & Task 4 of 5 Ready — تِبيان (Tibyan)

> **Notice:** Phase 2 — Task 3 of 5 (**Student Cards, QR Tokens & Code128 Barcodes**) is **100% COMPLETE & APPROVED**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)** and **[TIBYAN_AI_HANDOFF.json](file:///F:/tebyan/TIBYAN_AI_HANDOFF.json)**.
>
> **Canonical Phase 2 Baseline (Post-Task 3 Final Hardening & Verification):**
> - **Tasks Completed:** Tasks 1 through 20 inclusive (Phase 1 Tasks 1-17; Phase 2 Task 1; Phase 2 Task 2; Phase 2 Task 3)
> - **Total Unit & Component Tests:** 646 passing across 38 test files:
>   - `@tibyan/contracts`: 17 tests (1 file)
>   - `@tibyan/db`: 23 tests (2 files)
>   - `@tibyan/core`: 28 tests (2 files)
>   - `@tibyan/design-system`: 278 tests (5 files)
>   - `@tibyan/desktop`: 300 tests (28 files)
> - **Playwright E2E Tests:** 4 passed (smoke, Gate 1, visual-rescue, student-cards-gate)
> - **Offline WASM Camera Decoder:** 100% offline verification in packaged `تِبيان.exe` (QR & Code128 decoded `TB-0042`, 0 network requests)
> - **Bundled WASM Asset:** `apps/desktop/public/assets/wasm/zxing_reader.wasm` (SHA-256: `2EBDA08A93EEA3EFCD8399CDA6B276E6A0B1DE4FEC60B4D8988A047DE4C6D1BA`)
> - **Typecheck:** 0 errors across 5 workspace packages
> - **Schema Drift:** 0 (clean drizzle-kit generation)
> - **Official Logo SHA-256:** `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`
> - **Phase 2 — Task 4 of 5 Status:** NOT_STARTED (Ready for implementation planning)

---

## 1. Phase 2 — Task 3 Accomplishments Summary

1. **Complete Removal of Student Photos Systemwide:**
   - Removed photo table column and avatar placeholders from Students workspace (`StudentsPage`).
   - Removed photo upload/camera/avatar UI from student profile (`StudentProfilePage`) and creation flow (`StudentCreateModal`).
   - Legacy `photo_path` field in SQLite retained as dormant for database backwards compatibility without destructive schema migrations.
   - Clean, high-contrast, professional typography throughout student views.

2. **Full & Economical Student Card Designs (`StudentCard`):**
   - **Full Student Card:**
     - Side-by-side layout: dominant machine-readable code area on one side, Arabic RTL information block on the other.
     - Student full name prominently displayed, `studentCode`, grade, authoritative teacher name, and official Tibyan logo.
     - Large, high-contrast QR code with quiet zone; Code128 barcode with human-readable text.
     - Omitted age completely in strict adherence to domain rules (no canonical birthdate in schema).
     - Controlled SVG rendering using `qrcode-generator@2.0.4` without `dangerouslySetInnerHTML`.
   - **Simplified / Economical Card:**
     - Pure white background with minimal ink usage for cheap replacement.
     - Dominant black/white QR code and Code128.
     - Essential metadata (student name, code, grade, teacher name, subtle logo).

3. **Authoritative Teacher Display Name:**
   - Teacher name dynamically extracted from active session identity via `useAuthStore((s) => s.session?.fullName)`.
   - Prop-overridable (`teacherName`), never hardcoded.

4. **A4 6-Up Deterministic Printing & PDF Export:**
   - Exactly 6 cards per A4 portrait page (2 columns × 3 rows).
   - Deterministic physical millimeter dimensions (`85.6mm × 54mm` standard ID-1 card size).
   - Zero card splitting or clipping across page breaks (`break-inside: avoid; page-break-inside: avoid`).
   - Clean pagination: 6 students = 1 page; 7 students = 2 pages; 12 students = 2 full pages; 13 students = 3 pages.
   - Electron native print IPC (`printStudentCards`) and PDF export IPC (`exportStudentCardsPdf`) with security sender validation.

5. **Preview Modal Experience:**
   - Interactive variant switcher ("البطاقة الكاملة" / "البطاقة الاقتصادية").
   - Live single card preview and full A4 sheet grid preview.
   - Batch selection from Students workspace with bulk printing and PDF generation.

---

## 2. Immediate Next Task: Phase 2 — Task 4 of 5

**Phase 2 — Task 4 of 5: Finance & Subscriptions**

- **Scope & Core Objectives:**
  1. **Financial Ledger & Fee Structures:**
     - Group pricing models (per-session, monthly subscription, package).
     - Student payment tracking and enrollment fee status.
  2. **Subscription Management & Payment Recording:**
     - Recording student payments, issuing receipts, partial payments, and discounts.
     - Audit logging for all financial mutations.
  3. **Thermal Receipt Generation:**
     - 80mm / 58mm thermal receipt layout with teacher branding, transaction details, and scannable receipt identifier.
  4. **Financial Reporting & Outstanding Balances:**
     - Unpaid balance tracking per student and group.
     - Session revenue summary and teacher cashflow ledger.
