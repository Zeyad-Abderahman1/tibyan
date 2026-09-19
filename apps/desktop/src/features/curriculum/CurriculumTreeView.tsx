import { useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
} from '@tibyan/design-system';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Layers,
  FileText,
  Lightbulb,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type {
  CurriculumTreeNodeDto,
  CurriculumNodeTier,
  CurriculumCatalogDto,
} from '@tibyan/contracts';
import {
  useCurriculumTree,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
} from '../../hooks/useCurriculum.js';

interface CurriculumTreeViewProps {
  catalog: CurriculumCatalogDto;
  canWrite: boolean;
}

const TIER_META: Record<
  CurriculumNodeTier,
  { label: string; nextTier: CurriculumNodeTier | null; icon: any; colorClass: string; badgeVariant: any }
> = {
  UNIT: {
    label: 'وحدة',
    nextTier: 'LESSON',
    icon: Layers,
    colorClass: 'text-[var(--color-brand-primary)] dark:text-[#5CE1E6]',
    badgeVariant: 'primary',
  },
  LESSON: {
    label: 'درس',
    nextTier: 'CONCEPT',
    icon: FileText,
    colorClass: 'text-purple-600 dark:text-purple-400',
    badgeVariant: 'accent',
  },
  CONCEPT: {
    label: 'مفهوم',
    nextTier: 'SKILL',
    icon: Lightbulb,
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeVariant: 'warning',
  },
  SKILL: {
    label: 'مهارة',
    nextTier: null,
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeVariant: 'success',
  },
};

export function CurriculumTreeView({ catalog, canWrite }: CurriculumTreeViewProps) {
  const isDraft = catalog.status === 'DRAFT';
  const allowEditing = canWrite && isDraft;

  const { data: tree = [], isLoading } = useCurriculumTree(catalog.id);

  const createNodeMutation = useCreateNode();
  const updateNodeMutation = useUpdateNode();
  const deleteNodeMutation = useDeleteNode();

  // Collapsed state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [addNodeModal, setAddNodeModal] = useState<{
    isOpen: boolean;
    tier: CurriculumNodeTier;
    parentId: string | null;
    parentTitle?: string;
  }>({
    isOpen: false,
    tier: 'UNIT',
    parentId: null,
  });

  const [editNodeModal, setEditNodeModal] = useState<{
    isOpen: boolean;
    nodeId: string;
    title: string;
  }>({
    isOpen: false,
    nodeId: '',
    title: '',
  });

  const [nodeTitleInput, setNodeTitleInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenAdd = (tier: CurriculumNodeTier, parentId: string | null, parentTitle?: string) => {
    setNodeTitleInput('');
    setErrorMsg(null);
    setAddNodeModal({
      isOpen: true,
      tier,
      parentId,
      parentTitle,
    });
  };

  const handleOpenEdit = (nodeId: string, currentTitle: string) => {
    setNodeTitleInput(currentTitle);
    setErrorMsg(null);
    setEditNodeModal({
      isOpen: true,
      nodeId,
      title: currentTitle,
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = nodeTitleInput.trim();
    if (!title) {
      setErrorMsg('عنوان العنصر مطلوب');
      return;
    }

    try {
      const code = `${addNodeModal.tier.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      await createNodeMutation.mutateAsync({
        catalogId: catalog.id,
        parentId: addNodeModal.parentId,
        tier: addNodeModal.tier,
        code,
        titleAr: title,
      });
      setAddNodeModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة العنصر');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = nodeTitleInput.trim();
    if (!title) {
      setErrorMsg('عنوان العنصر مطلوب');
      return;
    }

    try {
      await updateNodeMutation.mutateAsync({
        id: editNodeModal.nodeId,
        catalogId: catalog.id,
        input: { titleAr: title },
      });
      setEditNodeModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث العنصر');
    }
  };

  const handleDelete = async (nodeId: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${title}" وجميع العناصر التابعة له؟`)) {
      return;
    }
    try {
      await deleteNodeMutation.mutateAsync({ id: nodeId, catalogId: catalog.id });
    } catch (err: any) {
      alert(err.message || 'فشل حذف العنصر');
    }
  };

  const renderNode = (node: CurriculumTreeNodeDto, depth = 0) => {
    const meta = TIER_META[node.tier];
    const Icon = meta.icon;
    const isCollapsed = collapsedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="space-y-1" data-testid={`node-${node.tier.toLowerCase()}-${node.id}`}>
        <div
          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
            depth === 0
              ? 'bg-[var(--color-bg-surface-elevated)] border-[var(--color-border-subtle)] font-bold'
              : depth === 1
              ? 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)]/70 mr-4 font-semibold'
              : depth === 2
              ? 'bg-[var(--color-bg-surface-subtle)] border-[var(--color-border-subtle)]/50 mr-8 font-medium'
              : 'bg-[var(--color-bg-app)] border-dashed border-[var(--color-border-subtle)] mr-12 text-xs font-normal'
          }`}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[var(--color-text-secondary)]"
                title={isCollapsed ? 'توسيع' : 'طي'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <Badge variant={meta.badgeVariant} size="sm">
              {meta.label}
            </Badge>

            <Icon className={`w-4 h-4 ${meta.colorClass}`} />

            <span className="text-sm text-[var(--color-text-primary)]">{node.titleAr}</span>

            {node.tier !== 'SKILL' && (
              <span className="text-[11px] text-[var(--color-text-muted)]">
                ({node.children.length})
              </span>
            )}
          </div>

          {allowEditing && (
            <div className="flex items-center gap-1">
              {meta.nextTier && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenAdd(meta.nextTier!, node.id, node.titleAr)}
                  className="gap-1 text-[11px] text-[var(--color-brand-primary)]"
                  title={`إضافة ${TIER_META[meta.nextTier].label}`}
                  data-testid={`btn-add-child-${node.id}`}
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة {TIER_META[meta.nextTier].label}</span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(node.id, node.titleAr)}
                className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title="تعديل العنوان"
                data-testid={`btn-edit-node-${node.id}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(node.id, node.titleAr)}
                className="p-1 text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-bg)]"
                title="حذف"
                data-testid={`btn-delete-node-${node.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {!isCollapsed && hasChildren && (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="curriculum-tree-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--color-brand-primary)]" />
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            هيكل المنهج الهرمي (وحدات • دروس • مفاهيم • مهارات)
          </h2>
        </div>

        {!isDraft && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
            <Lock className="w-3.5 h-3.5" />
            <span>المنهج منشور ومحمي من التعديل (أنشئ مسودة جديدة لإجراء تعديلات)</span>
          </div>
        )}

        {allowEditing && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdd('UNIT', null)}
            className="gap-1.5 text-xs font-semibold"
            data-testid="btn-add-unit"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وحدة دراسية</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card variant="default" className="p-8 text-center text-xs text-[var(--color-text-muted)]">
          جاري تحميل شجرة المنهج...
        </Card>
      ) : tree.length === 0 ? (
        <Card variant="default" className="p-8 text-center space-y-2" data-testid="empty-tree-state">
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
            لا توجد وحدات أو دروس مسجلة في هذا المنهج بعد.
          </p>
          {allowEditing && (
            <p className="text-xs text-[var(--color-text-muted)]">
              ابدأ بإضافة "الوحدة الأولى" ثم تفرع منها إلى الدروس والمفاهيم والمهارات.
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">{tree.map((rootNode) => renderNode(rootNode, 0))}</div>
      )}

      {/* Add Node Modal */}
      {addNodeModal.isOpen && (
        <Modal
          isOpen={addNodeModal.isOpen}
          onClose={() => setAddNodeModal((prev) => ({ ...prev, isOpen: false }))}
          title={`إضافة ${TIER_META[addNodeModal.tier].label} جديدة`}
          description={
            addNodeModal.parentTitle
              ? `إضافة تابعة لـ: ${addNodeModal.parentTitle}`
              : 'إضافة وحدة رئيسية في المنهج'
          }
          size="sm"
        >
          <form onSubmit={handleSaveAdd} className="space-y-4 p-5" data-testid="form-add-node">
            {errorMsg && (
              <div className="p-2.5 text-xs rounded bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)]">
                {errorMsg}
              </div>
            )}
            <Input
              label={`عنوان ${TIER_META[addNodeModal.tier].label}`}
              placeholder={`مثال: ${
                addNodeModal.tier === 'UNIT'
                  ? 'الوحدة الأولى: المصفوفات'
                  : addNodeModal.tier === 'LESSON'
                  ? 'الدرس الأول: تنظيم البيانات في مصفوفات'
                  : addNodeModal.tier === 'CONCEPT'
                  ? 'رتبة المصفوفة وتساوي مصفوفتين'
                  : 'حل مسائل إيجاد رتبة المصفوفة'
              }`}
              value={nodeTitleInput}
              onChange={(e) => setNodeTitleInput(e.target.value)}
              required
              autoFocus
              data-testid="input-node-title"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setAddNodeModal((prev) => ({ ...prev, isOpen: false }))}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={createNodeMutation.isPending}
                data-testid="btn-submit-add-node"
              >
                حفظ
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Node Modal */}
      {editNodeModal.isOpen && (
        <Modal
          isOpen={editNodeModal.isOpen}
          onClose={() => setEditNodeModal((prev) => ({ ...prev, isOpen: false }))}
          title="تعديل عنوان العنصر"
          size="sm"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 p-5" data-testid="form-edit-node">
            {errorMsg && (
              <div className="p-2.5 text-xs rounded bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)]">
                {errorMsg}
              </div>
            )}
            <Input
              label="العنوان"
              value={nodeTitleInput}
              onChange={(e) => setNodeTitleInput(e.target.value)}
              required
              autoFocus
              data-testid="input-edit-node-title"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditNodeModal((prev) => ({ ...prev, isOpen: false }))}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={updateNodeMutation.isPending}
                data-testid="btn-submit-edit-node"
              >
                حفظ التعديل
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
