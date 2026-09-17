import crypto from 'crypto';
import {
  type UserDto,
  type UserSessionDto,
  type CreateUserInput,
  type UpdatePermissionsInput,
  type ChangeUserStatusInput,
  type ResetUserPinInput,
  type LoginWithPinInput,
  type UserRole,
  CreateUserSchema,
  LoginWithPinSchema,
  ResetUserPinSchema,
  UpdatePermissionsSchema,
  ChangeUserStatusSchema,
} from '@tibyan/contracts';
import {
  type SystemDrizzle,
  getSystemDatabase,
  UserRepository,
  SystemAuditRepository,
  type UserRow,
} from '@tibyan/db';
import { PinService } from './pin.service.js';
import { ALL_PERMISSION_CODES, requirePermission } from './permissions.js';

export type AuthErrorCode =
  | 'INVALID_PIN'
  | 'ACCOUNT_LOCKED'
  | 'USER_INACTIVE'
  | 'USER_NOT_FOUND'
  | 'OWNER_ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'USERNAME_ALREADY_EXISTS'
  | 'INVALID_OPERATION';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export const AUTH_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  COOLDOWN_SECONDS: 30,
  SESSION_DURATION_HOURS: 8,
} as const;

export class AuthService {
  public readonly userRepo: UserRepository;
  public readonly auditRepo: SystemAuditRepository;

  constructor(
    private db?: SystemDrizzle,
    private pinService: PinService = new PinService(),
    private clock: Clock = new SystemClock()
  ) {
    this.userRepo = new UserRepository(this.db);
    this.auditRepo = new SystemAuditRepository(this.db);
  }

  private get client(): SystemDrizzle {
    return this.db ?? getSystemDatabase().db;
  }

  /**
   * Redacts sensitive cryptographic artifacts from audit snapshots.
   */
  private safeUserSnapshot(user: UserRow | Partial<UserRow>): Record<string, unknown> {
    const copy = { ...user } as Record<string, unknown>;
    delete copy.pinHash;
    delete copy.salt;
    return copy;
  }

  /**
   * Converts a database UserRow into a safe, transportable UserDto.
   */
  private toUserDto(user: UserRow): UserDto {
    const permissions =
      user.role === 'OWNER'
        ? ALL_PERMISSION_CODES
        : this.userRepo.getUserPermissions(user.id);

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      status: user.status as 'ACTIVE' | 'INACTIVE',
      failedAttempts: user.failedAttempts,
      lockedUntil: user.lockedUntil,
      permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Initializes the singular Teacher/Owner account for Tibyan.
   * Fails if an Owner already exists.
   */
  async bootstrapOwner(input: {
    fullName: string;
    username: string;
    pin: string;
  }): Promise<UserDto> {
    const allUsers = this.userRepo.listAll();
    const existingOwner = allUsers.find((u) => u.role === 'OWNER');
    if (existingOwner) {
      throw new AuthError('OWNER_ALREADY_EXISTS', 'Teacher Owner account already exists');
    }

    const cleanUsername = input.username.trim().toLowerCase();
    const existingUsername = this.userRepo.findByUsername(cleanUsername);
    if (existingUsername) {
      throw new AuthError('USERNAME_ALREADY_EXISTS', 'Username is already taken');
    }

    const { pinHash, salt } = await this.pinService.hashPin(input.pin);
    const userId = crypto.randomUUID();
    const nowIso = this.clock.now().toISOString();

    return this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      const created = userRepoTx.create({
        id: userId,
        fullName: input.fullName.trim(),
        username: cleanUsername,
        pinHash,
        salt,
        role: 'OWNER',
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: userId,
        actorNameSnapshot: created.fullName,
        action: 'OWNER_BOOTSTRAPPED',
        entityType: 'USER',
        entityId: userId,
        beforeJson: null,
        afterJson: JSON.stringify(this.safeUserSnapshot(created)),
        metadataJson: JSON.stringify({ role: 'OWNER', bootstrapTime: nowIso }),
        createdAt: nowIso,
      });

      return this.toUserDto(created);
    });
  }

  /**
   * Authenticates a user using their 4-digit PIN, enforcing brute-force cooldown rules.
   */
  async loginWithPin(input: LoginWithPinInput): Promise<UserSessionDto> {
    LoginWithPinSchema.parse(input);

    let user = this.userRepo.findById(input.userId);
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthError('USER_INACTIVE', 'User account is inactive');
    }

    const currentTime = this.clock.now().getTime();
    const nowIso = this.clock.now().toISOString();

    // 1. Evaluate active cooldown
    if (user.lockedUntil) {
      const lockedTime = new Date(user.lockedUntil).getTime();
      if (lockedTime > currentTime) {
        const retryAfterSeconds = Math.ceil((lockedTime - currentTime) / 1000);
        // Do NOT verify the PIN during active cooldown
        throw new AuthError(
          'ACCOUNT_LOCKED',
          `Account is locked due to too many failed attempts. Try again in ${retryAfterSeconds} seconds.`,
          retryAfterSeconds
        );
      } else {
        // Cooldown has expired: clear the stale lock and reset failedAttempts before evaluating attempt
        this.userRepo.update(user.id, {
          lockedUntil: null,
          failedAttempts: 0,
          updatedAt: nowIso,
        });
        user = this.userRepo.findById(user.id)!;
      }
    }

    // 2. Verify candidate PIN
    const isCorrect = await this.pinService.verifyPin(input.pin, user.pinHash, user.salt);

    if (isCorrect) {
      // Successful login
      return this.client.transaction((tx) => {
        const userRepoTx = new UserRepository(tx as any);
        const auditRepoTx = new SystemAuditRepository(tx as any);

        userRepoTx.update(user.id, {
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: nowIso,
        });

        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: 'USER',
          actorUserId: user.id,
          actorNameSnapshot: user.fullName,
          action: 'AUTH_LOGIN_SUCCESS',
          entityType: 'USER',
          entityId: user.id,
          beforeJson: null,
          afterJson: null,
          metadataJson: JSON.stringify({ loginTime: nowIso }),
          createdAt: nowIso,
        });

        const permissions =
          user.role === 'OWNER'
            ? ALL_PERMISSION_CODES
            : userRepoTx.getUserPermissions(user.id);

        const tokenExpiresAt = new Date(
          this.clock.now().getTime() + AUTH_CONFIG.SESSION_DURATION_HOURS * 3600 * 1000
        ).toISOString();

        return {
          userId: user.id,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          permissions,
          tokenExpiresAt,
        };
      });
    }

    // 3. Failed login: increment failed counter and evaluate lock threshold
    const newFailed = (user.failedAttempts || 0) + 1;

    if (newFailed < AUTH_CONFIG.MAX_FAILED_ATTEMPTS) {
      this.client.transaction((tx) => {
        const userRepoTx = new UserRepository(tx as any);
        const auditRepoTx = new SystemAuditRepository(tx as any);

        userRepoTx.update(user.id, {
          failedAttempts: newFailed,
          updatedAt: nowIso,
        });

        // Audit log NEVER contains the submitted PIN
        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: 'USER',
          actorUserId: user.id,
          actorNameSnapshot: user.fullName,
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'USER',
          entityId: user.id,
          beforeJson: null,
          afterJson: null,
          metadataJson: JSON.stringify({
            failedAttempts: newFailed,
            remainingAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS - newFailed,
          }),
          createdAt: nowIso,
        });
      });

      throw new AuthError('INVALID_PIN', 'Invalid PIN provided');
    }

    // 4. Threshold reached: Lock account for 30 seconds
    const lockExpiry = new Date(
      this.clock.now().getTime() + AUTH_CONFIG.COOLDOWN_SECONDS * 1000
    ).toISOString();

    this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      userRepoTx.update(user.id, {
        failedAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
        lockedUntil: lockExpiry,
        updatedAt: nowIso,
      });

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: user.id,
        actorNameSnapshot: user.fullName,
        action: 'AUTH_BRUTE_FORCE_COOLDOWN',
        entityType: 'USER',
        entityId: user.id,
        beforeJson: null,
        afterJson: null,
        metadataJson: JSON.stringify({
          failedAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
          lockedUntil: lockExpiry,
          cooldownSeconds: AUTH_CONFIG.COOLDOWN_SECONDS,
        }),
        createdAt: nowIso,
      });
    });

    throw new AuthError(
      'ACCOUNT_LOCKED',
      `Account locked due to ${AUTH_CONFIG.MAX_FAILED_ATTEMPTS} consecutive failed attempts. Try again in ${AUTH_CONFIG.COOLDOWN_SECONDS} seconds.`,
      AUTH_CONFIG.COOLDOWN_SECONDS
    );
  }

  /**
   * Creates a new Assistant user with assigned permissions.
   */
  async createAssistant(input: CreateUserInput, actorUserId: string): Promise<UserDto> {
    CreateUserSchema.parse(input);

    const actor = this.userRepo.findById(actorUserId);
    if (!actor) {
      throw new AuthError('USER_NOT_FOUND', 'Actor user not found');
    }

    const actorPermissions =
      actor.role === 'OWNER' ? ALL_PERMISSION_CODES : this.userRepo.getUserPermissions(actor.id);
    requirePermission(actor.role, actorPermissions, 'USERS_MANAGE');

    if (input.role === 'OWNER') {
      throw new AuthError('INVALID_OPERATION', 'Cannot create additional Owner accounts');
    }

    const cleanUsername = input.username.trim().toLowerCase();
    const existing = this.userRepo.findByUsername(cleanUsername);
    if (existing) {
      throw new AuthError('USERNAME_ALREADY_EXISTS', 'Username already exists');
    }

    const { pinHash, salt } = await this.pinService.hashPin(input.pin);
    const userId = crypto.randomUUID();
    const nowIso = this.clock.now().toISOString();

    return this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      const created = userRepoTx.create({
        id: userId,
        fullName: input.fullName.trim(),
        username: cleanUsername,
        pinHash,
        salt,
        role: 'ASSISTANT',
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      if (input.permissions && input.permissions.length > 0) {
        userRepoTx.assignPermissions(userId, input.permissions);
      }

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.id,
        actorNameSnapshot: actor.fullName,
        action: 'ASSISTANT_CREATED',
        entityType: 'USER',
        entityId: userId,
        beforeJson: null,
        afterJson: JSON.stringify(this.safeUserSnapshot(created)),
        metadataJson: JSON.stringify({
          role: 'ASSISTANT',
          grantedPermissions: input.permissions,
        }),
        createdAt: nowIso,
      });

      return this.toUserDto(created);
    });
  }

  /**
   * Updates granted permissions for an Assistant user.
   */
  async setAssistantPermissions(
    input: UpdatePermissionsInput,
    actorUserId: string
  ): Promise<UserDto> {
    UpdatePermissionsSchema.parse(input);

    const actor = this.userRepo.findById(actorUserId);
    if (!actor) {
      throw new AuthError('USER_NOT_FOUND', 'Actor user not found');
    }

    const actorPermissions =
      actor.role === 'OWNER' ? ALL_PERMISSION_CODES : this.userRepo.getUserPermissions(actor.id);
    requirePermission(actor.role, actorPermissions, 'USERS_MANAGE');

    const targetUser = this.userRepo.findById(input.userId);
    if (!targetUser) {
      throw new AuthError('USER_NOT_FOUND', 'Target user not found');
    }

    if (targetUser.role === 'OWNER') {
      throw new AuthError('INVALID_OPERATION', 'Owner permissions cannot be altered');
    }

    const nowIso = this.clock.now().toISOString();
    const beforePermissions = this.userRepo.getUserPermissions(targetUser.id);

    return this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      userRepoTx.removePermissions(targetUser.id, ALL_PERMISSION_CODES);
      if (input.permissions.length > 0) {
        userRepoTx.assignPermissions(targetUser.id, input.permissions);
      }

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.id,
        actorNameSnapshot: actor.fullName,
        action: 'USER_PERMISSIONS_CHANGED',
        entityType: 'USER',
        entityId: targetUser.id,
        beforeJson: JSON.stringify({ permissions: beforePermissions }),
        afterJson: JSON.stringify({ permissions: input.permissions }),
        metadataJson: JSON.stringify({ updatedBy: actor.id }),
        createdAt: nowIso,
      });

      return this.toUserDto(targetUser);
    });
  }

  /**
   * Updates user status (ACTIVE or INACTIVE).
   * Rejects attempts to deactivate the sole Owner.
   */
  async setUserStatus(input: ChangeUserStatusInput, actorUserId: string): Promise<UserDto> {
    ChangeUserStatusSchema.parse(input);

    const actor = this.userRepo.findById(actorUserId);
    if (!actor) {
      throw new AuthError('USER_NOT_FOUND', 'Actor user not found');
    }

    const actorPermissions =
      actor.role === 'OWNER' ? ALL_PERMISSION_CODES : this.userRepo.getUserPermissions(actor.id);
    requirePermission(actor.role, actorPermissions, 'USERS_MANAGE');

    const targetUser = this.userRepo.findById(input.userId);
    if (!targetUser) {
      throw new AuthError('USER_NOT_FOUND', 'Target user not found');
    }

    if (targetUser.role === 'OWNER' && input.status === 'INACTIVE') {
      throw new AuthError('INVALID_OPERATION', 'The sole Owner account cannot be deactivated');
    }

    const nowIso = this.clock.now().toISOString();

    return this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      const updated = userRepoTx.update(targetUser.id, {
        status: input.status,
        updatedAt: nowIso,
      })!;

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.id,
        actorNameSnapshot: actor.fullName,
        action: 'USER_STATUS_CHANGED',
        entityType: 'USER',
        entityId: targetUser.id,
        beforeJson: JSON.stringify(this.safeUserSnapshot(targetUser)),
        afterJson: JSON.stringify(this.safeUserSnapshot(updated)),
        metadataJson: JSON.stringify({ oldStatus: targetUser.status, newStatus: input.status }),
        createdAt: nowIso,
      });

      return this.toUserDto(updated);
    });
  }

  /**
   * Resets the 4-digit PIN for a user without leaking the PIN or hashes into audit logs.
   */
  async resetUserPin(input: ResetUserPinInput, actorUserId: string): Promise<UserDto> {
    ResetUserPinSchema.parse(input);

    const actor = this.userRepo.findById(actorUserId);
    if (!actor) {
      throw new AuthError('USER_NOT_FOUND', 'Actor user not found');
    }

    // Can reset own PIN or must have USERS_MANAGE permission
    if (actor.id !== input.userId) {
      const actorPermissions =
        actor.role === 'OWNER' ? ALL_PERMISSION_CODES : this.userRepo.getUserPermissions(actor.id);
      requirePermission(actor.role, actorPermissions, 'USERS_MANAGE');
    }

    const targetUser = this.userRepo.findById(input.userId);
    if (!targetUser) {
      throw new AuthError('USER_NOT_FOUND', 'Target user not found');
    }

    const { pinHash, salt } = await this.pinService.hashPin(input.newPin);
    const nowIso = this.clock.now().toISOString();

    return this.client.transaction((tx) => {
      const userRepoTx = new UserRepository(tx as any);
      const auditRepoTx = new SystemAuditRepository(tx as any);

      const updated = userRepoTx.update(targetUser.id, {
        pinHash,
        salt,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: nowIso,
      })!;

      // Audit records that PIN changed, but old and new values are strictly omitted
      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.id,
        actorNameSnapshot: actor.fullName,
        action: 'USER_PIN_RESET',
        entityType: 'USER',
        entityId: targetUser.id,
        beforeJson: null,
        afterJson: null,
        metadataJson: JSON.stringify({ pinChanged: true, resetTime: nowIso }),
        createdAt: nowIso,
      });

      return this.toUserDto(updated);
    });
  }

  /**
   * Returns safe active users for the login selector.
   */
  listLoginUsers(): Array<{ id: string; fullName: string; username: string; role: UserRole }> {
    return this.userRepo
      .listAll()
      .filter((u) => u.status === 'ACTIVE')
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        role: u.role,
      }));
  }

  /**
   * Retrieves a single user by ID.
   */
  getUserById(id: string): UserDto | null {
    const user = this.userRepo.findById(id);
    return user ? this.toUserDto(user) : null;
  }
}
