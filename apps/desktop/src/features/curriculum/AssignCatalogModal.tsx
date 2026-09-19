import { useState, useMemo } from 'react';
import { Modal, Select, Button, Badge } from '@tibyan/design-system';
import type { GroupDto } from '@tibyan/contracts';
import {
  useCurriculumCatalogs,
  useAssignGroupCatalog,
} from '../../hooks/useCurriculum.js';

interface AssignCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupDto;
  currentCatalogId?: string | null;
}

export function AssignCatalogModal({
  isOpen,
  onClose,
  group,
  currentCatalogId,
}: AssignCatalogModalProps) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(currentCatalogId || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch only PUBLISHED catalogs matching the group's dimensions
  const { data: catalogs = [], isLoading } = useCurriculumCatalogs({
    educationSystem: group.educationSystem,
    gradeLevel: group.gradeLevel,
    languageTrack: group.languageTrack,
    mathBranch: group.focusMathBranch || undefined,
    status: 'PUBLISHED',
  });

  const assignMutation = useAssignGroupCatalog(group.id);

  const catalogOptions = useMemo(() => {
    return catalogs.map((c) => ({
      value: c.id,
      label: `${c.title} (إصدار ${c.version} - ${c.code})`,
    }));
  }, [catalogs]);

  const handleAssign = async () => {
    if (!selectedCatalogId) {
      setErrorMsg('يرجى اختيار المنهج المراد ربطه');
      return;
    }
    setErrorMsg(null);

    try {
      await assignMutation.mutateAsync({
        groupId: group.id,
        catalogId: selectedCatalogId,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل ربط المنهج بالمجموعة');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ربط منهج دراسي بالمجموعة"
      description={`اختيار منهج معتمد متوافق مع المرحلة (${group.gradeLevel}) والمسار (${group.languageTrack === 'ARABIC' ? 'عربي' : 'لغات'}).`}
      size="md"
    >
      <div className="space-y-4 p-5" data-testid="modal-assign-catalog">
        {errorMsg && (
          <div className="p-2.5 text-xs rounded bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)]">
            {errorMsg}
          </div>
        )}

        <div className="p-3 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] space-y-2 text-xs">
          <div className="font-semibold text-[var(--color-text-primary)]">أبعاد المجموعة:</div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{group.educationSystem === 'GENERAL' ? 'التعليم العام' : 'البكالوريا'}</Badge>
            <Badge variant="neutral">{group.gradeLevel}</Badge>
            <Badge variant="neutral">{group.languageTrack === 'ARABIC' ? 'عربي' : 'لغات'}</Badge>
            {group.focusMathBranch && <Badge variant="primary">{group.focusMathBranch}</Badge>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
            المنهج المعتمد المتاح
          </label>
          {isLoading ? (
            <p className="text-xs text-[var(--color-text-muted)]">جاري البحث عن المناهج المنشورة المتوافقة...</p>
          ) : catalogOptions.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed border-[var(--color-border-subtle)] space-y-1">
              <p className="text-xs font-semibold text-[var(--color-status-warning)]">
                لا توجد فهارس مناهج منشورة ومعتمدة متطابقة مع أبعاد هذه المجموعة.
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                يمكنك الانتقال لصفحة "إدارة المناهج" وإنشاء المنهج واعتماده (نشر) أولاً.
              </p>
            </div>
          ) : (
            <Select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              options={[{ value: '', label: '-- اختر منهجا --' }, ...catalogOptions]}
              data-testid="select-assign-catalog"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            disabled={!selectedCatalogId || catalogOptions.length === 0}
            loading={assignMutation.isPending}
            data-testid="btn-confirm-assign-catalog"
          >
            تأكيد ربط المنهج
          </Button>
        </div>
      </div>
    </Modal>
  );
}
