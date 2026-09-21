# Tibyan Phase 4 — Exam Engine Design

**Status:** Approved by Product Owner, 2026-09-20

## Goal

Enable a teacher to assemble, review, confirm, print, and export professional Arabic mathematics exams from the existing Question Bank. Gemini may supply structured candidates, but Core-owned deterministic rules and explicit teacher confirmation are authoritative.

## Boundaries

- Gemini is the only Phase 4 AI provider. Use HTTPS `fetch`; add no SDK, package, plugin, or skill.
- The renderer receives no API key and has no direct database, filesystem, Node, Core, or generic IPC access.
- All AI data is untrusted. It is Zod-parsed twice (provider boundary and command boundary), resolves only locally selected IDs, and remains a proposal until confirmation.
- Credentials are stored only as Electron `safeStorage` ciphertext in System DB settings. Audit events contain provider/model/status/counts, never tokens, prompts, or secret material.
- Exam records, sections, placements, variants, layout, and immutable snapshots live in the active Academic DB. System references remain snapshots/IDs without cross-database FKs.
- No Phase 5 capture/grading/analytics, Phase 6 general assistant, Phase 7 mobile/LAN, local model, CAS, or CAD behavior.

## Domain model

`ExamBlueprint` is a teacher-editable constraint document: audience, selected curriculum/source IDs, requested type/difficulty distribution, count, marks, duration, and variant count. The deterministic `ExamBlueprintValidator` reports actionable conflicts before persistence.

`Exam` is a separate structured document with metadata, sections, placements, layout, and status (`DRAFT`, `CONFIRMED`, `ARCHIVED`). A placement snapshots its Question Bank content plus provenance (`QUESTION_BANK` or `AI_CANDIDATE`), marks and answer-space settings; confirmed exams are never silently overwritten. `ExamVersion` holds A–D ordering/replacements and its corresponding answer-key snapshot.

AI candidates are transient validated proposals. Confirming a candidate either creates an explicitly approved Question Bank record or adds it as an immutable exam placement; both actions are audited and support Core-managed undo while the action is the latest reversible mutation.

## AI flow

The renderer asks Main to preview an AI operation. Main authorizes the teacher, validates the blueprint and selected local references, builds a minimum safe provider payload without database IDs or arbitrary commands, and calls Core's Gemini adapter with an abort signal, bounded timeout, and one transient retry. The adapter requires JSON structured output and parses it with `AiExamCandidateSchema`. Main returns candidates only. A separate confirm IPC accepts selected proposal content, revalidates it, resolves curriculum/source IDs from the server-side selection, detects duplicates, executes an audited transaction, and exposes a narrow undo operation.

## Math and geometry

Phase 3 `MathRichContent` remains canonical. Geometry v1 is a deterministic declarative scene: dimensions, viewport, and bounded primitives (point, segment, line, ray, circle, arc, polygon/triangle, angle, dimension, axis, vector, annotation). Core validates coordinates/references and serializes sanitized deterministic SVG. The renderer displays only generated SVG with no script, URL, event, or presentation-state fields. KaTeX remains offline and isolated LTR inside Arabic RTL containers.

## Layout and export

`ExamLayoutEngine` transforms an exam snapshot into deterministic printable HTML. It uses A4 `@page`, fixed margins, locally bundled fonts/KaTeX, explicit section/question keep-together rules, controlled answer-space blocks, and page-break hints. Renderer preview and hidden BrowserWindow print share the same markup. Main exports through Electron `webContents.printToPDF` and prints through a dedicated hidden window; paths are selected/validated by Main only. Student, teacher, and answer-key views share the snapshot but vary answer visibility.

## Teacher workflow

The Exam Builder page guides: blueprint → deterministic validation → Question Bank assembly or Gemini preview → edit/reorder/replace → explicit confirm → A4 preview → export/print. Each provenance source is visible. Regeneration only replaces a draft placement after a teacher choice; it never changes confirmed content.

## Acceptance evidence

Focused contract/core/UI tests cover malformed provider output, secret non-exposure, confirmation/undo/audit, balancing conflicts, duplicate rejection, SVG determinism/sanitization, BiDi rendering, pagination, variants, and print HTML. Final verification performs the complete required typecheck, test, migration/drift, Phase 3 upgrade, package, E2E, logo-hash, and screenshot checks once.
