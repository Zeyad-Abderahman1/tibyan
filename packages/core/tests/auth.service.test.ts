import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openSystemDatabase,
  closeAllDatabases,
  UserRepository,
  SystemAuditRepository,
} from '@tibyan/db';
import {
  AuthService,
  type Clock,
} from '../src/auth/auth.service.js';
import { PinService } from '../src/auth/pin.service.js';
import {
  seedPermissions,
  hasPermission,
  requirePermission,
  ALL_PERMISSION_CODES,
} from '../src/auth/permissions.js';

class TestClock implements Clock {
  private currentTime: Date;

  constructor(initialIso: string = '2026-10-01T12:00:00.000Z') {
    this.currentTime = new Date(initialIso);
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  advanceSeconds(seconds: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + seconds * 1000);
  }
}

describe('AuthService & Authorization Core', () => {
  let pinService: PinService;
  let clock: TestClock;
  let authService: AuthService;

  beforeEach(() => {
    closeAllDatabases();
    openSystemDatabase({ filePath: ':memory:' });
    seedPermissions();
    pinService = new PinService();
    clock = new TestClock();
    authService = new AuthService(undefined, pinService, clock);
  });

  afterEach(() => {
    closeAllDatabases();
  });

  it('Owner bootstrap succeeds once', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    expect(owner.fullName).toBe('Teacher Mohamed');
    expect(owner.username).toBe('mohamed');
    expect(owner.role).toBe('OWNER');
    expect(owner.status).toBe('ACTIVE');
    expect(owner.permissions).toEqual(ALL_PERMISSION_CODES);
  });

  it('Second Owner bootstrap fails with OWNER_ALREADY_EXISTS', async () => {
    await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    await expect(
      authService.bootstrapOwner({
        fullName: 'Second Teacher',
        username: 'second_teacher',
        pin: '5678',
      })
    ).rejects.toThrowError(
      expect.objectContaining({ code: 'OWNER_ALREADY_EXISTS' })
    );
  });

  it('Plaintext PIN is never persisted', async () => {
    const rawPin = '4321';
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: rawPin,
    });

    const userRepo = new UserRepository();
    const rawUser = userRepo.findById(owner.id);
    expect(rawUser).not.toBeNull();
    expect(rawUser?.pinHash).not.toBe(rawPin);
    expect(rawUser?.salt).not.toBe(rawPin);
    expect(rawUser?.pinHash).toHaveLength(128); // 64 bytes in hex
    expect(rawUser?.salt).toHaveLength(32); // 16 bytes in hex

    // Assert plaintext PIN does not appear anywhere in user fields
    const userValues = Object.values(rawUser!);
    expect(userValues).not.toContain(rawPin);
  });

  it('Owner has every defined PermissionCode', () => {
    for (const code of ALL_PERMISSION_CODES) {
      expect(hasPermission('OWNER', [], code)).toBe(true);
      expect(() => requirePermission('OWNER', [], code)).not.toThrow();
    }
  });

  it('Assistant without permission is denied; assistant with permission succeeds', () => {
    const assistantPermissions = ['STUDENTS_READ', 'ATTENDANCE_WRITE'] as const;

    // Granted permissions succeed
    expect(hasPermission('ASSISTANT', [...assistantPermissions], 'STUDENTS_READ')).toBe(true);
    expect(hasPermission('ASSISTANT', [...assistantPermissions], 'ATTENDANCE_WRITE')).toBe(true);
    expect(() =>
      requirePermission('ASSISTANT', [...assistantPermissions], 'STUDENTS_READ')
    ).not.toThrow();

    // Ungranted permissions are denied
    expect(hasPermission('ASSISTANT', [...assistantPermissions], 'PAYMENTS_WRITE')).toBe(false);
    expect(() =>
      requirePermission('ASSISTANT', [...assistantPermissions], 'PAYMENTS_WRITE')
    ).toThrowError(/PERMISSION_DENIED/);
  });

  it('Permission seeding is idempotent', () => {
    // Seed already called in beforeEach; call it twice more
    expect(() => seedPermissions()).not.toThrow();
    expect(() => seedPermissions()).not.toThrow();

    const systemConn = openSystemDatabase({ filePath: ':memory:' });
    const count = systemConn.raw
      .prepare('SELECT COUNT(*) as count FROM permissions')
      .get() as { count: number };
    expect(count.count).toBe(12);
  });

  it('Attempts 1 through 4 increment failedAttempts without locking', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const userRepo = new UserRepository();

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(
        authService.loginWithPin({ userId: owner.id, pin: '9999' })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_PIN' }));

      const user = userRepo.findById(owner.id);
      expect(user?.failedAttempts).toBe(attempt);
      expect(user?.lockedUntil).toBeNull();
    }
  });

  it('Attempt 5 locks the user for 30 seconds', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const userRepo = new UserRepository();

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.loginWithPin({ userId: owner.id, pin: '0000' })
      ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_PIN' }));
    }

    // 5th failed attempt locks the account
    await expect(
      authService.loginWithPin({ userId: owner.id, pin: '0000' })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: 30,
      })
    );

    const user = userRepo.findById(owner.id);
    expect(user?.failedAttempts).toBe(5);
    expect(user?.lockedUntil).not.toBeNull();
    const lockExpiry = new Date(user!.lockedUntil!).getTime();
    const expectedExpiry = clock.now().getTime() + 30 * 1000;
    expect(lockExpiry).toBe(expectedExpiry);
  });

  it('Attempt during cooldown returns ACCOUNT_LOCKED and performs no PIN verification', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    // Lock account with 5 failed attempts
    for (let i = 0; i < 5; i++) {
      try {
        await authService.loginWithPin({ userId: owner.id, pin: '0000' });
      } catch {
        // Expected
      }
    }

    // Advance clock by only 10 seconds (still 20 seconds remaining)
    clock.advanceSeconds(10);

    const verifySpy = vi.spyOn(pinService, 'verifyPin');

    // Attempt during active cooldown (even with correct PIN!) must be rejected immediately
    await expect(
      authService.loginWithPin({ userId: owner.id, pin: '1234' })
    ).rejects.toThrowError(
      expect.objectContaining({
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: 20,
      })
    );

    // Assert that no PIN verification occurred during active cooldown
    expect(verifySpy).not.toHaveBeenCalled();
    verifySpy.mockRestore();
  });

  it('After clock advances past 30 seconds, login succeeds and stale failure state is reset', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    for (let i = 0; i < 5; i++) {
      try {
        await authService.loginWithPin({ userId: owner.id, pin: '0000' });
      } catch {}
    }

    // Advance clock past 30-second cooldown (e.g. 35 seconds)
    clock.advanceSeconds(35);

    // Login with correct PIN now succeeds
    const session = await authService.loginWithPin({ userId: owner.id, pin: '1234' });
    expect(session.userId).toBe(owner.id);

    const userRepo = new UserRepository();
    const user = userRepo.findById(owner.id);
    expect(user?.failedAttempts).toBe(0);
    expect(user?.lockedUntil).toBeNull();
  });

  it('Successful login resets failedAttempts and lockedUntil', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    // 2 failed attempts
    await expect(authService.loginWithPin({ userId: owner.id, pin: '0000' })).rejects.toThrow();
    await expect(authService.loginWithPin({ userId: owner.id, pin: '0000' })).rejects.toThrow();

    const userRepo = new UserRepository();
    expect(userRepo.findById(owner.id)?.failedAttempts).toBe(2);

    // Correct PIN login
    const session = await authService.loginWithPin({ userId: owner.id, pin: '1234' });
    expect(session.userId).toBe(owner.id);
    expect(userRepo.findById(owner.id)?.failedAttempts).toBe(0);
    expect(userRepo.findById(owner.id)?.lockedUntil).toBeNull();
  });

  it('Inactive user cannot log in', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const assistant = await authService.createAssistant(
      {
        fullName: 'Assistant Ali',
        username: 'ali',
        pin: '5555',
        role: 'ASSISTANT',
        permissions: ['STUDENTS_READ'],
      },
      owner.id
    );

    // Deactivate assistant
    await authService.setUserStatus({ userId: assistant.id, status: 'INACTIVE' }, owner.id);

    await expect(
      authService.loginWithPin({ userId: assistant.id, pin: '5555' })
    ).rejects.toThrowError(expect.objectContaining({ code: 'USER_INACTIVE' }));
  });

  it('Sole Owner cannot be deactivated', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    await expect(
      authService.setUserStatus({ userId: owner.id, status: 'INACTIVE' }, owner.id)
    ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_OPERATION' }));

    const userRepo = new UserRepository();
    expect(userRepo.findById(owner.id)?.status).toBe('ACTIVE');
  });

  it('Assistant creation is audited with safe redacted snapshots', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const assistant = await authService.createAssistant(
      {
        fullName: 'Assistant Sarah',
        username: 'sarah',
        pin: '7777',
        role: 'ASSISTANT',
        permissions: ['GROUPS_READ', 'GROUPS_WRITE'],
      },
      owner.id
    );

    const auditRepo = new SystemAuditRepository();
    const auditRows = auditRepo.findByEntity('USER', assistant.id);
    expect(auditRows.length).toBeGreaterThan(0);

    const createEvent = auditRows.find((r) => r.action === 'ASSISTANT_CREATED');
    expect(createEvent).toBeDefined();
    expect(createEvent?.actorUserId).toBe(owner.id);
    expect(createEvent?.actorNameSnapshot).toBe(owner.fullName);

    // Redacted snapshot contains safe fields but NOT pinHash or salt
    expect(createEvent?.afterJson).not.toBeNull();
    const after = JSON.parse(createEvent!.afterJson!);
    expect(after.fullName).toBe('Assistant Sarah');
    expect(after.pinHash).toBeUndefined();
    expect(after.salt).toBeUndefined();
    expect(createEvent?.afterJson).not.toContain('7777');
  });

  it('Permission change is audited', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const assistant = await authService.createAssistant(
      {
        fullName: 'Assistant Omar',
        username: 'omar',
        pin: '1111',
        role: 'ASSISTANT',
        permissions: ['STUDENTS_READ'],
      },
      owner.id
    );

    await authService.setAssistantPermissions(
      {
        userId: assistant.id,
        permissions: ['STUDENTS_READ', 'STUDENTS_WRITE', 'REPORTS_READ'],
      },
      owner.id
    );

    const auditRepo = new SystemAuditRepository();
    const auditRows = auditRepo.findByEntity('USER', assistant.id);
    const permEvent = auditRows.find((r) => r.action === 'USER_PERMISSIONS_CHANGED');
    expect(permEvent).toBeDefined();
    expect(permEvent?.actorUserId).toBe(owner.id);
    expect(permEvent?.metadataJson).toContain('updatedBy');
  });

  it('PIN reset is audited without PIN/hash/salt leakage', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const assistant = await authService.createAssistant(
      {
        fullName: 'Assistant Tarek',
        username: 'tarek',
        pin: '2222',
        role: 'ASSISTANT',
        permissions: [],
      },
      owner.id
    );

    const newPin = '9999';
    await authService.resetUserPin({ userId: assistant.id, newPin }, owner.id);

    const auditRepo = new SystemAuditRepository();
    const auditRows = auditRepo.findByEntity('USER', assistant.id);
    const resetEvent = auditRows.find((r) => r.action === 'USER_PIN_RESET');
    expect(resetEvent).toBeDefined();
    expect(resetEvent?.actorUserId).toBe(owner.id);

    // Verify zero PIN leakage
    expect(resetEvent?.metadataJson).not.toContain(newPin);
    expect(resetEvent?.beforeJson).toBeNull();
    expect(resetEvent?.afterJson).toBeNull();

    // Verify new PIN works
    const session = await authService.loginWithPin({ userId: assistant.id, pin: newPin });
    expect(session.userId).toBe(assistant.id);
  });

  it('Failed login audit contains no submitted PIN', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const submittedWrongPin = '8392';
    await expect(
      authService.loginWithPin({ userId: owner.id, pin: submittedWrongPin })
    ).rejects.toThrow();

    const auditRepo = new SystemAuditRepository();
    const auditRows = auditRepo.findByEntity('USER', owner.id);
    const failEvent = auditRows.find((r) => r.action === 'AUTH_LOGIN_FAILED');
    expect(failEvent).toBeDefined();
    expect(failEvent?.metadataJson).not.toContain(submittedWrongPin);
  });

  it('Forced audit insert failure rolls back the associated user/auth mutation', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const systemConn = openSystemDatabase({ filePath: ':memory:' });

    // Install a temporary SQLite trigger that forces abort on system_audit_log INSERT
    systemConn.raw.exec(`
      CREATE TRIGGER trg_test_force_audit_failure
      BEFORE INSERT ON system_audit_log
      WHEN NEW.action = 'ASSISTANT_CREATED'
      BEGIN
        SELECT RAISE(ABORT, 'Simulated audit storage failure');
      END;
    `);

    // Attempting to create an assistant must throw because audit insertion fails
    await expect(
      authService.createAssistant(
        {
          fullName: 'Rollback Assistant',
          username: 'rollback_user',
          pin: '1234',
          role: 'ASSISTANT',
          permissions: [],
        },
        owner.id
      )
    ).rejects.toThrow(/Simulated audit storage failure/);

    // Verify that the assistant was rolled back and does NOT exist in the database
    const userRepo = new UserRepository();
    const nonExistent = userRepo.findByUsername('rollback_user');
    expect(nonExistent).toBeNull();

    // Remove the temporary trigger
    systemConn.raw.exec('DROP TRIGGER trg_test_force_audit_failure;');
  });

  it('Safe login users listing returns active users and excludes hashes', async () => {
    const owner = await authService.bootstrapOwner({
      fullName: 'Teacher Mohamed',
      username: 'mohamed',
      pin: '1234',
    });

    const assistant = await authService.createAssistant(
      {
        fullName: 'Assistant Mona',
        username: 'mona',
        pin: '5678',
        role: 'ASSISTANT',
        permissions: [],
      },
      owner.id
    );
    expect(assistant.id).toBeDefined();

    const loginUsers = authService.listLoginUsers();
    expect(loginUsers).toHaveLength(2);
    expect(loginUsers.map((u) => u.username)).toContain('mohamed');
    expect(loginUsers.map((u) => u.username)).toContain('mona');

    // Confirm hashes/salts are absent from returned objects
    for (const u of loginUsers) {
      expect((u as any).pinHash).toBeUndefined();
      expect((u as any).salt).toBeUndefined();
    }
  });

  describe('Task 16 Hardening: Management Read Model & Privilege Escalation Defenses', () => {
    it('listManagementUsers requires USERS_MANAGE, includes inactive users, and excludes sensitive credential fields', async () => {
      const owner = await authService.bootstrapOwner({
        fullName: 'Teacher Mohamed',
        username: 'mohamed',
        pin: '1234',
      });

      const assistant = await authService.createAssistant(
        {
          fullName: 'Assistant Omar',
          username: 'omar',
          pin: '5678',
          role: 'ASSISTANT',
          permissions: ['STUDENTS_READ', 'GROUPS_READ'],
        },
        owner.id
      );

      // Deactivate assistant
      await authService.setUserStatus(
        {
          userId: assistant.id,
          status: 'INACTIVE',
        },
        owner.id
      );

      // Invariant: pre-auth listLoginUsers() must NOT include inactive users
      const loginUsers = authService.listLoginUsers();
      expect(loginUsers.find((u) => u.id === assistant.id)).toBeUndefined();
      expect(loginUsers).toHaveLength(1);

      // Management listing: includes inactive users and exposes status and permissions
      const managedUsers = authService.listManagementUsers(owner.id);
      expect(managedUsers).toHaveLength(2);

      const managedAssistant = managedUsers.find((u) => u.id === assistant.id);
      expect(managedAssistant).toBeDefined();
      expect(managedAssistant?.status).toBe('INACTIVE');
      expect(managedAssistant?.permissions).toHaveLength(2);
      expect(managedAssistant?.permissions).toEqual(
        expect.arrayContaining(['STUDENTS_READ', 'GROUPS_READ'])
      );

      // Sensitive fields must be strictly absent
      expect((managedAssistant as any).pinHash).toBeUndefined();
      expect((managedAssistant as any).salt).toBeUndefined();
      expect((managedAssistant as any).failedAttempts).toBeUndefined();
      expect((managedAssistant as any).lockedUntil).toBeUndefined();

      // Unauthorized assistant without USERS_MANAGE cannot call listManagementUsers
      expect(() => authService.listManagementUsers(assistant.id)).toThrowError(
        /Required permission 'USERS_MANAGE'/
      );
    });

    it('Privilege Escalation: Assistant with USERS_MANAGE cannot reset Owner PIN', async () => {
      const owner = await authService.bootstrapOwner({
        fullName: 'Teacher Mohamed',
        username: 'mohamed',
        pin: '1234',
      });

      const managerAssistant = await authService.createAssistant(
        {
          fullName: 'Manager Assistant',
          username: 'manager',
          pin: '5678',
          role: 'ASSISTANT',
          permissions: ['USERS_MANAGE'],
        },
        owner.id
      );

      // Assistant attempts to reset Owner PIN
      await expect(
        authService.resetUserPin(
          {
            userId: owner.id,
            newPin: '9999',
          },
          managerAssistant.id
        )
      ).rejects.toThrowError(/Assistants cannot reset the Owner PIN/);
    });

    it('Privilege Escalation: Assistant with USERS_MANAGE cannot alter Owner account status', async () => {
      const owner = await authService.bootstrapOwner({
        fullName: 'Teacher Mohamed',
        username: 'mohamed',
        pin: '1234',
      });

      const managerAssistant = await authService.createAssistant(
        {
          fullName: 'Manager Assistant',
          username: 'manager',
          pin: '5678',
          role: 'ASSISTANT',
          permissions: ['USERS_MANAGE'],
        },
        owner.id
      );

      // Assistant attempts to deactivate Owner
      await expect(
        authService.setUserStatus(
          {
            userId: owner.id,
            status: 'INACTIVE',
          },
          managerAssistant.id
        )
      ).rejects.toThrowError(/Owner account status cannot be altered/);
    });

    it('Privilege Escalation: Assistant with USERS_MANAGE cannot modify own permissions (self-escalation)', async () => {
      const owner = await authService.bootstrapOwner({
        fullName: 'Teacher Mohamed',
        username: 'mohamed',
        pin: '1234',
      });

      const managerAssistant = await authService.createAssistant(
        {
          fullName: 'Manager Assistant',
          username: 'manager',
          pin: '5678',
          role: 'ASSISTANT',
          permissions: ['USERS_MANAGE'],
        },
        owner.id
      );

      // Assistant attempts to grant themselves SETTINGS_WRITE and BACKUP_MANAGE
      await expect(
        authService.setAssistantPermissions(
          {
            userId: managerAssistant.id,
            permissions: ['USERS_MANAGE', 'SETTINGS_WRITE', 'BACKUP_MANAGE'],
          },
          managerAssistant.id
        )
      ).rejects.toThrowError(/Cannot modify your own permissions/);
    });

    it('Privilege Escalation: Assistant cannot grant permissions that the actor does not possess', async () => {
      const owner = await authService.bootstrapOwner({
        fullName: 'Teacher Mohamed',
        username: 'mohamed',
        pin: '1234',
      });

      const managerAssistant = await authService.createAssistant(
        {
          fullName: 'Manager Assistant',
          username: 'manager',
          pin: '5678',
          role: 'ASSISTANT',
          permissions: ['USERS_MANAGE'],
        },
        owner.id
      );

      const targetAssistant = await authService.createAssistant(
        {
          fullName: 'Target Assistant',
          username: 'target',
          pin: '1111',
          role: 'ASSISTANT',
          permissions: [],
        },
        owner.id
      );

      // Attempting to grant SETTINGS_WRITE when actor only has USERS_MANAGE
      await expect(
        authService.setAssistantPermissions(
          {
            userId: targetAssistant.id,
            permissions: ['SETTINGS_WRITE'],
          },
          managerAssistant.id
        )
      ).rejects.toThrowError(/Cannot grant permissions that the actor does not possess/);

      // Attempting to create new assistant with SETTINGS_WRITE when actor only has USERS_MANAGE
      await expect(
        authService.createAssistant(
          {
            fullName: 'Escalated Assistant',
            username: 'escalated',
            pin: '2222',
            role: 'ASSISTANT',
            permissions: ['SETTINGS_WRITE'],
          },
          managerAssistant.id
        )
      ).rejects.toThrowError(/Cannot grant permissions that the actor does not possess/);
    });
  });
});

