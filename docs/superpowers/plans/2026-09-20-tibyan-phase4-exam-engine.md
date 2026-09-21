# Tibyan Phase 4 Exam Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure AI-assisted, deterministic, Arabic-first exam assembly, geometry, A4 preview, printing, and PDF export.

**Architecture:** Core owns provider access, validation, balancing, persistence, geometry serialization, and layout snapshots. Electron Main exposes narrow Zod IPC. The React renderer only displays and edits proposals through the preload bridge.

**Tech Stack:** TypeScript, Zod, Drizzle/SQLite, Electron safeStorage/BrowserWindow/printToPDF, React, local KaTeX, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-tibyan-phase4-exam-engine-design.md`

## Global Constraints

- Gemini only, platform `fetch`, no Gemini SDK or any new dependency.
- Never expose API credentials, direct SQL, filesystem paths, raw IPC, or Core authority to the renderer or AI.
- Keep AI output as a Zod-validated proposal until explicit confirmation, audited execution, and undo.
- Reuse Question Bank, source references, curriculum tags, duplicate detection, MathRichContent, GeometryEnvelopeBlock, local KaTeX, and academic audit conventions.
- Preserve DB separation, Electron hardening, offline geometry/print assets, and official logo SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

## Review Focus

- Provider returns JSON with unknown IDs or extra fields: reject before any mutation.
- Gemini key is absent, encrypted-storage unavailable, timed out, or request cancelled: return Arabic-safe failure without leaking data.
- Blueprint totals/type/difficulty/source constraints conflict: return deterministic actionable errors before preview or confirmation.
- Candidate duplicates an existing Question Bank item: flag/reject per teacher-selected replacement without overwrite.
- Geometry/print content includes unsafe SVG or cannot fit a page: sanitize and keep whole question or use an explicit controlled break.

---

### Task 1: Contracts, academic persistence, and exam repository

**Files:** Create exam DTO/enums/repository tests; modify contracts exports, academic schema, migration journal, DB exports.

**Interfaces:** Produce `ExamBlueprintSchema`, `ExamDto`, `ExamPlacementDto`, `ExamVersionDto`, and `ExamRepository` CRUD/snapshot operations.

- [ ] Write contract and DB tests for valid model, invalid distribution/marks, snapshot persistence, and no cross-DB FK.
- [ ] Implement strict Zod discriminated DTOs and Drizzle tables (`exams`, `exam_sections`, `exam_questions`, `exam_versions`) with required indexes/checks; generate the Academic migration.
- [ ] Run focused contracts/DB tests and commit `feat(exams): add exam domain persistence`.

### Task 2: Deterministic blueprint, assembly, audit, and undo

**Files:** Create `packages/core/src/exams/{blueprint-validator,exam.service,exam-balancer}.ts`; modify Core exports; create core tests.

**Interfaces:** Produce `validateExamBlueprint(blueprint, questions): BlueprintValidationResult`, `ExamService.previewAssembly`, `confirmAssembly`, and `undoLastMutation`.

- [ ] Write failing tests for impossible counts/marks/distributions, duplicate detection, confirmation audit records, and reversible latest mutation.
- [ ] Implement server-owned Question Bank filtering, deterministic selection/balancing, immutable placement snapshots, transaction/audit/undo behavior, and Arabic validation messages.
- [ ] Run focused Core tests and commit `feat(exams): add deterministic assembly and audit workflow`.

### Task 3: Gemini provider and safe AI candidate flow

**Files:** Create `packages/core/src/ai/{gemini-provider,ai-exam.service,credential-store}.ts`; modify system settings repository/Core exports; create focused tests.

**Interfaces:** Produce `GeminiExamProvider.preview(request, signal)`, `AiExamCandidateSchema`, and `AiExamService.previewCandidates`.

- [ ] Write failing tests for malformed structured output, foreign IDs, timeout/cancellation/retry, secret-free audit metadata, and encrypted credential round trip.
- [ ] Implement Core-owned `fetch` adapter with JSON-only Gemini response parsing, safeStorage ciphertext storage, bounded retry, request abort, and local reference resolution.
- [ ] Run focused Core tests and commit `feat(ai): add secure Gemini exam candidate provider`.

### Task 4: Deterministic geometry v1 and MathRichContent integration

**Files:** Create geometry contracts/service/tests; modify MathRichContent DTO/sanitizer/viewer exports and tests.

**Interfaces:** Produce `GeometrySceneSchema`, `renderGeometrySvg(scene): string`, and `createGeometryEnvelope(scene)`.

- [ ] Write failing tests for primitive bounds/references, deterministic SVG output, unsafe annotation rejection, and LTR mathematical labels in RTL content.
- [ ] Implement the bounded primitive set and Core SVG renderer; preserve envelope v1 and render generated SVG without dangerous DOM capability.
- [ ] Run focused geometry/design-system tests and commit `feat(geometry): add deterministic exam diagram engine`.

### Task 5: Exam IPC, preload, hooks, and teacher review UI

**Files:** Create exam IPC/hooks/features/tests; modify channels/API/preload/router/navigation/runtime registration.

**Interfaces:** Produce narrow `window.tibyan.exams.*` commands for blueprint validation, AI preview, confirmation, undo, variants, and print preview data.

- [ ] Write UI/IPC tests proving sender/payload/permission validation, proposal-only AI display, explicit confirmation, provenance badges, candidate regeneration, and no direct database/Core access.
- [ ] Implement the Arabic-first wizard, Question Bank assembly, candidate editor/replacement controls, variant manager, and review/confirm state.
- [ ] Run focused desktop tests and commit `feat(desktop): add exam builder review workflow`.

### Task 6: A4 layout, preview, direct print, and PDF export

**Files:** Create Core layout and desktop print IPC/components/tests; modify Electron runtime/main security integration.

**Interfaces:** Produce `ExamLayoutEngine.render(snapshot, outputKind)`, `exams.exportPdf`, and `exams.print`.

- [ ] Write failing tests for deterministic markup, A4/RTL/BiDi rules, no unsafe URLs, answer-key visibility, keep-together/page-break rules, and hidden-window export calls.
- [ ] Implement snapshot-to-print HTML, preview, `printToPDF`, direct print, main-owned save path validation, and local KaTeX/font/geometry asset handling.
- [ ] Run focused Core/desktop tests and commit `feat(print): add professional A4 exam output`.

### Task 7: Final integration and one comprehensive verification cycle

**Files:** Create Phase 4 Playwright workflow and visual-gate specs/screenshots; update handoff only if required.

- [ ] Add packaged E2E for blueprint → bank/AI proposal → review/confirm → variant → A4 preview → PDF and focused regression coverage.
- [ ] Run once: `pnpm -r typecheck`, `pnpm test`, DB generation/drift, Phase 3 upgrade, `pnpm pack`, packaged E2E, logo SHA-256, and capture final screenshots.
- [ ] Commit `test(phase4): add final workflow verification`, push branch, open the single PR, and post `PHASE_4_IMPLEMENTATION_STATUS=READY_FOR_FINAL_REVIEW`.

## Self-review

All approved subsystems map to Tasks 1–6; Task 7 is evidence only. The plan contains no dependency additions, local model/CAS/CAD/grading scope, or server-side authority in the renderer. Review-focus cases are assigned respectively to Tasks 3, 3, 2, 2, and 4/6.
