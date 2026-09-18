# Task 17 Execution Context — Windows Packaging Verification, Playwright Smoke Tests & Hardening

> **Notice:** This document contains targeted execution context specifically for **Task 17**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.
>
> **Task 17 Status:** **NOT STARTED** (Zero Task 17 code or test files have been created).
>
> **CRITICAL PROCESS GOVERNANCE RULE:**  
> When beginning Task 17, the agent must operate in **PLANNING_ONLY** mode first. The agent **MUST formulate an implementation plan and TERMINATE the turn to await explicit user approval** before any production code, test file, or package configuration is modified. Execution without a prior separate explicit user approval message is strictly prohibited.

---

## 1. Task Objective

Task 17 is the final task of Phase 1 (Foundation & Desktop Core). Its objective is to verify end-to-end operational readiness of the Tibyan desktop application:
1. **Production ASAR Packaging Verification:**
   - Verify `electron-builder` configuration in `apps/desktop/package.json`.
   - Ensure native dependency `better-sqlite3` is properly unpacked via `asarUnpack: ["**/better-sqlite3/**"]` and loadable in packaged runtime.
2. **Playwright E2E Smoke Tests (`apps/desktop/e2e/smoke.spec.ts`):**
   - Launch Electron application executable in test harness.
   - Verify First-Run Wizard flow (initial setup, Owner creation, academic year initialization).
   - Verify PIN login screen and successful authentication.
   - Verify navigation to Students, Groups, Today Dashboard, and Settings.
   - Verify that offline typography, Cairo/Inter fonts, and the official logo render without network requests.
3. **Packaging Build & Verification:**
   - Execute production package script (`pnpm --filter @tibyan/desktop package` / `electron-builder --dir`).
   - Validate that the output bundle does not leak internal source maps or uncompiled TypeScript files.
4. **Final Phase 1 Security & Architectural Audit:**
   - Re-verify zero prohibited renderer imports across all desktop code.
   - Verify that all database migrations are applied cleanly on fresh installation.
   - Verify that official logo SHA-256 remains `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`.

---

## 2. Key Files for Task 17

```text
apps/desktop/
├─ package.json                    # electron-builder packaging config
├─ playwright.config.ts            # Playwright Electron test configuration
├─ e2e/
│  └─ smoke.spec.ts                # End-to-end smoke test suite
└─ electron/
   └─ main.ts                      # Main entrypoint packaging guards
```

---

## 3. Mandatory Non-Negotiable Invariants

1. **Planning Approval Gate:**
   - Planning mode is mandatory. Formulate `implementation_plan.md` and wait for explicit user approval before touching code.
2. **Better-SQLite3 Native Unpack:**
   - `better-sqlite3.node` MUST remain in `asarUnpack` so the Windows binary loads without dynamic compilation errors.
3. **100% Offline Integrity:**
   - Zero outbound HTTP/HTTPS requests during launch, wizard, login, navigation, or settings.
4. **Preserve Exact Official Logo Hash:**
   - `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749` at `packages/design-system/src/assets/tibyan-official-logo.png`.
5. **No Local AI Runtimes:**
   - No Ollama, no ONNX, no local LLM weights.
