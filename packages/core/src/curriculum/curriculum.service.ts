import crypto from 'crypto';
import {
  type CurriculumNodeTier,
  type CurriculumProgressStatus,
  type PermissionCode,
  type UserRole,
  type CurriculumCatalogDto,
  type CreateCurriculumCatalogDto,
  type UpdateCurriculumCatalogDto,
  type CurriculumCatalogFilter,
  type CurriculumNodeDto,
  type CreateCurriculumNodeDto,
  type UpdateCurriculumNodeDto,
  type ReorderCurriculumNodesDto,
  type CurriculumTreeNodeDto,
  type GroupCurriculumAssignmentDto,
  type AssignGroupCatalogDto,
  type GroupNodeProgressDto,
  type UpdateGroupNodeProgressDto,
  type GroupCurriculumOverviewDto,
  CreateCurriculumCatalogSchema,
  UpdateCurriculumCatalogSchema,
  CreateCurriculumNodeSchema,
  UpdateCurriculumNodeSchema,
  ReorderCurriculumNodesSchema,
  AssignGroupCatalogSchema,
  UpdateGroupNodeProgressSchema,
} from '@tibyan/contracts';
import {
  type SystemDrizzle,
  type AcademicDrizzle,
  CurriculumCatalogRepository,
  CurriculumNodeRepository,
  GroupCurriculumRepository,
  GroupRepository,
  SessionRepository,
  SystemAuditRepository,
  AcademicAuditRepository,
  type CurriculumCatalogRow,
  type CurriculumNodeRow,
  type GroupCurriculumAssignmentRow,
  type GroupCurriculumProgressRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';

export type CurriculumErrorCode =
  | 'CATALOG_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'PARENT_NODE_NOT_FOUND'
  | 'INVALID_PARENT_TIER'
  | 'IMMUTABLE_CATALOG'
  | 'INVALID_STATUS_TRANSITION'
  | 'EMPTY_CATALOG'
  | 'GROUP_NOT_FOUND'
  | 'SCOPE_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class CurriculumError extends Error {
  constructor(public readonly code: CurriculumErrorCode, message: string) {
    super(message);
    this.name = 'CurriculumError';
  }
}

export interface CurriculumActor {
  userId?: string | null;
  nameSnapshot?: string;
  fullName?: string;
  role?: UserRole;
  permissions?: PermissionCode[];
}

export class CurriculumService {
  private readonly catalogRepo: CurriculumCatalogRepository;
  private readonly nodeRepo: CurriculumNodeRepository;
  private readonly groupCurriculumRepo: GroupCurriculumRepository;
  private readonly groupRepo: GroupRepository;
  private readonly sessionRepo: SessionRepository;
  private readonly systemAuditRepo: SystemAuditRepository;
  private readonly academicAuditRepo: AcademicAuditRepository;

  constructor(systemDb: SystemDrizzle, academicDb: AcademicDrizzle) {
    this.catalogRepo = new CurriculumCatalogRepository(systemDb);
    this.nodeRepo = new CurriculumNodeRepository(systemDb);
    this.groupCurriculumRepo = new GroupCurriculumRepository(academicDb);
    this.groupRepo = new GroupRepository(academicDb);
    this.sessionRepo = new SessionRepository(academicDb);
    this.systemAuditRepo = new SystemAuditRepository(systemDb);
    this.academicAuditRepo = new AcademicAuditRepository(academicDb);
  }

  private checkPermission(actor?: CurriculumActor, required?: PermissionCode): void {
    if (!actor || !required || !actor.role) return;
    requirePermission(actor.role, actor.permissions ?? [], required);
  }

  // ==========================================
  // 1. Catalog Management (System DB)
  // ==========================================

  listCatalogs(filter?: CurriculumCatalogFilter, actor?: CurriculumActor): CurriculumCatalogDto[] {
    this.checkPermission(actor, 'GROUPS_READ');
    const rows = this.catalogRepo.list(filter);
    return rows.map((r) => this.mapCatalogRow(r));
  }

  getCatalog(id: string, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_READ');
    const row = this.catalogRepo.findById(id);
    if (!row) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }
    return this.mapCatalogRow(row);
  }

  createCatalog(input: CreateCurriculumCatalogDto, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = CreateCurriculumCatalogSchema.parse(input);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Check version for scope
    const latestVersion = this.catalogRepo.getLatestScopeVersion(
      validated.educationSystem,
      validated.gradeLevel,
      validated.languageTrack,
      validated.mathBranch
    );

    const newVersion = latestVersion + 1;

    const row = this.catalogRepo.create({
      id,
      code: validated.code,
      title: validated.title,
      educationSystem: validated.educationSystem,
      gradeLevel: validated.gradeLevel,
      languageTrack: validated.languageTrack,
      mathBranch: validated.mathBranch ?? null,
      version: newVersion,
      status: 'DRAFT',
      publishedAt: null,
      description: validated.description ?? null,
      createdAt: now,
      updatedAt: now,
    });

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_CATALOG_CREATED',
      entityType: 'CURRICULUM_CATALOG',
      entityId: id,
      beforeJson: null,
      afterJson: JSON.stringify(row),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapCatalogRow(row);
  }

  updateCatalog(
    id: string,
    input: UpdateCurriculumCatalogDto,
    actor?: CurriculumActor
  ): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = UpdateCurriculumCatalogSchema.parse(input);

    const catalog = this.catalogRepo.findById(id);
    if (!catalog) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Published or archived catalogs cannot be modified. Create a revision instead.'
      );
    }

    const now = new Date().toISOString();
    const updated = this.catalogRepo.update(id, {
      title: validated.title ?? catalog.title,
      description: validated.description !== undefined ? validated.description : catalog.description,
    });

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_CATALOG_UPDATED',
      entityType: 'CURRICULUM_CATALOG',
      entityId: id,
      beforeJson: JSON.stringify(catalog),
      afterJson: JSON.stringify(updated),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapCatalogRow(updated);
  }

  publishCatalog(id: string, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const catalog = this.catalogRepo.findById(id);
    if (!catalog) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'INVALID_STATUS_TRANSITION',
        `Cannot publish catalog with status '${catalog.status}'`
      );
    }

    const nodeCount = this.nodeRepo.countByCatalogId(id);
    if (nodeCount === 0) {
      throw new CurriculumError(
        'EMPTY_CATALOG',
        'Cannot publish an empty catalog without any curriculum nodes'
      );
    }

    const now = new Date().toISOString();
    const updated = this.catalogRepo.update(id, {
      status: 'PUBLISHED',
      publishedAt: now,
    });

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_CATALOG_PUBLISHED',
      entityType: 'CURRICULUM_CATALOG',
      entityId: id,
      beforeJson: JSON.stringify(catalog),
      afterJson: JSON.stringify(updated),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapCatalogRow(updated);
  }

  reviseCatalog(id: string, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const original = this.catalogRepo.findById(id);
    if (!original) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (original.status !== 'PUBLISHED') {
      throw new CurriculumError(
        'INVALID_STATUS_TRANSITION',
        'Only published catalogs can be revised into a new version'
      );
    }

    const now = new Date().toISOString();
    const newCatalogId = crypto.randomUUID();

    const latestVersion = this.catalogRepo.getLatestScopeVersion(
      original.educationSystem,
      original.gradeLevel,
      original.languageTrack,
      original.mathBranch
    );
    const newVersion = latestVersion + 1;

    // Create new version in DRAFT
    const newCatalog = this.catalogRepo.create({
      id: newCatalogId,
      code: original.code,
      title: `${original.title} (إصدار ${newVersion})`,
      educationSystem: original.educationSystem,
      gradeLevel: original.gradeLevel,
      languageTrack: original.languageTrack,
      mathBranch: original.mathBranch,
      version: newVersion,
      status: 'DRAFT',
      publishedAt: null,
      description: original.description,
      createdAt: now,
      updatedAt: now,
    });

    // Deep clone all nodes preserving parent-child mapping
    const originalNodes = this.nodeRepo.findByCatalogId(id);
    const idMap = new Map<string, string>();

    // Pass 1: generate new UUIDs
    for (const node of originalNodes) {
      idMap.set(node.id, crypto.randomUUID());
    }

    // Pass 2: insert cloned nodes
    const clonedNodes = originalNodes.map((node) => ({
      id: idMap.get(node.id)!,
      catalogId: newCatalogId,
      parentId: node.parentId ? (idMap.get(node.parentId) ?? null) : null,
      tier: node.tier,
      titleAr: node.titleAr,
      titleEn: node.titleEn,
      code: node.code,
      orderIndex: node.orderIndex,
      description: node.description,
      metadataJson: node.metadataJson,
      createdAt: now,
      updatedAt: now,
    }));

    if (clonedNodes.length > 0) {
      this.nodeRepo.createBatch(clonedNodes);
    }

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_CATALOG_REVISED',
      entityType: 'CURRICULUM_CATALOG',
      entityId: newCatalogId,
      beforeJson: JSON.stringify(original),
      afterJson: JSON.stringify(newCatalog),
      metadataJson: JSON.stringify({ sourceCatalogId: id, clonedNodesCount: clonedNodes.length }),
      createdAt: now,
    });

    return this.mapCatalogRow(newCatalog);
  }

  // ==========================================
  // 2. Hierarchy & Node Management (System DB)
  // ==========================================

  getTree(catalogId: string, actor?: CurriculumActor): CurriculumTreeNodeDto[] {
    this.checkPermission(actor, 'GROUPS_READ');
    const catalog = this.catalogRepo.findById(catalogId);
    if (!catalog) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${catalogId}' not found`);
    }

    const allNodes = this.nodeRepo.findByCatalogId(catalogId);
    return this.buildTree(allNodes);
  }

  createNode(input: CreateCurriculumNodeDto, actor?: CurriculumActor): CurriculumNodeDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = CreateCurriculumNodeSchema.parse(input);

    const catalog = this.catalogRepo.findById(validated.catalogId);
    if (!catalog) {
      throw new CurriculumError(
        'CATALOG_NOT_FOUND',
        `Curriculum catalog '${validated.catalogId}' not found`
      );
    }

    if (catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot add nodes to a published or archived catalog. Create a revision first.'
      );
    }

    // Tier hierarchy validation
    this.validateParentTier(validated.tier, validated.parentId, validated.catalogId);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    let orderIndex = validated.orderIndex;
    if (orderIndex === undefined) {
      const siblings = this.nodeRepo.findByParentId(validated.catalogId, validated.parentId ?? null);
      orderIndex = siblings.length > 0 ? Math.max(...siblings.map((s) => s.orderIndex)) + 1 : 0;
    }

    const row = this.nodeRepo.create({
      id,
      catalogId: validated.catalogId,
      parentId: validated.parentId ?? null,
      tier: validated.tier,
      titleAr: validated.titleAr,
      titleEn: validated.titleEn ?? null,
      code: validated.code,
      orderIndex,
      description: validated.description ?? null,
      metadataJson: validated.metadataJson ?? null,
      createdAt: now,
      updatedAt: now,
    });

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_NODE_CREATED',
      entityType: 'CURRICULUM_NODE',
      entityId: id,
      beforeJson: null,
      afterJson: JSON.stringify(row),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapNodeRow(row);
  }

  updateNode(id: string, input: UpdateCurriculumNodeDto, actor?: CurriculumActor): CurriculumNodeDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = UpdateCurriculumNodeSchema.parse(input);

    const node = this.nodeRepo.findById(id);
    if (!node) {
      throw new CurriculumError('NODE_NOT_FOUND', `Curriculum node '${id}' not found`);
    }

    const catalog = this.catalogRepo.findById(node.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot modify nodes of a published or archived catalog.'
      );
    }

    const now = new Date().toISOString();
    const updated = this.nodeRepo.update(id, {
      titleAr: validated.titleAr ?? node.titleAr,
      titleEn: validated.titleEn !== undefined ? validated.titleEn : node.titleEn,
      code: validated.code ?? node.code,
      orderIndex: validated.orderIndex !== undefined ? validated.orderIndex : node.orderIndex,
      description: validated.description !== undefined ? validated.description : node.description,
      metadataJson: validated.metadataJson !== undefined ? validated.metadataJson : node.metadataJson,
    });

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_NODE_UPDATED',
      entityType: 'CURRICULUM_NODE',
      entityId: id,
      beforeJson: JSON.stringify(node),
      afterJson: JSON.stringify(updated),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapNodeRow(updated);
  }

  deleteNode(id: string, actor?: CurriculumActor): void {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const node = this.nodeRepo.findById(id);
    if (!node) {
      throw new CurriculumError('NODE_NOT_FOUND', `Curriculum node '${id}' not found`);
    }

    const catalog = this.catalogRepo.findById(node.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot delete nodes from a published or archived catalog.'
      );
    }

    const now = new Date().toISOString();
    this.nodeRepo.delete(id);

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_NODE_DELETED',
      entityType: 'CURRICULUM_NODE',
      entityId: id,
      beforeJson: JSON.stringify(node),
      afterJson: null,
      metadataJson: null,
      createdAt: now,
    });
  }

  reorderNodes(input: ReorderCurriculumNodesDto, actor?: CurriculumActor): void {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = ReorderCurriculumNodesSchema.parse(input);

    const catalog = this.catalogRepo.findById(validated.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot reorder nodes of a published or archived catalog.'
      );
    }

    const now = new Date().toISOString();
    this.nodeRepo.reorder(validated.catalogId, validated.items);

    this.systemAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'CURRICULUM_NODES_REORDERED',
      entityType: 'CURRICULUM_CATALOG',
      entityId: validated.catalogId,
      beforeJson: null,
      afterJson: JSON.stringify(validated.items),
      metadataJson: null,
      createdAt: now,
    });
  }

  // ==========================================
  // 3. Group Assignment & Pacing (Cross-DB)
  // ==========================================

  assignGroupCatalog(input: AssignGroupCatalogDto, actor?: CurriculumActor): GroupCurriculumAssignmentDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = AssignGroupCatalogSchema.parse(input);

    // 1. Group in Academic DB
    const group = this.groupRepo.findById(validated.groupId);
    if (!group) {
      throw new CurriculumError('GROUP_NOT_FOUND', `Group '${validated.groupId}' not found`);
    }

    // 2. Catalog in System DB
    const catalog = this.catalogRepo.findById(validated.catalogId);
    if (!catalog) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${validated.catalogId}' not found`);
    }

    // 3. Must be published
    if (catalog.status !== 'PUBLISHED') {
      throw new CurriculumError(
        'INVALID_STATUS_TRANSITION',
        'Cannot assign an unready draft catalog to an active group'
      );
    }

    // 4. Scope matching
    if (
      group.educationSystem !== catalog.educationSystem ||
      group.gradeLevel !== catalog.gradeLevel ||
      group.languageTrack !== catalog.languageTrack ||
      (catalog.mathBranch && group.focusMathBranch && group.focusMathBranch !== catalog.mathBranch)
    ) {
      throw new CurriculumError(
        'SCOPE_MISMATCH',
        `Group scope (${group.educationSystem}/${group.gradeLevel}/${group.languageTrack}) does not match catalog scope (${catalog.educationSystem}/${catalog.gradeLevel}/${catalog.languageTrack})`
      );
    }

    const now = new Date().toISOString();
    const existing = this.groupCurriculumRepo.getAssignment(validated.groupId);

    // If changing catalog, clear old progress
    if (existing && existing.catalogId !== validated.catalogId) {
      this.groupCurriculumRepo.resetProgressForGroup(validated.groupId);
    }

    const row = this.groupCurriculumRepo.assignCatalog({
      id: existing ? existing.id : crypto.randomUUID(),
      groupId: validated.groupId,
      catalogId: validated.catalogId,
      catalogVersion: catalog.version,
      assignedAt: now,
      assignedByUserId: actor?.userId ?? null,
      assignedByNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      notes: validated.notes ?? null,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'GROUP_CURRICULUM_ASSIGNED',
      entityType: 'GROUP_CURRICULUM_ASSIGNMENT',
      entityId: row.id,
      beforeJson: existing ? JSON.stringify(existing) : null,
      afterJson: JSON.stringify(row),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapAssignmentRow(row);
  }

  updateGroupNodeProgress(
    input: UpdateGroupNodeProgressDto,
    actor?: CurriculumActor
  ): GroupNodeProgressDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = UpdateGroupNodeProgressSchema.parse(input);

    const assignment = this.groupCurriculumRepo.getAssignment(validated.groupId);
    if (!assignment) {
      throw new CurriculumError(
        'INVALID_INPUT',
        `Group '${validated.groupId}' has no assigned curriculum catalog`
      );
    }

    // Validate node belongs to group's assigned catalog
    const node = this.nodeRepo.findById(validated.nodeId);
    if (!node || node.catalogId !== assignment.catalogId) {
      throw new CurriculumError(
        'NODE_NOT_FOUND',
        `Curriculum node '${validated.nodeId}' does not belong to group's assigned catalog`
      );
    }

    const now = new Date().toISOString();
    const existing = this.groupCurriculumRepo.getNodeProgress(validated.groupId, validated.nodeId);

    const row = this.groupCurriculumRepo.upsertProgress({
      id: existing ? existing.id : crypto.randomUUID(),
      groupId: validated.groupId,
      catalogId: assignment.catalogId,
      nodeId: validated.nodeId,
      status: validated.status,
      completedAt: validated.status === 'COMPLETED' ? now : null,
      updatedByUserId: actor?.userId ?? null,
      updatedByNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      notes: validated.notes ?? existing?.notes ?? null,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor?.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor?.userId ?? null,
      actorNameSnapshot: actor?.nameSnapshot ?? 'System Engine',
      action: 'GROUP_CURRICULUM_PROGRESS_UPDATED',
      entityType: 'GROUP_CURRICULUM_PROGRESS',
      entityId: row.id,
      beforeJson: existing ? JSON.stringify(existing) : null,
      afterJson: JSON.stringify(row),
      metadataJson: null,
      createdAt: now,
    });

    return this.mapProgressRow(row);
  }

  getGroupOverview(groupId: string, actor?: CurriculumActor): GroupCurriculumOverviewDto {
    this.checkPermission(actor, 'GROUPS_READ');
    const assignment = this.groupCurriculumRepo.getAssignment(groupId);
    if (!assignment) {
      return {
        assignment: null,
        catalog: null,
        totalSkills: 0,
        completedSkills: 0,
        inProgressSkills: 0,
        remainingSkills: 0,
        completionPercentage: 0,
        projection: {
          status: 'INSUFFICIENT_DATA',
          messageAr: 'لم يتم تعيين منهج دراسي لهذه المجموعة بعد',
          completedSessionsCount: 0,
          skillsPerWeekRate: null,
          projectedCompletionDate: null,
        },
      };
    }

    const catalogRow = this.catalogRepo.findById(assignment.catalogId);
    const catalog = catalogRow ? this.mapCatalogRow(catalogRow) : null;

    const allNodes = this.nodeRepo.findByCatalogId(assignment.catalogId);
    const skills = allNodes.filter((n) => n.tier === 'SKILL');
    // If no explicit skills, fall back to lessons as atomic leaf denominator
    const denominatorNodes = skills.length > 0 ? skills : allNodes.filter((n) => n.tier === 'LESSON');
    const totalSkills = denominatorNodes.length;

    const progressRows = this.groupCurriculumRepo.getProgressByGroup(groupId);
    const progressMap = new Map(progressRows.map((p) => [p.nodeId, p.status]));

    let completedSkills = 0;
    let inProgressSkills = 0;

    for (const node of denominatorNodes) {
      const status = progressMap.get(node.id);
      if (status === 'COMPLETED') completedSkills++;
      else if (status === 'IN_PROGRESS') inProgressSkills++;
    }

    const remainingSkills = Math.max(0, totalSkills - completedSkills);
    const completionPercentage = totalSkills > 0
      ? Math.round((completedSkills / totalSkills) * 1000) / 10
      : 0;

    // Projection calculation
    const completedSessions = this.sessionRepo
      .listByGroup(groupId)
      .filter((s) => s.status === 'COMPLETED');

    const completedSessionsCount = completedSessions.length;

    let projectionStatus: 'INSUFFICIENT_DATA' | 'ON_TRACK' | 'UNREALISTIC_PACING' = 'INSUFFICIENT_DATA';
    let messageAr = 'بيانات الحصص والتقدم غير كافية لحساب التوقع بدقة (يلزم حصتان مكتملتان ومهارة مكتملة واحدة على الأقل)';
    let skillsPerWeekRate: number | null = null;
    let projectedCompletionDate: string | null = null;

    if (totalSkills > 0 && remainingSkills === 0) {
      projectionStatus = 'ON_TRACK';
      messageAr = 'تم إكمال جميع مهارات المنهج بنجاح';
      projectedCompletionDate = completedSessions[completedSessions.length - 1]?.effectiveDate ?? null;
    } else if (completedSessionsCount >= 2 && completedSkills > 0) {
      // Sort sessions ascending by effectiveDate
      const sorted = [...completedSessions].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      const firstSession = sorted[0]!;
      const lastSession = sorted[sorted.length - 1]!;
      const firstDate = new Date(firstSession.effectiveDate);
      const lastDate = new Date(lastSession.effectiveDate);

      const diffMs = Math.max(0, lastDate.getTime() - firstDate.getTime());
      const diffDays = Math.max(7, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const elapsedWeeks = diffDays / 7;

      const rate = completedSkills / elapsedWeeks;
      skillsPerWeekRate = Math.round(rate * 10) / 10;

      if (rate <= 0) {
        projectionStatus = 'UNREALISTIC_PACING';
        messageAr = 'معدل الإنجاز الحالي غير كافٍ لتقدير موعد الانتهاء';
      } else {
        const weeksNeeded = remainingSkills / rate;
        const targetMs = lastDate.getTime() + weeksNeeded * 7 * 24 * 60 * 60 * 1000;
        const targetDate = new Date(targetMs);
        projectedCompletionDate = targetDate.toISOString().slice(0, 10);

        projectionStatus = 'ON_TRACK';
        messageAr = `وفق معدل الإنجاز الحالي (${skillsPerWeekRate} مهارة/أسبوع)، يتوقع إنهاء المنهج في ${projectedCompletionDate}`;
      }
    }

    return {
      assignment: this.mapAssignmentRow(assignment),
      catalog,
      totalSkills,
      completedSkills,
      inProgressSkills,
      remainingSkills,
      completionPercentage,
      projection: {
        status: projectionStatus,
        messageAr,
        completedSessionsCount,
        skillsPerWeekRate,
        projectedCompletionDate,
      },
    };
  }

  getGroupProgressMap(groupId: string, actor?: CurriculumActor): Record<string, CurriculumProgressStatus> {
    this.checkPermission(actor, 'GROUPS_READ');
    const rows = this.groupCurriculumRepo.getProgressByGroup(groupId);
    const map: Record<string, CurriculumProgressStatus> = {};
    for (const r of rows) {
      map[r.nodeId] = r.status;
    }
    return map;
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private validateParentTier(
    tier: CurriculumNodeTier,
    parentId: string | null | undefined,
    catalogId: string
  ): void {
    if (tier === 'UNIT') {
      if (parentId) {
        throw new CurriculumError(
          'INVALID_PARENT_TIER',
          'UNIT tier nodes cannot have a parent (they are root modules)'
        );
      }
      return;
    }

    if (!parentId) {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        `Nodes of tier '${tier}' must specify a parent node`
      );
    }

    const parent = this.nodeRepo.findById(parentId);
    if (!parent || parent.catalogId !== catalogId) {
      throw new CurriculumError(
        'PARENT_NODE_NOT_FOUND',
        `Parent node '${parentId}' not found in catalog '${catalogId}'`
      );
    }

    if (tier === 'LESSON' && parent.tier !== 'UNIT') {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        `LESSON parent must be a UNIT (received '${parent.tier}')`
      );
    }

    if (tier === 'CONCEPT' && parent.tier !== 'LESSON') {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        `CONCEPT parent must be a LESSON (received '${parent.tier}')`
      );
    }

    if (tier === 'SKILL' && parent.tier !== 'CONCEPT' && parent.tier !== 'LESSON') {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        `SKILL parent must be a CONCEPT or LESSON (received '${parent.tier}')`
      );
    }
  }

  private buildTree(nodes: CurriculumNodeRow[]): CurriculumTreeNodeDto[] {
    const nodeMap = new Map<string, CurriculumTreeNodeDto>();
    for (const n of nodes) {
      nodeMap.set(n.id, {
        ...this.mapNodeRow(n),
        children: [],
      });
    }

    const rootNodes: CurriculumTreeNodeDto[] = [];
    for (const n of nodes) {
      const treeNode = nodeMap.get(n.id)!;
      if (n.parentId && nodeMap.has(n.parentId)) {
        nodeMap.get(n.parentId)!.children.push(treeNode);
      } else {
        rootNodes.push(treeNode);
      }
    }

    // Sort children recursively by orderIndex
    const sortRec = (items: CurriculumTreeNodeDto[]) => {
      items.sort((a, b) => a.orderIndex - b.orderIndex);
      for (const item of items) {
        sortRec(item.children);
      }
    };
    sortRec(rootNodes);

    return rootNodes;
  }

  private mapCatalogRow(row: CurriculumCatalogRow): CurriculumCatalogDto {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      educationSystem: row.educationSystem,
      gradeLevel: row.gradeLevel,
      languageTrack: row.languageTrack,
      mathBranch: row.mathBranch ?? null,
      version: row.version,
      status: row.status,
      publishedAt: row.publishedAt ?? null,
      description: row.description ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapNodeRow(row: CurriculumNodeRow): CurriculumNodeDto {
    return {
      id: row.id,
      catalogId: row.catalogId,
      parentId: row.parentId ?? null,
      tier: row.tier,
      titleAr: row.titleAr,
      titleEn: row.titleEn ?? null,
      code: row.code,
      orderIndex: row.orderIndex,
      description: row.description ?? null,
      metadataJson: row.metadataJson ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapAssignmentRow(row: GroupCurriculumAssignmentRow): GroupCurriculumAssignmentDto {
    return {
      id: row.id,
      groupId: row.groupId,
      catalogId: row.catalogId,
      catalogVersion: row.catalogVersion,
      assignedAt: row.assignedAt,
      assignedByUserId: row.assignedByUserId ?? null,
      assignedByNameSnapshot: row.assignedByNameSnapshot,
      notes: row.notes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapProgressRow(row: GroupCurriculumProgressRow): GroupNodeProgressDto {
    return {
      id: row.id,
      groupId: row.groupId,
      catalogId: row.catalogId,
      nodeId: row.nodeId,
      status: row.status,
      completedAt: row.completedAt ?? null,
      updatedByUserId: row.updatedByUserId ?? null,
      updatedByNameSnapshot: row.updatedByNameSnapshot,
      notes: row.notes ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
