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
  | 'INVALID_NODE_TIER'
  | 'IMMUTABLE_CATALOG'
  | 'INVALID_STATUS_TRANSITION'
  | 'EMPTY_CATALOG'
  | 'INCOMPLETE_CATALOG'
  | 'GROUP_NOT_FOUND'
  | 'SCOPE_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'REASSIGNMENT_REQUIRES_RESET_CONFIRMATION'
  | 'CATALOG_INTEGRITY_ERROR';

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

  constructor(
    private systemDb: SystemDrizzle,
    private academicDb: AcademicDrizzle
  ) {
    this.catalogRepo = new CurriculumCatalogRepository(systemDb);
    this.nodeRepo = new CurriculumNodeRepository(systemDb);
    this.groupCurriculumRepo = new GroupCurriculumRepository(academicDb);
    this.groupRepo = new GroupRepository(academicDb);
    this.sessionRepo = new SessionRepository(academicDb);
  }

  private checkPermission(actor?: CurriculumActor, required?: PermissionCode): void {
    if (!required) return;
    if (!actor || !actor.role) {
      throw new CurriculumError(
        'PERMISSION_DENIED',
        'PERMISSION_DENIED: Authenticated actor with a valid role is required'
      );
    }
    try {
      requirePermission(actor.role, actor.permissions ?? [], required);
    } catch {
      throw new CurriculumError(
        'PERMISSION_DENIED',
        `PERMISSION_DENIED: Actor does not have required permission '${required}'`
      );
    }
  }

  private getActorSnapshot(actor?: CurriculumActor): string {
    const name = actor?.fullName?.trim() || actor?.nameSnapshot?.trim();
    if (name) return name;
    if (actor?.userId) return `User (${actor.userId})`;
    return 'System Engine';
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

    const version = this.catalogRepo.getNextVersion(
      validated.educationSystem,
      validated.gradeLevel,
      validated.languageTrack,
      validated.mathBranch
    );

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    return this.systemDb.transaction((tx) => {
      const txCatalogRepo = new CurriculumCatalogRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const row = txCatalogRepo.create({
        id,
        code: validated.code,
        title: validated.title,
        description: validated.description ?? null,
        educationSystem: validated.educationSystem,
        gradeLevel: validated.gradeLevel,
        languageTrack: validated.languageTrack,
        mathBranch: validated.mathBranch ?? null,
        version,
        status: 'DRAFT',
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_CATALOG_CREATED',
        entityType: 'CURRICULUM_CATALOG',
        entityId: row.id,
        beforeJson: null,
        afterJson: JSON.stringify(row),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapCatalogRow(row);
    });
  }

  updateCatalog(
    id: string,
    input: UpdateCurriculumCatalogDto,
    actor?: CurriculumActor
  ): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = UpdateCurriculumCatalogSchema.parse(input);

    const existing = this.catalogRepo.findById(id);
    if (!existing) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        `Catalog '${id}' is in status '${existing.status}' and cannot be edited. Revise catalog to version N+1 instead.`
      );
    }

    const now = new Date().toISOString();
    return this.systemDb.transaction((tx) => {
      const txCatalogRepo = new CurriculumCatalogRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const updated = txCatalogRepo.update(id, {
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        updatedAt: now,
      });

      if (!updated) {
        throw new CurriculumError('CATALOG_NOT_FOUND', `Catalog '${id}' could not be updated`);
      }

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_CATALOG_UPDATED',
        entityType: 'CURRICULUM_CATALOG',
        entityId: id,
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify(updated),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapCatalogRow(updated);
    });
  }

  publishCatalog(id: string, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const catalog = this.catalogRepo.findById(id);
    if (!catalog) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (catalog.status === 'PUBLISHED') {
      return this.mapCatalogRow(catalog);
    }

    if (catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'INVALID_STATUS_TRANSITION',
        `Cannot publish a catalog in '${catalog.status}' status`
      );
    }

    const nodes = this.nodeRepo.findByCatalogId(id);
    this.validateCatalogTreeCompleteness(id, nodes);

    const now = new Date().toISOString();
    return this.systemDb.transaction((tx) => {
      const txCatalogRepo = new CurriculumCatalogRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const updated = txCatalogRepo.update(id, {
        status: 'PUBLISHED',
        publishedAt: now,
        updatedAt: now,
      });

      if (!updated) {
        throw new CurriculumError('CATALOG_NOT_FOUND', `Catalog '${id}' could not be updated`);
      }

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_CATALOG_PUBLISHED',
        entityType: 'CURRICULUM_CATALOG',
        entityId: id,
        beforeJson: JSON.stringify(catalog),
        afterJson: JSON.stringify(updated),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapCatalogRow(updated);
    });
  }

  reviseCatalog(id: string, actor?: CurriculumActor): CurriculumCatalogDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const source = this.catalogRepo.findById(id);
    if (!source) {
      throw new CurriculumError('CATALOG_NOT_FOUND', `Curriculum catalog '${id}' not found`);
    }

    if (source.status !== 'PUBLISHED') {
      throw new CurriculumError(
        'INVALID_STATUS_TRANSITION',
        `Only PUBLISHED catalogs can be revised into a new version. Catalog '${id}' is in '${source.status}' status.`
      );
    }

    const nextVersion = this.catalogRepo.getNextVersion(
      source.educationSystem,
      source.gradeLevel,
      source.languageTrack,
      source.mathBranch
    );

    const now = new Date().toISOString();
    const newCatalogId = crypto.randomUUID();

    const sourceNodes = this.nodeRepo.findByCatalogId(id);

    return this.systemDb.transaction((tx) => {
      const txCatalogRepo = new CurriculumCatalogRepository(tx);
      const txNodeRepo = new CurriculumNodeRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const newCatalog = txCatalogRepo.create({
        id: newCatalogId,
        code: `${source.code}-v${nextVersion}`,
        title: source.title,
        description: source.description,
        educationSystem: source.educationSystem,
        gradeLevel: source.gradeLevel,
        languageTrack: source.languageTrack,
        mathBranch: source.mathBranch,
        version: nextVersion,
        status: 'DRAFT',
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const idMap = new Map<string, string>();
      for (const node of sourceNodes) {
        idMap.set(node.id, crypto.randomUUID());
      }

      for (const node of sourceNodes) {
        const clonedId = idMap.get(node.id)!;
        const clonedParentId = node.parentId ? idMap.get(node.parentId) ?? null : null;
        txNodeRepo.create({
          id: clonedId,
          catalogId: newCatalogId,
          parentId: clonedParentId,
          tier: node.tier,
          titleAr: node.titleAr,
          code: node.code,
          description: node.description,
          orderIndex: node.orderIndex,
          createdAt: now,
          updatedAt: now,
        });
      }

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_CATALOG_REVISED',
        entityType: 'CURRICULUM_CATALOG',
        entityId: newCatalogId,
        beforeJson: JSON.stringify({ sourceCatalogId: id, sourceVersion: source.version }),
        afterJson: JSON.stringify(newCatalog),
        metadataJson: JSON.stringify({ clonedNodesCount: sourceNodes.length }),
        createdAt: now,
      });

      return this.mapCatalogRow(newCatalog);
    });
  }

  // ==========================================
  // 2. Node Management (System DB)
  // ==========================================

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
        'Cannot add nodes to a published or archived catalog. Revise catalog to version N+1 instead.'
      );
    }

    if (validated.tier === 'UNIT' && validated.parentId) {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        'UNIT tier nodes cannot have a parent (they must be root)'
      );
    }

    let parent: CurriculumNodeRow | null = null;
    if (validated.parentId) {
      parent = this.nodeRepo.findById(validated.parentId);
      if (!parent || parent.catalogId !== validated.catalogId) {
        throw new CurriculumError(
          'PARENT_NODE_NOT_FOUND',
          `Parent node '${validated.parentId}' not found in catalog '${validated.catalogId}'`
        );
      }
    }

    this.validateParent(validated.tier, parent);

    const orderIndex =
      validated.orderIndex ?? this.nodeRepo.getNextOrderIndex(validated.catalogId, validated.parentId ?? null);

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    return this.systemDb.transaction((tx) => {
      const txNodeRepo = new CurriculumNodeRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const row = txNodeRepo.create({
        id,
        catalogId: validated.catalogId,
        parentId: validated.parentId ?? null,
        tier: validated.tier,
        titleAr: validated.titleAr,
        titleEn: validated.titleEn ?? null,
        code: validated.code,
        description: validated.description ?? null,
        metadataJson: validated.metadataJson ?? null,
        orderIndex,
        createdAt: now,
        updatedAt: now,
      });

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_NODE_CREATED',
        entityType: 'CURRICULUM_NODE',
        entityId: row.id,
        beforeJson: null,
        afterJson: JSON.stringify(row),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapNodeRow(row);
    });
  }

  updateNode(
    id: string,
    input: UpdateCurriculumNodeDto,
    actor?: CurriculumActor
  ): CurriculumNodeDto {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const validated = UpdateCurriculumNodeSchema.parse(input);

    const existing = this.nodeRepo.findById(id);
    if (!existing) {
      throw new CurriculumError('NODE_NOT_FOUND', `Curriculum node '${id}' not found`);
    }

    const catalog = this.catalogRepo.findById(existing.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot update nodes of a published or archived catalog. Revise catalog to version N+1 instead.'
      );
    }

    const now = new Date().toISOString();
    return this.systemDb.transaction((tx) => {
      const txNodeRepo = new CurriculumNodeRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const updated = txNodeRepo.update(id, {
        ...(validated.titleAr !== undefined ? { titleAr: validated.titleAr } : {}),
        ...(validated.titleEn !== undefined ? { titleEn: validated.titleEn } : {}),
        ...(validated.code !== undefined ? { code: validated.code } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.metadataJson !== undefined ? { metadataJson: validated.metadataJson } : {}),
        ...(validated.orderIndex !== undefined ? { orderIndex: validated.orderIndex } : {}),
        updatedAt: now,
      });

      if (!updated) {
        throw new CurriculumError('NODE_NOT_FOUND', `Node '${id}' could not be updated`);
      }

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_NODE_UPDATED',
        entityType: 'CURRICULUM_NODE',
        entityId: id,
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify(updated),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapNodeRow(updated);
    });
  }

  deleteNode(nodeId: string, actor?: CurriculumActor): number {
    this.checkPermission(actor, 'GROUPS_WRITE');
    const targetNode = this.nodeRepo.findById(nodeId);
    if (!targetNode) {
      throw new CurriculumError('NODE_NOT_FOUND', `Curriculum node '${nodeId}' not found`);
    }

    const catalog = this.catalogRepo.findById(targetNode.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot delete nodes of a published or archived catalog. Revise catalog to version N+1 instead.'
      );
    }

    const allCatalogNodes = this.nodeRepo.findByCatalogId(targetNode.catalogId);
    const descendantIds = this.collectDescendantIds(nodeId, allCatalogNodes);
    const allIdsToDelete = [nodeId, ...descendantIds];

    const now = new Date().toISOString();
    return this.systemDb.transaction((tx) => {
      const txNodeRepo = new CurriculumNodeRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      const deletedCount = txNodeRepo.deleteBatch(allIdsToDelete);

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_NODE_DELETED',
        entityType: 'CURRICULUM_NODE',
        entityId: nodeId,
        beforeJson: JSON.stringify({ targetNode, deletedDescendantIds: descendantIds }),
        afterJson: null,
        metadataJson: JSON.stringify({ deletedTotal: deletedCount }),
        createdAt: now,
      });

      return deletedCount;
    });
  }

  reorderNodes(
    catalogIdOrInput: string | ReorderCurriculumNodesDto,
    itemsOrActor?: { id: string; orderIndex: number }[] | CurriculumActor,
    maybeActor?: CurriculumActor
  ): void {
    let validated: ReorderCurriculumNodesDto;
    let actor: CurriculumActor | undefined;

    if (typeof catalogIdOrInput === 'string') {
      validated = ReorderCurriculumNodesSchema.parse({
        catalogId: catalogIdOrInput,
        items: itemsOrActor as { id: string; orderIndex: number }[],
      });
      actor = maybeActor;
    } else {
      validated = ReorderCurriculumNodesSchema.parse(catalogIdOrInput);
      actor = itemsOrActor as CurriculumActor | undefined;
    }

    this.checkPermission(actor, 'GROUPS_WRITE');

    const catalog = this.catalogRepo.findById(validated.catalogId);
    if (!catalog || catalog.status !== 'DRAFT') {
      throw new CurriculumError(
        'IMMUTABLE_CATALOG',
        'Cannot reorder nodes of a published or archived catalog.'
      );
    }

    const seenIndices = new Set<number>();
    for (const item of validated.items) {
      if (seenIndices.has(item.orderIndex)) {
        throw new CurriculumError(
          'INVALID_INPUT',
          `Duplicate orderIndex '${item.orderIndex}' in reorder batch`
        );
      }
      seenIndices.add(item.orderIndex);
    }

    const allCatalogNodes = this.nodeRepo.findByCatalogId(validated.catalogId);
    const catalogNodeMap = new Map(allCatalogNodes.map((n) => [n.id, n]));

    let commonParentId: string | null | undefined = undefined;
    for (const item of validated.items) {
      const node = catalogNodeMap.get(item.id);
      if (!node) {
        throw new CurriculumError(
          'NODE_NOT_FOUND',
          `One or more nodes do not belong to catalog '${validated.catalogId}'`
        );
      }
      const parentId = node.parentId ?? null;
      if (commonParentId === undefined) {
        commonParentId = parentId;
      } else if (commonParentId !== parentId) {
        throw new CurriculumError(
          'INVALID_INPUT',
          'All nodes in a reorder batch must belong to the same parent node'
        );
      }
    }

    const now = new Date().toISOString();
    this.systemDb.transaction((tx) => {
      const txNodeRepo = new CurriculumNodeRepository(tx);
      const txAuditRepo = new SystemAuditRepository(tx);

      txNodeRepo.reorder(validated.catalogId, validated.items);

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'CURRICULUM_NODES_REORDERED',
        entityType: 'CURRICULUM_CATALOG',
        entityId: validated.catalogId,
        beforeJson: null,
        afterJson: JSON.stringify(validated.items),
        metadataJson: null,
        createdAt: now,
      });
    });
  }

  getTree(catalogId: string, actor?: CurriculumActor): CurriculumTreeNodeDto[] {
    this.checkPermission(actor, 'GROUPS_READ');
    const nodes = this.nodeRepo.findByCatalogId(catalogId);
    return this.buildTree(nodes);
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

    // 4. Exact Scope matching (Finding 4)
    const groupBranch = group.focusMathBranch ?? null;
    const catalogBranch = catalog.mathBranch ?? null;

    if (
      group.educationSystem !== catalog.educationSystem ||
      group.gradeLevel !== catalog.gradeLevel ||
      group.languageTrack !== catalog.languageTrack ||
      groupBranch !== catalogBranch
    ) {
      throw new CurriculumError(
        'SCOPE_MISMATCH',
        `Group scope (${group.educationSystem}/${group.gradeLevel}/${group.languageTrack}/${groupBranch}) does not match catalog scope (${catalog.educationSystem}/${catalog.gradeLevel}/${catalog.languageTrack}/${catalogBranch}) (math branch mismatch)`
      );
    }

    const existing = this.groupCurriculumRepo.getAssignment(validated.groupId);
    const hasDifferentCatalog = existing && existing.catalogId !== validated.catalogId;
    const progressCount = this.groupCurriculumRepo.countByGroup(validated.groupId);

    // Finding 1: Prevent data loss
    if (hasDifferentCatalog && progressCount > 0 && validated.resetProgress !== true) {
      throw new CurriculumError(
        'REASSIGNMENT_REQUIRES_RESET_CONFIRMATION',
        'REASSIGNMENT_REQUIRES_RESET_CONFIRMATION: Group already has recorded curriculum progress. Reassigning catalog requires explicit resetProgress: true to confirm progress reset.'
      );
    }

    const now = new Date().toISOString();
    return this.academicDb.transaction((tx) => {
      const txGroupCurriculumRepo = new GroupCurriculumRepository(tx);
      const txAuditRepo = new AcademicAuditRepository(tx);

      if (hasDifferentCatalog && validated.resetProgress === true) {
        txGroupCurriculumRepo.resetProgressForGroup(validated.groupId);
      }

      const row = txGroupCurriculumRepo.assignCatalog({
        id: existing ? existing.id : crypto.randomUUID(),
        groupId: validated.groupId,
        catalogId: validated.catalogId,
        catalogVersion: catalog.version,
        assignedAt: now,
        assignedByUserId: actor?.userId ?? null,
        assignedByNameSnapshot: this.getActorSnapshot(actor),
        notes: validated.notes ?? null,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      });

      const auditAction = hasDifferentCatalog && validated.resetProgress === true
        ? 'GROUP_CURRICULUM_REASSIGNED_WITH_RESET'
        : 'GROUP_CURRICULUM_ASSIGNED';

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: auditAction,
        entityType: 'GROUP_CURRICULUM_ASSIGNMENT',
        entityId: row.id,
        beforeJson: existing ? JSON.stringify(existing) : null,
        afterJson: JSON.stringify(row),
        metadataJson: JSON.stringify({ resetPreviousProgress: hasDifferentCatalog && validated.resetProgress === true }),
        createdAt: now,
      });

      return this.mapAssignmentRow(row);
    });
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

    const node = this.nodeRepo.findById(validated.nodeId);
    if (!node || node.catalogId !== assignment.catalogId) {
      throw new CurriculumError(
        'NODE_NOT_FOUND',
        `Curriculum node '${validated.nodeId}' does not belong to group's assigned catalog`
      );
    }

    if (node.tier !== 'SKILL') {
      throw new CurriculumError(
        'INVALID_NODE_TIER',
        `Progress tracking is only supported for SKILL tier nodes (node '${node.id}' is '${node.tier}')`
      );
    }

    const now = new Date().toISOString();
    const existing = this.groupCurriculumRepo.getNodeProgress(validated.groupId, validated.nodeId);

    return this.academicDb.transaction((tx) => {
      const txGroupCurriculumRepo = new GroupCurriculumRepository(tx);
      const txAuditRepo = new AcademicAuditRepository(tx);

      const row = txGroupCurriculumRepo.upsertProgress({
        id: existing ? existing.id : crypto.randomUUID(),
        groupId: validated.groupId,
        catalogId: assignment.catalogId,
        nodeId: validated.nodeId,
        status: validated.status,
        completedAt: validated.status === 'COMPLETED' ? now : null,
        updatedByUserId: actor?.userId ?? null,
        updatedByNameSnapshot: this.getActorSnapshot(actor),
        notes: validated.notes ?? existing?.notes ?? null,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      });

      txAuditRepo.insert({
        id: crypto.randomUUID(),
        actorType: actor?.userId ? 'USER' : 'SYSTEM',
        actorUserId: actor?.userId ?? null,
        actorNameSnapshot: this.getActorSnapshot(actor),
        action: 'GROUP_CURRICULUM_PROGRESS_UPDATED',
        entityType: 'GROUP_CURRICULUM_PROGRESS',
        entityId: row.id,
        beforeJson: existing ? JSON.stringify(existing) : null,
        afterJson: JSON.stringify(row),
        metadataJson: null,
        createdAt: now,
      });

      return this.mapProgressRow(row);
    });
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
    if (!catalogRow || catalogRow.status !== 'PUBLISHED') {
      throw new CurriculumError(
        'CATALOG_INTEGRITY_ERROR',
        `CATALOG_INTEGRITY_ERROR: Assigned catalog '${assignment.catalogId}' is missing or not in PUBLISHED status`
      );
    }
    const catalog = this.mapCatalogRow(catalogRow);

    const allNodes = this.nodeRepo.findByCatalogId(assignment.catalogId);
    const skills = allNodes.filter((n) => n.tier === 'SKILL');
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
        projectedCompletionDate = targetDate.toISOString().split('T')[0] ?? null;

        projectionStatus = 'ON_TRACK';
        messageAr = `يسير المنهج بمعدل ${skillsPerWeekRate} مهارة/أسبوع، ومتوقع الانتهاء في ${projectedCompletionDate}`;
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

  getGroupProgressMap(
    groupId: string,
    actor?: CurriculumActor
  ): Record<string, CurriculumProgressStatus> {
    this.checkPermission(actor, 'GROUPS_READ');
    const rows = this.groupCurriculumRepo.getProgressByGroup(groupId);
    const map: Record<string, CurriculumProgressStatus> = {};
    for (const r of rows) {
      map[r.nodeId] = r.status as CurriculumProgressStatus;
    }
    return map;
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private validateParent(tier: CurriculumNodeTier, parent: CurriculumNodeRow | null): void {
    if (tier === 'UNIT') {
      if (parent !== null) {
        throw new CurriculumError(
          'INVALID_PARENT_TIER',
          'UNIT tier nodes cannot have a parent (they must be root)'
        );
      }
      return;
    }

    if (!parent) {
      throw new CurriculumError(
        'PARENT_NODE_NOT_FOUND',
        `Nodes of tier '${tier}' must specify a parent node`
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

    if (tier === 'SKILL' && parent.tier !== 'CONCEPT') {
      throw new CurriculumError(
        'INVALID_PARENT_TIER',
        `SKILL parent must be a CONCEPT (received '${parent.tier}')`
      );
    }
  }

  private validateCatalogTreeCompleteness(_catalogId: string, nodes: CurriculumNodeRow[]): void {
    if (nodes.length === 0) {
      throw new CurriculumError(
        'EMPTY_CATALOG',
        'Cannot publish an empty catalog without any curriculum nodes'
      );
    }

    const nodeMap = new Map<string, CurriculumNodeRow>();
    const childrenMap = new Map<string, CurriculumNodeRow[]>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
      const pid = node.parentId ?? '__ROOT__';
      if (!childrenMap.has(pid)) {
        childrenMap.set(pid, []);
      }
      childrenMap.get(pid)!.push(node);
    }

    for (const node of nodes) {
      const visited = new Set<string>();
      let curr: CurriculumNodeRow | undefined = node;
      while (curr?.parentId) {
        if (visited.has(curr.id)) {
          throw new CurriculumError('INCOMPLETE_CATALOG', `Cyclic hierarchy detected at node '${curr.id}'`);
        }
        visited.add(curr.id);
        curr = nodeMap.get(curr.parentId);
      }
    }

    const rootNodes = childrenMap.get('__ROOT__') ?? [];
    const units = rootNodes.filter((n) => n.tier === 'UNIT');
    if (units.length === 0) {
      throw new CurriculumError(
        'INCOMPLETE_CATALOG',
        'Catalog must contain at least one root UNIT module before publishing'
      );
    }

    for (const unit of units) {
      const lessons = (childrenMap.get(unit.id) ?? []).filter((n) => n.tier === 'LESSON');
      if (lessons.length === 0) {
        throw new CurriculumError(
          'INCOMPLETE_CATALOG',
          `Unit '${unit.titleAr}' (${unit.code}) has no LESSON modules`
        );
      }

      for (const lesson of lessons) {
        const concepts = (childrenMap.get(lesson.id) ?? []).filter((n) => n.tier === 'CONCEPT');
        if (concepts.length === 0) {
          throw new CurriculumError(
            'INCOMPLETE_CATALOG',
            `Lesson '${lesson.titleAr}' (${lesson.code}) has no CONCEPT items`
          );
        }

        for (const concept of concepts) {
          const skills = (childrenMap.get(concept.id) ?? []).filter((n) => n.tier === 'SKILL');
          if (skills.length === 0) {
            throw new CurriculumError(
              'INCOMPLETE_CATALOG',
              `Concept '${concept.titleAr}' (${concept.code}) has no measurable SKILL items`
            );
          }
        }
      }
    }
  }

  private collectDescendantIds(targetId: string, allCatalogNodes: CurriculumNodeRow[]): string[] {
    const childrenMap = new Map<string, string[]>();
    for (const n of allCatalogNodes) {
      if (n.parentId) {
        const list = childrenMap.get(n.parentId) ?? [];
        list.push(n.id);
        childrenMap.set(n.parentId, list);
      }
    }

    const result: string[] = [];
    const queue = [targetId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = childrenMap.get(curr) ?? [];
      for (const childId of children) {
        result.push(childId);
        queue.push(childId);
      }
    }
    return result;
  }

  private buildTree(nodes: CurriculumNodeRow[]): CurriculumTreeNodeDto[] {
    const map = new Map<string, CurriculumTreeNodeDto>();
    const roots: CurriculumTreeNodeDto[] = [];

    const sorted = [...nodes].sort((a, b) => a.orderIndex - b.orderIndex);

    for (const row of sorted) {
      map.set(row.id, {
        ...this.mapNodeRow(row),
        children: [],
      });
    }

    for (const row of sorted) {
      const dto = map.get(row.id)!;
      if (!row.parentId) {
        roots.push(dto);
      } else {
        const parent = map.get(row.parentId);
        if (parent) {
          parent.children.push(dto);
        } else {
          roots.push(dto);
        }
      }
    }

    return roots;
  }

  private mapCatalogRow(r: CurriculumCatalogRow): CurriculumCatalogDto {
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      description: r.description,
      educationSystem: r.educationSystem,
      gradeLevel: r.gradeLevel,
      languageTrack: r.languageTrack,
      mathBranch: r.mathBranch,
      version: r.version,
      status: r.status,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapNodeRow(r: CurriculumNodeRow): CurriculumNodeDto {
    return {
      id: r.id,
      catalogId: r.catalogId,
      parentId: r.parentId,
      tier: r.tier,
      titleAr: r.titleAr,
      titleEn: r.titleEn ?? null,
      code: r.code,
      description: r.description,
      metadataJson: r.metadataJson ?? null,
      orderIndex: r.orderIndex,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapAssignmentRow(r: GroupCurriculumAssignmentRow): GroupCurriculumAssignmentDto {
    return {
      id: r.id,
      groupId: r.groupId,
      catalogId: r.catalogId,
      catalogVersion: r.catalogVersion,
      assignedAt: r.assignedAt,
      assignedByUserId: r.assignedByUserId,
      assignedByNameSnapshot: r.assignedByNameSnapshot,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapProgressRow(r: GroupCurriculumProgressRow): GroupNodeProgressDto {
    return {
      id: r.id,
      groupId: r.groupId,
      catalogId: r.catalogId,
      nodeId: r.nodeId,
      status: r.status,
      completedAt: r.completedAt,
      updatedByUserId: r.updatedByUserId,
      updatedByNameSnapshot: r.updatedByNameSnapshot,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
