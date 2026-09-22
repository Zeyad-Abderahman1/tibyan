# Tibyan UI Scale, Startup, and Lock Experience Design

## Intent

Make the existing Windows desktop application feel naturally sized and premium at 1600×900 while remaining fully usable at 1366×768. Preserve the current right-navigation architecture, real dashboard data, authentication, IPC, database, and AI workflows.

## Scale system

The application keeps a 16px root and uses authoritative semantic tokens rather than Electron zoom. Body text rises from 15px to 16px, supporting text from 14px to 15px, captions from 12px to 13px, and shell/component classes are adjusted where Tailwind fixed sizes bypass tokens. Compact/default/large controls become 36/44/52px. The top utility bar becomes 58px. Sidebar widths remain 224/64px to protect 1366px workspace space, while labels, icons, hit areas, table rows, KPI numbers, card padding, and workspace gutters increase selectively.

## Teacher identity

The top bar presents a 38px `TeacherAvatar`, name, role, logout, and theme controls as one compact identity cluster. `TeacherAvatar` renders a real `photoUrl` with `object-fit: cover` when supplied; current session contracts contain no profile image field, so production uses a premium Arabic initial fallback without inventing a portrait or changing persistence contracts.

## Startup lifecycle

The Electron window is constructed with `show: false` and a neutral navy background. A tiny, local, application-owned splash document is loaded first and the window is shown only after that document reaches `ready-to-show`. Runtime initialization, migrations, protocol registration, and IPC registration continue behind the visible splash. The production renderer then replaces the splash in the same window; its React bootstrap state retains the same Tibyan visual language while setup and session queries resolve. Startup failures replace the splash status with a readable Arabic error instead of leaving a blank window. No artificial delay is introduced.

## Loading and lock states

`StartupLoadingScreen` is a reusable, theme-aware full-window component with the official Tibyan identity, Arabic subtitle/status, a subtle three-bar CSS indicator, and reduced-motion behavior inherited from the design system. `RootLayout` uses it until setup and session restoration finish. `LoginScreen` remains the lock/authentication boundary and keeps the existing four-digit PIN flow, account cooldown, user switching, and cache isolation. Its presentation becomes a focused lock card with brand, 48px user avatar, teacher name, locked-state Arabic copy, and light/dark surfaces.

## Error and security behavior

Electron startup errors are caught at the main-process bootstrap boundary, logged, and rendered into the splash document using safely encoded text. BrowserWindow security preferences and navigation guards remain unchanged. The renderer session error stays retryable and distinct from loading, empty, and unauthenticated states. No PIN, session, migration, or authorization behavior changes.

## Verification

Unit tests pin the 58px top bar token, 38px avatar, photo/fallback behavior, right sidebar ordering, startup splash markup, hidden-until-ready BrowserWindow lifecycle, renderer loading/error transitions, and unchanged lock/auth controls. Packaged Playwright verification covers light/dark startup and lock screens, expanded/collapsed shell geometry, real dashboard KPIs, 1366×768 and 1600×900 overflow, cold start, and a second launch against the same data directory.

