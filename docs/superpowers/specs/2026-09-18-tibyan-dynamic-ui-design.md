# تِبيان (Tibyan) — Dynamic Visual System & Dynamic Island Architecture Specification

> **Document Version:** 1.0.0  
> **Date:** 2026-09-18  
> **Classification:** Authoritative Architectural Design Spec (Planning Only)  
> **Scope:** Desktop Application Visual Overhaul, Shell Modernization & Interaction System  
> **Canonical Baseline:** Tasks 1–18 Complete; Task 18 Hardened (`6e61eac` / `c923f4b`); UI Usability Commit (`8c14dd9`); 548 tests passing; Task 19 NOT_STARTED.

---

## 1. Executive Summary & Design Vision

### 1.1 The Core Thesis
**تِبيان (Tibyan)** is a local-first, Windows-first Teacher Operating System crafted specifically for an independent Egyptian mathematics educator teaching grades Prep 1 through Sec 3 across both the General National and Egyptian Baccalaureate curricula.

The user experience target is balanced at:
- **70% High-Focus Productivity Craftsmanship:** Inspired by modern desktop benchmarks (Linear, Notion, macOS/Windows desktop craftsmanship), emphasizing speed, low cognitive fatigue, fluid transitions, and clear spatial hierarchy.
- **30% Educational Domain Intelligence:** Tailored specifically for Egyptian math tutoring workflows, group scheduling, and student accountability.

### 1.2 The Shift: From Admin Dashboard to Dynamic Living Shell
Until now, Tibyan utilized a traditional enterprise admin shell: a rigid, full-height 256px right sidebar coupled with a static 56px top header. While functional during Phase 1 foundation building, this structure imposes significant UX friction:
- It locks ~25% of horizontal desktop real estate into a static column even when the teacher is doing focused tasks like grading, scanning attendance, or reviewing schedules.
- The interface feels static and utilitarian rather than alive, modern, and commercial-grade.
- State transitions (switching tabs or navigating) are binary swaps with zero spatial continuity.

The **Tibyan Dynamic Island System** replaces this rigid framework with a cohesive, floating, context-adaptive interaction shell. The navigation floats cleanly above the canvas, adapts its width and contextual tools depending on the active workflow, glides its active pill indicator with smooth physics, and integrates teacher profile, academic year, and system controls into a unified, high-craft bar.

### 1.3 Reference Analysis: Learning from Englizeka (Without Copying)
The user designated **[https://englezika.com/](https://englezika.com/)** as interaction/motion inspiration.

#### Principles Adopted from Reference:
1. **Floating Island Capsule:** Navigation elements live inside a cohesive floating surface with rounded radii and soft elevation rather than touching the screen borders.
2. **Gliding Active Indicator:** The active navigation state glides smoothly between tabs rather than abruptly blinking into existence.
3. **Layered Surface Depth:** Soft background blur (`backdrop-filter: blur(...)`), crisp border boundaries, and subtle drop shadows establish a distinct z-index layering above the working page canvas.
4. **Fluid Micro-Interactions:** Buttons and interactive pills lift gently on hover with subtle border glow and organic spring-like easing.
5. **Polished Dark Mode Integration:** Theme changes animate smoothly without harsh flashes, maintaining deliberate contrast for text, icons, and borders.

#### Explicit Principles Rejected to Preserve Tibyan's Identity:
1. **NO Pink/Red Palette:** Tibyan's identity is anchored in **Petrol Navy (`#0B3D3D`)**, **Supporting Teal (`#1F6E68`)**, and **Restrained Muted Gold (`#C59B27`)**. Under no circumstances will Englizeka's marketing red/pink palette be used.
2. **NO Consumer Marketing Hero Paradigms:** Tibyan is a professional productivity tool for a math teacher, not a landing page or course marketing site. Data density, table readability, and numerical clarity take precedence over oversized promotional cards.
3. **NO Asset Distortion:** The official Tibyan logo raster bytes (SHA-256 `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749`) remain 100% immutable.
4. **NO Heavy Runtime Dependencies:** Englizeka uses heavy web frameworks. Tibyan's desktop application requires fast native 60fps performance on standard Windows laptops with zero bundle bloat and zero extra JS animation runtime overhead.

---

## 2. Current UI Audit: Shortcomings & Static Admin Friction

| Current Component | Current Behavior & Shortcomings | Impact on Teacher Workflow |
| :--- | :--- | :--- |
| **Sidebar (`Sidebar.tsx`)** | Rigid 256px wide static vertical column docked to the right. Permanent borders, flat icon list, zero adaptability. | Consumes horizontal width on laptops (1366x768 / 1280x800). Causes tables and rosters to feel cramped. |
| **TopBar (`Topbar.tsx`)** | Static 56px header row docked to the top. Academic year on far right, user info on left. Detached from page context. | Acts as empty wasted space on middle resolutions. Provides no contextual tools for the current screen. |
| **Active Navigation State** | Binary CSS class toggle (`bg-[var(--color-brand-primary)] text-white`). Abruptly jumps between destinations on click. | Visual experience feels mechanical and unpolished. Lacks spatial continuity. |
| **Page Headers** | Every screen (`TodayPage`, `StudentsPage`, `GroupsPage`, `SettingsPage`) renders its own full-width static `<h1>` + description header with duplicate search/action bars. | Pushes actual student and group data down below the fold, forcing unnecessary scrolling. |
| **Cards & Surfaces** | Flat rectangular boxes with simple `border-[var(--color-border-subtle)]` and no depth layering. | Monotonous "spreadsheet/admin" appearance. Difficult to distinguish primary interactive zones from static cards. |
| **Hover & Active States** | Instant color replacement without easing or spring transitions. | Feels unresponsive or stiff on Windows desktop environments. |

---

## 3. The Tibyan Dynamic Island Architecture

```
+--------------------------------------------------------------------------------------------------+
|                                    WINDOWS TITLEBAR (NATIVE CONTROLS)                            |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|         +------------------------------------------------------------------------------+         |
|         |                      TIBYAN DYNAMIC FLOATING ISLAND                          |         |
|         |  [Logo + تِبيان]  |  (اليوم)  (الطلاب)  (المجموعات)  (الحضور)  (المالية)  (الإعدادات) |  [Context Tools]  |  [2026-2027]  [User]  [Theme] |         |
|         +------------------------------------------------------------------------------+         |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   |                                                                                          |   |
|   |                               PAGE CANVAS / WORKSPACE STAGE                              |   |
|   |                                                                                          |   |
|   |    - High focus workspace with soft rounded container                                    |   |
|   |    - Smooth route transitions with subtle fade-scale                                     |   |
|   |    - Dedicated data density for student rosters, schedules, and attendance               |   |
|   |                                                                                          |   |
|   +------------------------------------------------------------------------------------------+   |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

### 3.1 Island Anatomy & Three Segment Architecture
The Dynamic Island sits pinned at the top-center of the viewport, suspended 16px from the window top, floating cleanly over the page canvas. It is divided into three harmonious segments:

1. **Brand Anchor (Trailing / Right side in RTL):**
   - Compact official logo emblem (1:1 framed badge with rounded-lg corners and subtle border).
   - Wordmark: Bold `تِبيان` in Cairo typography with subtle gradient/accent highlight.
   - Status pip: Compact green dot signaling local-first offline SQLite health.

2. **Core Navigation Carousel (Center Segment):**
   - The primary navigation links:
     1. `اليوم` (`/` - Today Dashboard)
     2. `الطلاب` (`/students` - Students Directory)
     3. `المجموعات` (`/groups` - Groups & Sessions)
     4. `الحضور` (`/attendance` - Attendance Quick Check-In placeholder slot for Task 19)
     5. `المالية` (`/finance` - Fees & Ledger placeholder slot)
     6. `الإعدادات` (`/settings` - System Settings & Academic Year)
   - **Gliding Capsule Track:** A background slider that measures the active item's width and position, smoothly gliding with spring-like physics (`cubic-bezier(0.16, 1, 0.3, 1)`) when switching tabs.

3. **Contextual Workspace & System Cluster (Leading / Left side in RTL):**
   - **Context Zone:** Dynamically morphs depending on the active route:
     - On **اليوم**: Date badge (`الجمعة، 18 سبتمبر`) and refresh trigger.
     - On **الطلاب**: Inline quick search input and `+ طالب جديد` primary pill.
     - On **المجموعات**: Grade level filter and `+ مجموعة جديدة` primary pill.
     - On **الحضور** (Task 19 ready): Active group selector and scanner mode indicator.
     - On **المالية**: Month picker and summary balance pill.
     - On **الإعدادات**: Active settings section indicator.
   - **System Controls:**
     - Active Academic Year Badge (high-contrast teal pill).
     - Teacher Avatar & Role Badge (Owner / Assistant).
     - Animated Theme Switcher (Moon / Sun transition).
     - Logout trigger with confirmation micro-modal.

### 3.2 Responsive Behavior Across Windows Desktop Resolutions
- **Full Desktop (>= 1440px):** All three segments display simultaneously in full glory with expanded labels and inline contextual search.
- **Standard Laptop (1150px - 1439px):** Contextual search collapses into an expandable search pill button; navigation labels remain visible.
- **Compact Window (1024px - 1149px):** Navigation transitions into icon + short label; contextual tools collapse to primary icon action buttons; island automatically adjusts padding and width to avoid any truncation or overflow.

---

## 4. Visual Language & Token System

### 4.1 Color Palette & Semantic Tokens

```
==================================================================================
TIBYAN BRAND IDENTITIES
==================================================================================
Primary Petrol Teal:    #0B3D3D   (Light Primary) / #5EEAD4 (Dark High-Contrast)
Supporting Teal:        #1F6E68   (Midtones / Accents / Badges)
Muted Gold Accent:      #C59B27   (Hover: #B38728 / Dark Glow: #D4AF37)
==================================================================================
```

#### Light Mode Tokens:
- **Canvas App Background:** `#F8FAFC` (Slate-50 with soft teal undertone).
- **Floating Island Surface:** `rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(16px)` and `-webkit-backdrop-filter: blur(16px)`.
- **Card / Stage Surface:** `#FFFFFF` (Crisp white with `rgba(11, 61, 61, 0.05)` subtle border).
- **Surface Subtle:** `#F1F5F9` (Muted action backgrounds, inactive pills).
- **Text Primary:** `#0F172A` (Slate-900).
- **Text Secondary:** `#475569` (Slate-600).
- **Text Muted:** `#64748B` (Slate-500).
- **Border Subtle:** `rgba(226, 232, 240, 0.8)` (`#E2E8F0`).
- **Border Strong:** `rgba(203, 213, 225, 0.8)` (`#CBD5E1`).
- **Island Shadow:** `0 10px 30px -8px rgba(11, 61, 61, 0.08), 0 4px 12px -2px rgba(11, 61, 61, 0.04)`.

#### Dark Mode Tokens:
- **Canvas App Background:** `#081013` (Deep petrol obsidian, never raw black `#000000`).
- **Floating Island Surface:** `rgba(15, 31, 36, 0.85)` with `backdrop-filter: blur(16px)`.
- **Card / Stage Surface:** `#0F1F24` (Subtle teal-slate elevated card surface).
- **Surface Subtle:** `#162B32` (Pill backgrounds and secondary button surfaces).
- **Surface Elevated:** `#1C353D` (Modals, popovers, dropdown menus).
- **Text Primary:** `#F8FAFC` (Slate-50, crisp and radiant).
- **Text Secondary:** `#94A3B8` (Slate-400, high legibility).
- **Text Muted:** `#64748B` (Slate-500).
- **Border Subtle:** `rgba(30, 59, 68, 0.8)` (`#1E3B44`).
- **Border Strong:** `rgba(45, 212, 191, 0.25)` (Refined mint-teal border glow for active elements).
- **Active Navigation Pill:** `rgba(45, 212, 191, 0.15)` background with `#5EEAD4` text and `rgba(45, 212, 191, 0.35)` border.
- **Island Shadow:** `0 12px 40px -8px rgba(0, 0, 0, 0.6), 0 4px 16px -2px rgba(0, 0, 0, 0.4)`.

### 4.2 Elevation, Radii & Depth
- **Border Radii:**
  - `radius-sm`: `6px` (Micro-badges, pin boxes).
  - `radius-md`: `10px` (Buttons, inputs, nav pills).
  - `radius-lg`: `14px` (Card elements, dropdown containers).
  - `radius-xl`: `18px` (Floating Island Shell, modals).
  - `radius-2xl`: `24px` (Main workspace stage viewport container).
  - `radius-full`: `9999px` (Gliding active pills, status dots, circular action triggers).

---

## 5. Motion Language & Animation Architecture

### 5.1 Animation Dependency Evaluation & Decision
- **Options Evaluated:**
  1. `framer-motion` / `motion`: Heavyweight (+40kB minified), runtime layout-measurement overhead, complicates Vitest static markup tests.
  2. Native CSS Transitions & Keyframes: Zero bundle size, GPU-accelerated directly in Chromium compositor thread, 100% compatible with Vitest SSR tests, zero lockfile churn.
- **Authoritative Decision:** **Zero new external animation libraries.**
  All spring physics, sliding indicators, fade-scale modals, and island expansions are implemented using **hardware-accelerated CSS custom properties, cubic-bezier timing tokens, and lightweight React state hooks**.

### 5.2 Motion Timing Tokens & Curves
```css
/* Motion Curves */
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);       /* Organic spring feel for active navigation glide and island expand */
--ease-punch:  cubic-bezier(0.4, 0, 0.2, 1);        /* Quick interactive feedback for button press and hover */
--ease-fade:   cubic-bezier(0, 0, 0.2, 1);          /* Graceful entrance/exit for tooltips and badges */

/* Duration Tokens */
--duration-fast:    150ms;                          /* Hover, active state, checkbox */
--duration-normal:  250ms;                          /* Tab glide, dropdown reveal, card expand */
--duration-slow:    350ms;                          /* Modal backdrop, island width morph */
```

### 5.3 Gliding Capsule Navigation Indicator
Instead of abruptly changing background colors, the navigation track calculates the active link's relative offset and width via a lightweight ref. A single highlight capsule smoothly animates across the navigation bar using `transform: translate3d(var(--active-x), 0, 0)` and `width: var(--active-width)`.

### 5.4 Respecting `prefers-reduced-motion`
Accessibility is paramount. When the user enables reduced motion in Windows or OS settings:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
All state transitions remain immediate and fully functional, ensuring zero layout shift and zero motion sickness.

---

## 6. Screen-by-Screen Modernization Plan

### 6.1 AppShell & Workspace Stage
- Remove the rigid 256px vertical right sidebar and 56px static top bar.
- Introduce `DynamicIslandShell.tsx`: Houses the floating navigation capsule suspended at the top.
- Introduce `WorkspaceStage.tsx`: A softly rounded, elevated main viewport canvas (`rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 shadow-sm`).
- Page contents render cleanly inside the workspace stage with fluid scrollbars that tuck seamlessly within the canvas.

### 6.2 Today Dashboard (`TodayPage.tsx`)
- Transform the dashboard into an executive command center.
- Dynamic greeting: `أهلاً بك يا أستاذ [الاسم]` with live Arabic day/date indicator.
- Metric cards (Scheduled Sessions, Total Expected Students, Attention Alerts) receive soft gradient borders and subtle lift-on-hover.
- Session schedule cards adopt a modern timeline format with high-contrast status chips.

### 6.3 Students Directory (`StudentsPage.tsx`)
- Remove the redundant static header; search and `+ طالب جديد` move into the Dynamic Island context bar or stage action ribbon.
- Table modernization: Rounded table container with floating rows, soft zebra striping on hover, high-contrast badges for grade levels and systems.
- Smooth filter expansion bar for filtering by system (General / Egyptian Baccalaureate) and grade level.

### 6.4 Groups & Sessions (`GroupsPage.tsx`)
- Card grid displays active student counts, schedule timings, and room/mode info with modern typography.
- Group cards feature a subtle brand gold indicator for active academic year status.
- Session launching shortcuts transition smoothly into Task 19 readiness.

### 6.5 Settings (`SettingsPage.tsx`)
- Tabbed interface (Appearance & Themes, Academic Year Switcher, User Management, Database Backups) organized into sleek segmented pills.
- Theme selector cards enhanced with live preview chips and smooth selection borders.

### 6.6 Login Screen & First-Run Wizard
- Both pre-auth screens adopt the refined typography, rounded elevated cards (`rounded-2xl`), and framed brand seal logo treatment without modifying a single byte of the official PNG.

---

## 7. Logo & Brand Asset Integrity

- **Asset Path:** `packages/design-system/src/assets/tibyan-official-logo.png`
- **Asset SHA-256:** `66BFBEF03BE0E7EE99CDBE147C13859E92AC9071A9E8AC47F681EE30D0254749` (Mandatory, Immutable).
- **Container Styling:**
  In both light and dark themes, the official logo is presented within a custom-proportioned, softly rounded brand seal:
  ```tsx
  <div className="inline-flex items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 dark:border-teal-900/60 shadow-xs">
    <Logo size="sm" alt="تِبيان" />
  </div>
  ```
  This cleanly encapsulates the white raster background of the official emblem, framing it like an authentic gold-and-teal medallion in dark mode.

---

## 8. Non-Negotiable Invariants & Architecture Boundaries

1. **Task 19 Remains NOT_STARTED:** Do not begin attendance scanning, camera integration, or rapid roster check-in logic during this UI overhaul.
2. **Zero Domain/Database Changes:** No migrations, schemas, repositories, core services, or IPC channels will be modified. All changes are strictly presentation and layout components.
3. **Electron Security Floor:** `contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`, and all preload boundaries remain intact.
4. **Production Menu Hidden:** `autoHideMenuBar: true`, `mainWindow.setMenuBarVisibility(false)`, and `Menu.setApplicationMenu(null)` remain strictly preserved.
5. **Test Floor:** All 548 existing unit/integration tests and 1 Playwright E2E smoke test must remain 100% green.

---

## 9. Spec Review & Approval Checkpoints

- [x] Placeholder scan complete (no TBDs, TODOs, or vague hand-waves).
- [x] Full alignment with approved brand colors (petrol navy, supporting teal, muted gold).
- [x] Performance verification: zero runtime animation libraries; GPU CSS transitions only.
- [x] Complete RTL and Arabic Cairo typography preservation.
- [x] Ready for implementation plan generation via `superpowers:writing-plans`.
