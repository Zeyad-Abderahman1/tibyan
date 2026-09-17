import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  LoginWithPinSchema,
  BootstrapOwnerSchema,
  CreateUserSchema,
  UpdatePermissionsSchema,
  ChangeUserStatusSchema,
  ResetUserPinSchema,
} from '@tibyan/contracts';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

export function registerAuthIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. List login users (unauthenticated: needed before login)
  ipcMain.handle(IPC_CHANNELS.AUTH_LIST_USERS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => runtime.authService.listLoginUsers());
  });

  // 2. Login with PIN (unauthenticated: establishes authoritative MAIN session)
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN_PIN, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const validated = LoginWithPinSchema.parse(payload);
      const session = await runtime.authService.loginWithPin(validated);
      runtime.setSession(session);
      return session;
    });
  });

  // 3. Logout (clears authoritative MAIN session)
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      runtime.clearSession();
      return undefined;
    });
  });

  // 4. Get active authoritative session
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => runtime.currentSession);
  });

  // 5. Bootstrap Owner (unauthenticated only when zero Owners exist; enforced by AuthService)
  ipcMain.handle(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const validated = BootstrapOwnerSchema.parse(payload);
      return runtime.authService.bootstrapOwner(validated);
    });
  });

  // 6. Create Assistant user (protected: requires USERS_MANAGE permission on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.AUTH_CREATE_USER, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = CreateUserSchema.parse(payload);
      return runtime.authService.createAssistant(validated, actor.userId);
    });
  });

  // 7. Update permissions (protected: requires USERS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.AUTH_UPDATE_PERMISSIONS, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = UpdatePermissionsSchema.parse(payload);
      await runtime.authService.setAssistantPermissions(validated, actor.userId);
      return undefined;
    });
  });

  // 8. Change user status (protected: requires USERS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.AUTH_CHANGE_STATUS, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = ChangeUserStatusSchema.parse(payload);
      await runtime.authService.setUserStatus(validated, actor.userId);
      return undefined;
    });
  });

  // 9. Reset user PIN (protected: self or USERS_MANAGE on MAIN actor)
  ipcMain.handle(IPC_CHANNELS.AUTH_RESET_PIN, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const validated = ResetUserPinSchema.parse(payload);
      await runtime.authService.resetUserPin(validated, actor.userId);
      return undefined;
    });
  });
}

export function unregisterAuthIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_LIST_USERS);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_LOGIN_PIN);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_LOGOUT);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_GET_SESSION);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_CREATE_USER);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_UPDATE_PERMISSIONS);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_CHANGE_STATUS);
  ipcMain.removeHandler(IPC_CHANNELS.AUTH_RESET_PIN);
}
