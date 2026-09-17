import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app, ipcMain, type BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  CreateAcademicYearSchema,
  SwitchAcademicYearSchema,
  UpdateThemeSettingSchema,
  type AppInfoDto,
  type GlobalSettingsDto,
  type SetupStateDto,
  type AcademicYearDto,
} from '@tibyan/contracts';
import type { AcademicYearRow } from '@tibyan/db';
import { requirePermission } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';

let persistedTheme: 'light' | 'dark' | 'system' = 'system';

function toAcademicYearDto(year: AcademicYearRow): AcademicYearDto {
  return {
    id: year.id,
    name: year.name,
    dbFilename: year.dbFilename,
    isActive: year.isActive,
    isArchived: year.isArchived,
    createdAt: year.createdAt,
    updatedAt: year.updatedAt,
  };
}

export function registerSystemIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  // 1. Get Application Information
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_INFO, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall((): AppInfoDto => {
      return {
        nameEn: 'Tibyan',
        nameAr: 'تِبيان',
        version: '1.0.0',
        isPackaged: app?.isPackaged ?? false,
        platform: process.platform,
        appDataDir: runtime.paths.appDataDir,
      };
    });
  });

  // 2. Get Global Settings
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_SETTINGS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall((): GlobalSettingsDto => {
      return {
        theme: persistedTheme,
        activeAcademicYearId: runtime.activeAcademicYear?.id ?? null,
        activeAcademicYearName: runtime.activeAcademicYear?.name ?? null,
      };
    });
  });

  // 3. Get Setup State (First-run detection derived authoritatively from DB)
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall((): SetupStateDto => {
      const allUsers = runtime.academicYearRepo ? runtime.authService.userRepo.listAll() : [];
      const hasOwner = allUsers.some((u) => u.role === 'OWNER');
      const hasActiveAcademicYear = runtime.activeAcademicYear !== null;
      return {
        isSetupComplete: hasOwner && hasActiveAcademicYear,
        hasOwner,
        hasActiveAcademicYear,
        activeAcademicYearName: runtime.activeAcademicYear?.name ?? null,
      };
    });
  });

  // 4. Update Theme Setting
  ipcMain.handle(IPC_CHANNELS.SYSTEM_UPDATE_THEME, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      const validated = UpdateThemeSettingSchema.parse(payload);
      persistedTheme = validated.theme;
      return undefined;
    });
  });

  // 5. List Academic Years
  ipcMain.handle(IPC_CHANNELS.SYSTEM_LIST_ACADEMIC_YEARS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      const years = runtime.academicYearRepo.listAll();
      return years.map(toAcademicYearDto);
    });
  });

  // 6. Create Academic Year
  ipcMain.handle(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      // If a MAIN session is active, verify SETTINGS_WRITE (Owner satisfies this)
      if (runtime.currentSession) {
        const actor = runtime.requireAuthenticatedActor();
        requirePermission(actor.role, actor.permissions ?? [], 'SETTINGS_WRITE');
      }

      const validated = CreateAcademicYearSchema.parse(payload);
      const existing = runtime.academicYearRepo.findByName(validated.name);
      if (existing) {
        throw new Error(`Academic year ${validated.name} already exists.`);
      }

      const yearId = crypto.randomUUID();
      const now = new Date().toISOString();
      const dbFilename = `tibyan-${validated.name}.sqlite`;

      // Check for filename collision in the registry
      const allYears = runtime.academicYearRepo.listAll();
      const existingFilename = allYears.find((y) => y.dbFilename === dbFilename);
      if (existingFilename) {
        throw new Error(`Academic year database ${dbFilename} is already registered.`);
      }

      // Check for existing physical file collision on disk
      const targetFilePath = path.resolve(runtime.paths.academicYearsDbDir, dbFilename);
      if (!runtime.inMemory && fs.existsSync(targetFilePath)) {
        throw new Error(`DATABASE_FILE_COLLISION: File already exists on disk: ${dbFilename}`);
      }

      const shouldActivate = allYears.length === 0;

      const created = runtime.academicYearRepo.create({
        id: yearId,
        name: validated.name,
        dbFilename,
        isActive: shouldActivate,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });

      if (shouldActivate) {
        try {
          runtime.mountAcademicYear(created);
        } catch (mountErr) {
          // If mounting fails after registry creation, do not delete registry row silently;
          // throw error so caller can report recovery
          throw mountErr;
        }
      }

      return toAcademicYearDto(created);
    });
  });

  // 7. Switch Active Academic Year
  ipcMain.handle(IPC_CHANNELS.SYSTEM_SWITCH_ACADEMIC_YEAR, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) {
      throw new Error('UNAUTHORIZED_IPC_SENDER');
    }
    return safeIpcCall(() => {
      const validated = SwitchAcademicYearSchema.parse(payload);
      const targetYear = runtime.academicYearRepo.findById(validated.academicYearId);
      if (!targetYear) {
        throw new Error('ACADEMIC_YEAR_NOT_FOUND: The requested academic year was not found.');
      }

      runtime.academicYearRepo.setActiveYear(targetYear.id);
      const refreshed = runtime.academicYearRepo.findById(targetYear.id)!;
      runtime.mountAcademicYear(refreshed);
      return undefined;
    });
  });
}

export function unregisterSystemIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_GET_INFO);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_GET_SETTINGS);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_UPDATE_THEME);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_LIST_ACADEMIC_YEARS);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR);
  ipcMain.removeHandler(IPC_CHANNELS.SYSTEM_SWITCH_ACADEMIC_YEAR);
}
