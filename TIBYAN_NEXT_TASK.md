# Task 12 Execution Context — 4-Digit PIN Authentication Screen & Session Store

> **Notice:** This document contains targeted execution context specifically for **Task 12**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.

---

## 1. Task Objective

Task 12 delivers the authentication user experience for the desktop application:
1. Allow the user to select an active account (Teacher/Owner or Assistant) from available active users.
2. Present the 4-digit PIN pad using the design system `PinPad` primitive.
3. Authenticate against the Main process via `window.tibyan.auth.loginWithPin`.
4. Handle brute-force cooldown: extract `retryAfterSeconds` from `ACCOUNT_LOCKED` error details and display a live countdown timer until retry is unlocked.
5. Cache authenticated session in a lightweight Zustand presentation store (`auth.state.ts`) and provide a convenience hook (`useAuth.ts`).
6. Deliver comprehensive unit tests covering user selection, PIN submission, loading state, error display, and lockout countdown.

---

## 2. Key Files to Create / Modify

```text
apps/desktop/
├─ src/
│  ├─ features/
│  │  └─ auth/
│  │     ├─ UserCard.tsx          # Account selector avatar card
│  │     ├─ LoginScreen.tsx       # Main login screen (user selection + PinPad + cooldown timer)
│  │     └─ auth.state.ts         # Zustand presentation session store
│  ├─ hooks/
│  │  └─ useAuth.ts               # React hook wrapping auth IPC operations
│  └─ app/
│     └─ router.tsx              # Wire LoginScreen into route guard when session is null
└─ tests/
   └─ LoginScreen.test.tsx        # Vitest suite covering Task 12 UI scenarios
```

---

## 3. Actual Current Auth Preload Surface & Contracts

The Electron Main process and `@tibyan/core` already provide complete, verified IPC handlers for Task 12:

### 3.1 Preload Interface (`packages/contracts/src/ipc/api.ts` & `apps/desktop/electron/preload.ts`)
```ts
export interface TibyanApi {
  auth: {
    listUsers(): Promise<IpcResult<UserDto[]>>;
    loginWithPin(input: LoginWithPinInput): Promise<IpcResult<UserSessionDto>>;
    logout(): Promise<IpcResult<void>>;
    getSession(): Promise<IpcResult<UserSessionDto | null>>;
    bootstrapOwner(input: BootstrapOwnerInput): Promise<IpcResult<UserDto>>;
    createUser(input: CreateUserInput): Promise<IpcResult<UserDto>>;
    updatePermissions(input: UpdatePermissionsInput): Promise<IpcResult<void>>;
    changeUserStatus(input: ChangeUserStatusInput): Promise<IpcResult<void>>;
    resetPin(input: ResetUserPinInput): Promise<IpcResult<void>>;
  };
  // ... other domains
}
```

### 3.2 Exact DTO & Input Shapes (`packages/contracts/src/models/auth.dto.ts`)
```ts
export const PinSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 numeric digits');

export const LoginWithPinSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  pin: PinSchema,
});
export type LoginWithPinInput = z.infer<typeof LoginWithPinSchema>;

export interface UserDto {
  id: string;
  fullName: string;
  username: string;
  role: 'OWNER' | 'ASSISTANT';
  status: 'ACTIVE' | 'INACTIVE';
  failedAttempts: number;
  lockedUntil: string | null;
  permissions: PermissionCode[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionDto {
  userId: string;
  fullName: string;
  username: string;
  role: 'OWNER' | 'ASSISTANT';
  permissions: PermissionCode[];
  tokenExpiresAt: string;
}
```

### 3.3 Channel Mappings & Runtime Execution Flow
- **List Users for Login Picker:**
  - Method: `window.tibyan.auth.listUsers()`
  - Channel: `IPC_CHANNELS.AUTH_LIST_USERS` (`'auth:listUsers'`)
  - Main IPC Handler: in `apps/desktop/electron/ipc/auth.ipc.ts`, delegates to `runtime.authService.listLoginUsers()`.
  - Behavior: Returns safe active user accounts (`status === 'ACTIVE'`) with `{ id, fullName, username, role }`. Does not expose cryptographic hashes or salts.
- **Authenticate with PIN:**
  - Method: `window.tibyan.auth.loginWithPin(input: LoginWithPinInput)`
  - Parameter: `{ userId: string, pin: string }` where `userId` is a valid UUID and `pin` is a 4-digit numeric string.
  - Channel: `IPC_CHANNELS.AUTH_LOGIN_PIN` (`'auth:loginPin'`)
  - Main IPC Handler: Validates against `LoginWithPinSchema`, executes `runtime.authService.loginWithPin(validated)`, sets `runtime.setSession(session)` in Main, and returns `session`.
  - Error Cases:
    - Code `'ACCOUNT_LOCKED'` with `details: { retryAfterSeconds: number }` if the account is in brute-force cooldown.
    - Code `'INVALID_PIN'` on mismatched credentials.
- **Get Current Session:**
  - Method: `window.tibyan.auth.getSession()`
  - Channel: `IPC_CHANNELS.AUTH_GET_SESSION` (`'auth:getSession'`)
  - Main IPC Handler: Returns `runtime.currentSession`.
- **Logout:**
  - Method: `window.tibyan.auth.logout()`
  - Channel: `IPC_CHANNELS.AUTH_LOGOUT` (`'auth:logout'`)
  - Main IPC Handler: Clears `runtime.clearSession()`.

---

## 4. Design & Component Requirements

1. **Reuse Design System `PinPad`:**
   - Component path: `packages/design-system/src/components/PinPad.tsx`.
   - Props: `value`, `onChange`, `onComplete`, `disabled`, `error`, `masked`.
   - Built-in keyboard listener handles numeric keys, backspace, escape.
2. **Brand Visuals:**
   - Use official Tibyan logo: `packages/design-system/src/components/Logo.tsx` (backed by the verified PNG asset).
   - Use official brand colors: `#0B3D3D` (primary petrol teal) and `#C59B27` (muted luxury gold).
   - True RTL layout with Arabic labels and copy.
3. **Never Persist Plaintext PIN:**
   - Plaintext PIN must exist only briefly in React component memory.
   - Clear state immediately after `loginWithPin` resolves or fails.
   - Never write PIN to `localStorage`, `sessionStorage`, or logs.
4. **Authoritative Session Architecture:**
   - The Main process owns the authoritative authenticated session (`runtime.currentSession`).
   - The Zustand store (`auth.state.ts`) acts solely as a presentation cache and fast-access hook for UI components.
   - Authorization decisions at the IPC boundary are evaluated by Main, not by the renderer's Zustand store.

---

## 5. Verification Checklist for Task 12

When implementing Task 12:
- [ ] Run `pnpm --filter @tibyan/desktop test` — all new and existing tests must pass.
- [ ] Run `pnpm -r typecheck` — 0 TypeScript compiler errors.
- [ ] Verify that `LoginScreen` shows active users and allows switching between accounts.
- [ ] Verify that entering an invalid PIN displays the error message.
- [ ] Verify that 5 failed attempts display the 30-second cooldown timer counting down to 0.
- [ ] Verify that entering a valid PIN logs in, sets the session, and transitions into `AppShell`.
- [ ] Run the full monorepo regression suite: `pnpm -r test` (baseline is 349 + new Task 12 tests).
- [ ] Halt and present the walkthrough to the user. **Do not begin Task 13.**
