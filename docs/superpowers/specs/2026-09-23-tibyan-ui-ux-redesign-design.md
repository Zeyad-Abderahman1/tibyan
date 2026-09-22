# Tibyan UI/UX Redesign Design

## Purpose

Redesign the existing Tibyan desktop application into a compact, premium Arabic RTL workspace while preserving routes, IPC contracts, database mounting, Electron security, AI workflows, and established business behavior. The redesign must use authoritative academic-year data and must not create a parallel demo or enter Phase 7.

## Approved Architecture

The application shell has four layers:

1. A 48px top utility bar containing only the official Tibyan identity, active academic year, teacher identity, theme control, and session action.
2. A persistent right-side primary navigation sidebar. It is 224px when expanded, 64px when collapsed, uses icon plus Arabic label when expanded, and stores its state locally.
3. A 52px contextual action island below each page title. It contains only actions and subviews for the current page and scrolls horizontally at constrained desktop widths.
4. One authoritative scrolling workspace. Pages must not introduce nested vertical scroll traps or render behind fixed navigation.

Primary navigation remains: اليوم، الطلاب، المجموعات، تحضير الطلاب، مكتبة المناهج، المالية، تِبيان، الإعدادات.

## Visual System

### Palette

The current petrol-teal-heavy palette is replaced by a navy/indigo system.

- Light background: warm neutral `#F7F6F2`
- Light surface: `#FFFFFF`
- Light muted surface: `#F0F1F4`
- Primary text: deep navy-charcoal `#172033`
- Secondary text: slate `#5D6678`
- Primary: navy `#243B67`
- Primary hover: indigo-navy `#2F4C83`
- Primary active: deep navy `#1B2D50`
- Accent: muted gold `#B38A32`
- Success: professional green `#187A5B`
- Warning: amber `#B66A12`
- Danger: muted red `#B94747`
- Dark background: blue-black `#0C1422`
- Dark surface: `#121D2E`
- Dark elevated surface: `#19263A`
- Dark primary text: off-white `#F3F1EA`

All semantic colors must be exposed through centralized CSS tokens, including application surfaces, borders, text, primary states, status colors, focus, disabled, sidebar, top bar, table header, and table row hover. Muted gold is supporting emphasis only; it is not a general navigation fill.

### Typography

Arabic uses locally bundled Cairo and Latin content uses locally bundled Inter. The scale is 32/24/20/18/15/14/12px for display, page title, section title, subsection, body, small body, and caption. Arabic body line height is 1.6; headings use 1.3–1.5. KPI values use tabular numerals and strong weight without oversized cards.

### Spacing, Controls, and Radius

The spacing scale is 4, 8, 12, 16, 24, 32, and 40px. Default page gutters are 32px at 1600px and 24px at 1366px. Controls use 32px compact, 40px default, and 48px large heights. Radius tokens remain restrained at 4, 6, 8, and 12px; fully rounded treatment is reserved for avatars, badges, and the contextual island shell.

## Dashboard Data Contract

The dashboard is scoped to the authenticated active academic-year database mounted by the Electron runtime.

- `totalEnrolledStudents` means all students whose student status is `ACTIVE` in that database, regardless of whether they currently have a group enrollment.
- `activeGroupsCount` means groups whose status is `ACTIVE`.
- `classes` means concrete sessions whose `effectiveDate` is today.
- `totalStudentsExpectedToday` is the sum of active group enrollments for non-cancelled sessions effective today, following current business rules.

Dashboard queries use the canonical `dashboardKeys` hierarchy. Student create/import/update/delete, group create/update, enrollment mutations, schedule/session mutations, attendance mutations, and active-year switching must invalidate or remove the relevant dashboard queries. No mock or hardcoded values are permitted.

## Dashboard Presentation

The page uses a compact header, one secondary refresh action, a four-card KPI grid, and a balanced sessions/alerts area. Empty states stay within compact panels and explain the next useful action without occupying most of the viewport. Real KPI values are visually dominant; icons and labels remain secondary.

## Tibyan Workspace

The global right sidebar is the only permanent application navigation. Tibyan tools appear in the contextual island. The main area uses a compact premium AI workspace with reduced unused space, preserved attachments, and preserved Preview → Confirm → Execute → Audit → Undo behavior. History opens as a drawer/panel. Gemini branding, Math Engine branding, and raw JSON remain hidden.

## Responsive and Accessibility Requirements

At 1600×900 and 1366×768, the layout must have no page-level horizontal overflow, clipped actions, hidden buttons, or nested vertical scroll traps. Collapsing the sidebar must increase workspace width. Contextual actions may horizontally scroll. Interactive controls require visible focus treatment, readable contrast, accessible names, and minimum practical pointer targets. Light and dark themes share identical geometry.

## Verification

Behavior is developed test-first. Verification includes focused component and service tests, the full monorepo test and typecheck suites, production build, fresh Windows packaging, packaged E2E, and visual inspection of the required light/dark and viewport screenshots. The official logo bytes must remain unchanged. PR #13 remains open and unmerged.
