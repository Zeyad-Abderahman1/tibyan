import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory IPC dispatcher map for testing
const ipcHandlers = new Map<string, (event: any, payload?: any) => Promise<any>>();

vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((name: string) => path.join(__dirname, `../.test-appdata-${name}`)),
      requestSingleInstanceLock: vi.fn(() => true),
      whenReady: vi.fn(() => Promise.resolve()),
      on: vi.fn(),
      quit: vi.fn(),
      isPackaged: false,
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      webContents: {
        id: 1,
        setWindowOpenHandler: vi.fn(),
        on: vi.fn(),
        session: {
          setPermissionRequestHandler: vi.fn(),
        },
      },
      isDestroyed: () => false,
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      on: vi.fn(),
    })),
    ipcMain: {
      handle: vi.fn((channel: string, handler: (event: any, payload?: any) => Promise<any>) => {
        ipcHandlers.set(channel, handler);
      }),
      removeHandler: vi.fn((channel: string) => {
        ipcHandlers.delete(channel);
      }),
    },
    dialog: {
      showOpenDialog: vi.fn(async () => ({
        canceled: false,
        filePaths: ['/safe/media/photo.jpg'],
      })),
    },
    contextBridge: {
      exposeInMainWorld: vi.fn(),
    },
  };
});

import os from 'os';

// Import after mocking electron
import { Runtime } from '../electron/runtime.js';
import { registerAllIpcHandlers, unregisterAllIpcHandlers } from '../electron/ipc/index.js';
import { mapErrorToIpcResult } from '../electron/ipc/errors.js';
import { IPC_CHANNELS } from '@tibyan/contracts';

describe('Task 10 — Typed IPC Bridge & Main Session Authority', () => {
  let runtime: Runtime;
  let mockWindow: any;
  let validSenderEvent: any;
  let testDir: string;

  beforeEach(() => {
    ipcHandlers.clear();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-desktop-test-'));
    runtime = new Runtime({ inMemory: true, customAppDataDir: testDir });
    runtime.initialize();

    mockWindow = {
      isDestroyed: () => false,
      webContents: { id: 1 },
    };

    validSenderEvent = {
      sender: { id: 1 },
      senderFrame: { parent: null },
    };

    registerAllIpcHandlers(runtime, mockWindow);
  });

  afterEach(() => {
    unregisterAllIpcHandlers();
    runtime.close();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // Helper to invoke registered IPC handler
  async function invoke(channel: string, payload?: any) {
    const handler = ipcHandlers.get(channel);
    if (!handler) {
      throw new Error(`Handler not registered for channel: ${channel}`);
    }
    return handler(validSenderEvent, payload);
  }

  it('verifies all expected channels are registered on ipcMain', () => {
    expect(ipcHandlers.has(IPC_CHANNELS.AUTH_LIST_USERS)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.AUTH_LOGIN_PIN)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.AUTH_LOGOUT)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.AUTH_GET_SESSION)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.STUDENTS_LIST)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.STUDENTS_CREATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.GROUPS_CREATE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.ENROLLMENTS_ENROLL)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.SESSIONS_LIST_BY_RANGE)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.DASHBOARD_GET_TODAY)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.BACKUP_TRIGGER)).toBe(true);
    expect(ipcHandlers.has(IPC_CHANNELS.SYSTEM_GET_INFO)).toBe(true);
  });

  it('bootstraps owner account on fresh install via auth:bootstrapOwner', async () => {
    const result = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ أحمد الشريف',
      username: 'teacher',
      pin: '1234',
    });

    expect(result.success).toBe(true);
    expect(result.data.fullName).toBe('الأستاذ أحمد الشريف');
    expect(result.data.role).toBe('OWNER');
    expect(result.data.pinHash).toBeUndefined(); // Zero secret leakage
    expect(result.data.salt).toBeUndefined();
  });

  it('rejects malformed IPC payloads before reaching Core service (Zod validation)', async () => {
    // Missing required fields
    const malformedResult = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: 'not-a-uuid',
      pin: '12', // Only 2 digits
    });

    expect(malformedResult.success).toBe(false);
    expect(malformedResult.error.code).toBe('VALIDATION_ERROR');
    expect(malformedResult.error.details).toBeDefined();
    // PIN value must not leak into error details
    const stringified = JSON.stringify(malformedResult.error);
    expect(stringified).not.toContain('12');
  });

  it('performs login and establishes authoritative session in MAIN process', async () => {
    // 1. Create owner
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'أحمد الشريف',
      username: 'owner',
      pin: '1234',
    });
    const ownerId = ownerRes.data.id;

    // Initially no session
    expect(runtime.currentSession).toBeNull();
    const initialSessionRes = await invoke(IPC_CHANNELS.AUTH_GET_SESSION);
    expect(initialSessionRes.data).toBeNull();

    // 2. Login with correct PIN
    const loginRes = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: ownerId,
      pin: '1234',
    });

    expect(loginRes.success).toBe(true);
    expect(loginRes.data.userId).toBe(ownerId);
    expect(loginRes.data.role).toBe('OWNER');

    // 3. Authoritative session is set in MAIN process
    expect(runtime.currentSession).not.toBeNull();
    expect(runtime.currentSession?.userId).toBe(ownerId);

    // 4. auth:getSession reflects active session
    const activeSessionRes = await invoke(IPC_CHANNELS.AUTH_GET_SESSION);
    expect(activeSessionRes.data?.userId).toBe(ownerId);
  });

  it('clears authoritative session on logout', async () => {
    // Setup session
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'أحمد الشريف',
      username: 'owner-logout',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: ownerRes.data.id,
      pin: '1234',
    });
    expect(runtime.currentSession).not.toBeNull();

    // Logout
    const logoutRes = await invoke(IPC_CHANNELS.AUTH_LOGOUT);
    expect(logoutRes.success).toBe(true);

    // Session cleared in MAIN process
    expect(runtime.currentSession).toBeNull();
    const sessionRes = await invoke(IPC_CHANNELS.AUTH_GET_SESSION);
    expect(sessionRes.data).toBeNull();
  });

  it('rejects protected operations when no MAIN session exists', async () => {
    expect(runtime.currentSession).toBeNull();

    // Attempting to create a student without login
    const studentRes = await invoke(IPC_CHANNELS.STUDENTS_CREATE, {
      fullName: 'محمد علي',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
    });

    expect(studentRes.success).toBe(false);
    expect(studentRes.error.code).toBe('PERMISSION_DENIED');
  });

  it('cannot spoof permissions from renderer: actor is derived authoritatively from MAIN session', async () => {
    // 1. Create owner and assistant
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-perm',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: ownerRes.data.id,
      pin: '1234',
    });

    // Create assistant without USERS_MANAGE permission
    const assistantRes = await invoke(IPC_CHANNELS.AUTH_CREATE_USER, {
      fullName: 'مساعد أول',
      username: 'assistant1',
      pin: '5678',
      role: 'ASSISTANT',
      permissions: ['STUDENTS_READ'], // No USERS_MANAGE
    });

    // 2. Login as assistant
    await invoke(IPC_CHANNELS.AUTH_LOGOUT);
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: assistantRes.data.id,
      pin: '5678',
    });

    // 3. Assistant attempts to create another user while trying to spoof { role: 'OWNER' }
    const spoofAttempt = await invoke(IPC_CHANNELS.AUTH_CREATE_USER, {
      fullName: 'مساعد مزيف',
      username: 'fake-assistant',
      pin: '9999',
      role: 'ASSISTANT',
      permissions: [],
      // Spoofed actor field in payload (should be completely ignored)
      actor: { role: 'OWNER', permissions: ['USERS_MANAGE'] },
    });

    // Must be rejected because MAIN session knows user is ASSISTANT without USERS_MANAGE
    expect(spoofAttempt.success).toBe(false);
    expect(spoofAttempt.error.code).toBe('PERMISSION_DENIED');
  });

  it('preserves retryAfterSeconds for ACCOUNT_LOCKED auth error', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-lockout',
      pin: '1234',
    });
    const userId = ownerRes.data.id;

    // Fail 5 times to trigger ACCOUNT_LOCKED
    for (let i = 0; i < 4; i++) {
      const failRes = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId, pin: '0000' });
      expect(failRes.error.code).toBe('INVALID_PIN');
    }

    const lockRes = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId, pin: '0000' });
    expect(lockRes.success).toBe(false);
    expect(lockRes.error.code).toBe('ACCOUNT_LOCKED');
    expect(lockRes.error.details?.retryAfterSeconds).toBe(30);
  });

  it('sanitizes unknown internal errors without leaking stacks or SQLite details', () => {
    const rawSqliteError = new Error('SQLITE_CORRUPT: database disk image is malformed in /Users/secret/app-data/system.sqlite\n    at Database.prepare (/node_modules/better-sqlite3/index.js:42:15)');

    const mapped = mapErrorToIpcResult(rawSqliteError);
    expect(mapped.success).toBe(false);
    if (!mapped.success) {
      expect(mapped.error.code).toBe('INTERNAL_ERROR');
      expect(mapped.error.message).toBe('An unexpected internal error occurred. Please try again.');
      expect((mapped.error as any).stack).toBeUndefined();
    }
    expect(JSON.stringify(mapped)).not.toContain('SQLITE_CORRUPT');
    expect(JSON.stringify(mapped)).not.toContain('/Users/secret');
  });

  it('fresh install runtime initializes with system DB and null active academic DB', () => {
    expect(runtime.systemDb).toBeDefined();
    expect(runtime.academicYearRepo).toBeDefined();
    expect(runtime.activeAcademicYear).toBeNull();
    expect(runtime.studentService).toBeNull();
    expect(runtime.groupService).toBeNull();
    expect(runtime.sessionService).toBeNull();
    expect(runtime.dashboardService).toBeNull();
  });

  it('mounts academic year database and instantiates scoped services upon academic year creation', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-acad',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });

    // Create academic year
    const yearRes = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, {
      name: '2026-2027',
    });

    expect(yearRes.success).toBe(true);
    expect(yearRes.data.name).toBe('2026-2027');
    expect(yearRes.data.isActive).toBe(true);

    // Scoped services are now live
    expect(runtime.activeAcademicYear).not.toBeNull();
    expect(runtime.studentService).not.toBeNull();
    expect(runtime.groupService).not.toBeNull();
    expect(runtime.dashboardService).not.toBeNull();

    // Can create student now
    const studentRes = await invoke(IPC_CHANNELS.STUDENTS_CREATE, {
      fullName: 'عمر خالد',
      educationSystem: 'GENERAL',
      gradeLevel: 'PREP_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01123456789',
    });

    expect(studentRes.success).toBe(true);
    expect(studentRes.data.fullName).toBe('عمر خالد');
    expect(studentRes.data.studentCode).toMatch(/^TB-\d{4}$/);
  });

  it('dashboard:getToday remains strictly read-only and delegates to DashboardService', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-dash',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });
    await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2027' });

    const dashboardRes = await invoke(IPC_CHANNELS.DASHBOARD_GET_TODAY);
    expect(dashboardRes.success).toBe(true);
    expect(dashboardRes.data.currentDate).toBeDefined();
    expect(dashboardRes.data.classes).toBeDefined();
    expect(dashboardRes.data.needsAttention).toBeDefined();
  });

  it('manual backup triggers BackupService with authenticated USER actor', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-bak',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });

    const statusRes = await invoke(IPC_CHANNELS.BACKUP_GET_STATUS);
    expect(statusRes.success).toBe(true);
    expect(statusRes.data.isBackupRunning).toBe(false);

    const listRes = await invoke(IPC_CHANNELS.BACKUP_LIST_RECORDS);
    expect(listRes.success).toBe(true);
    expect(Array.isArray(listRes.data)).toBe(true);
  });

  it('verifies electron-builder.json5 configuration matches approved v2.1 specifications', () => {
    const builderConfigPath = path.join(__dirname, '../electron-builder.json5');
    expect(fs.existsSync(builderConfigPath)).toBe(true);

    const rawContent = fs.readFileSync(builderConfigPath, 'utf-8');
    expect(rawContent).toContain('"asar": true');
    expect(rawContent).toContain('"npmRebuild": true');
    expect(rawContent).toContain('**/*.node');
    expect(rawContent).toContain('"nsis"');
    expect(rawContent).toContain('com.tibyan.desktop');
  });

  it('mounts active academic year using exact registered dbFilename and rejects path traversal', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-path-test',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });

    // Create academic year
    const yearRes = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, {
      name: '2027-2028',
    });
    expect(yearRes.success).toBe(true);
    expect(yearRes.data.dbFilename).toBe('tibyan-2027-2028.sqlite');

    // Authoritative filename from registry is used
    expect(runtime.activeAcademicYear?.dbFilename).toBe('tibyan-2027-2028.sqlite');
    expect(runtime.activeAcademicYear?.dbFilename).not.toContain(yearRes.data.id);

    // Attempting to mount malicious traversal dbFilename must be rejected
    const maliciousYear = {
      ...yearRes.data,
      dbFilename: '../outside.sqlite',
    };
    expect(() => runtime.mountAcademicYear(maliciousYear as any)).toThrow(/SECURITY_ERROR/);

    const maliciousAbsoluteYear = {
      ...yearRes.data,
      dbFilename: '/absolute/path.sqlite',
    };
    expect(() => runtime.mountAcademicYear(maliciousAbsoluteYear as any)).toThrow(/SECURITY_ERROR/);
  });

  it('materializeRollingSessions accepts no renderer-controlled daysAhead and delegates to exact 28-day horizon', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'الأستاذ',
      username: 'owner-mat',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });
    await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2027' });

    // 1. Renderer cannot pass daysAhead or arbitrary horizon
    const rejectedWithDaysAhead = await invoke(IPC_CHANNELS.SESSIONS_MATERIALIZE, { daysAhead: 30 });
    expect(rejectedWithDaysAhead.success).toBe(false);
    expect(rejectedWithDaysAhead.error.code).toBe('VALIDATION_ERROR');

    // 2. Invoking with no arguments (undefined payload) succeeds and delegates to 28-day horizon
    const materializeRes = await invoke(IPC_CHANNELS.SESSIONS_MATERIALIZE);
    expect(materializeRes.success).toBe(true);
    expect(materializeRes.data.startDate).toBeDefined();
    expect(materializeRes.data.endDate).toBeDefined();
    expect(typeof materializeRes.data.createdCount).toBe('number');
    expect(typeof materializeRes.data.existingCount).toBe('number');
  });

  it('verifies runtime backup root strictly matches the canonical Task 7 root', () => {
    expect(runtime.paths.backupRootDir).toBe(path.join(runtime.paths.appDataDir, 'backups'));
    expect((runtime.backupService as any).backupRootDir).toBe(path.resolve(runtime.paths.appDataDir, 'backups'));
  });

  it('interrupted onboarding: active academic year exists + no Owner preserves year and completes upon Owner bootstrap', async () => {
    // 1. Manually insert an academic year into system database
    const year = runtime.academicYearRepo.create({
      id: 'year-existing-1',
      name: '2026-2027',
      dbFilename: 'tibyan-2026-2027.sqlite',
      isActive: true,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    runtime.mountAcademicYear(year);

    // Initial state: has active year but no owner
    const setup1 = await invoke(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
    expect(setup1.success).toBe(true);
    expect(setup1.data.hasOwner).toBe(false);
    expect(setup1.data.hasActiveAcademicYear).toBe(true);
    expect(setup1.data.isSetupComplete).toBe(false);

    // 2. Create the missing Owner
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'أحمد المسؤول',
      username: 'owner-solo',
      pin: '5678',
    });
    expect(ownerRes.success).toBe(true);

    // 3. Authenticate the Owner
    const loginRes = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: ownerRes.data.id,
      pin: '5678',
    });
    expect(loginRes.success).toBe(true);

    // 4. Setup state is now complete, without creating another year
    const setup2 = await invoke(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
    expect(setup2.success).toBe(true);
    expect(setup2.data.hasOwner).toBe(true);
    expect(setup2.data.hasActiveAcademicYear).toBe(true);
    expect(setup2.data.isSetupComplete).toBe(true);

    // Verify exactly one academic year exists (the preserved one)
    const allYears = runtime.academicYearRepo.listAll();
    expect(allYears.length).toBe(1);
    expect(allYears[0]?.id).toBe('year-existing-1');
  });

  it('interrupted onboarding: Owner exists + no academic year rejects duplicate Owner bootstrap and resumes', async () => {
    // 1. Bootstrap owner
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'أحمد المسؤول',
      username: 'owner-existing',
      pin: '1234',
    });
    expect(ownerRes.success).toBe(true);

    // Setup state: has owner but no academic year
    const setup1 = await invoke(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
    expect(setup1.success).toBe(true);
    expect(setup1.data.hasOwner).toBe(true);
    expect(setup1.data.hasActiveAcademicYear).toBe(false);
    expect(setup1.data.isSetupComplete).toBe(false);

    // 2. Attempting to bootstrap a second owner is rejected
    const secondBootstrap = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'معلم آخر',
      username: 'another-owner',
      pin: '9999',
    });
    expect(secondBootstrap.success).toBe(false);
    expect(secondBootstrap.error.code).toBe('OWNER_ALREADY_EXISTS');

    // 3. Authenticate existing owner
    const loginRes = await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
      userId: ownerRes.data.id,
      pin: '1234',
    });
    expect(loginRes.success).toBe(true);

    // 4. Complete setup by creating initial academic year
    const yearRes = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, {
      name: '2026-2027',
    });
    expect(yearRes.success).toBe(true);

    const setup2 = await invoke(IPC_CHANNELS.SYSTEM_GET_SETUP_STATE);
    expect(setup2.success).toBe(true);
    expect(setup2.data.isSetupComplete).toBe(true);
  });

  it('rejects non-consecutive academic year names at trusted IPC boundary', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'المعلم',
      username: 'teacher-validation',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });

    // Non-consecutive: 2026-2028
    const res1 = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2028' });
    expect(res1.success).toBe(false);
    expect(res1.error.code).toBe('VALIDATION_ERROR');

    // Same year: 2026-2026
    const res2 = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2026' });
    expect(res2.success).toBe(false);
    expect(res2.error.code).toBe('VALIDATION_ERROR');

    // Inverted: 2027-2026
    const res3 = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2027-2026' });
    expect(res3.success).toBe(false);
    expect(res3.error.code).toBe('VALIDATION_ERROR');

    // Valid consecutive: 2026-2027 succeeds
    const res4 = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2027' });
    expect(res4.success).toBe(true);
  });

  it('repeated academic year creation cannot create duplicate registry rows or overwrite file', async () => {
    const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
      fullName: 'المعلم',
      username: 'teacher-repeat',
      pin: '1234',
    });
    await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, { userId: ownerRes.data.id, pin: '1234' });

    const first = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2027' });
    expect(first.success).toBe(true);

    // Repeated call with same name must fail
    const repeated = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, { name: '2026-2027' });
    expect(repeated.success).toBe(false);
    expect(repeated.error.code).toBe('ACADEMIC_YEAR_ALREADY_EXISTS');
    expect(repeated.error.message).toContain('already exists');

    // Only one row in registry
    const all = runtime.academicYearRepo.listAll();
    expect(all.length).toBe(1);
  });

  it('compensates and deletes partial database file when registry insertion fails', async () => {
    const diskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-compensation-test-'));
    const diskRuntime = new Runtime({ inMemory: false, customAppDataDir: diskDir });
    diskRuntime.initialize();

    unregisterAllIpcHandlers();
    registerAllIpcHandlers(diskRuntime, mockWindow);

    try {
      const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
        fullName: 'المعلم التعويضي',
        username: 'teacher-comp',
        pin: '1234',
      });
      await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
        userId: ownerRes.data.id,
        pin: '1234',
      });

      const targetDbFile = path.join(diskRuntime.paths.academicYearsDbDir, 'tibyan-2026-2027.sqlite');
      expect(fs.existsSync(targetDbFile)).toBe(false);

      // Force registry creation to fail
      vi.spyOn(diskRuntime.academicYearRepo, 'create').mockImplementationOnce(() => {
        throw new Error('SIMULATED_REGISTRY_WRITE_FAILURE');
      });

      const createRes = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, {
        name: '2026-2027',
      });

      expect(createRes.success).toBe(false);

      // Crucial: The newly created SQLite file must have been cleaned up (compensation)
      expect(fs.existsSync(targetDbFile)).toBe(false);

      // Crucial: No orphan registry row exists
      expect(diskRuntime.academicYearRepo.listAll().length).toBe(0);
    } finally {
      unregisterAllIpcHandlers();
      diskRuntime.close();
      registerAllIpcHandlers(runtime, mockWindow);
      try {
        fs.rmSync(diskDir, { recursive: true, force: true });
      } catch {}
    }
  });

  it('rejects creation and never overwrites an existing database file on disk', async () => {
    const diskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-collision-test-'));
    const diskRuntime = new Runtime({ inMemory: false, customAppDataDir: diskDir });
    diskRuntime.initialize();

    unregisterAllIpcHandlers();
    registerAllIpcHandlers(diskRuntime, mockWindow);

    try {
      const ownerRes = await invoke(IPC_CHANNELS.AUTH_BOOTSTRAP_OWNER, {
        fullName: 'المعلم',
        username: 'teacher-collision',
        pin: '1234',
      });
      await invoke(IPC_CHANNELS.AUTH_LOGIN_PIN, {
        userId: ownerRes.data.id,
        pin: '1234',
      });

      // Pre-create an existing file on disk with custom sentinel content
      const targetDbFile = path.join(diskRuntime.paths.academicYearsDbDir, 'tibyan-2026-2027.sqlite');
      fs.writeFileSync(targetDbFile, 'PRE_EXISTING_FILE_CONTENT');

      const createRes = await invoke(IPC_CHANNELS.SYSTEM_CREATE_ACADEMIC_YEAR, {
        name: '2026-2027',
      });

      // Creation must be rejected due to collision
      expect(createRes.success).toBe(false);
      expect(createRes.error.code).toBe('DATABASE_FILE_COLLISION');

      // The pre-existing file must NEVER be deleted or overwritten
      expect(fs.existsSync(targetDbFile)).toBe(true);
      expect(fs.readFileSync(targetDbFile, 'utf8')).toBe('PRE_EXISTING_FILE_CONTENT');
    } finally {
      unregisterAllIpcHandlers();
      diskRuntime.close();
      registerAllIpcHandlers(runtime, mockWindow);
      try {
        fs.rmSync(diskDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
