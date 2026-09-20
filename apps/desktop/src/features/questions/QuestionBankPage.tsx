import { useState, useMemo } from 'react';
import { Card, Button, Input, Select } from '@tibyan/design-system';
import { QuestionCard } from './QuestionCard.js';
import { QuestionEditorModal } from './QuestionEditorModal.js';
import { BulkQuestionIngestionModal } from './BulkQuestionIngestionModal.js';
import {
  useQuestions,
  useDeleteQuestion,
} from '../../hooks/useQuestionBank.js';
import { useCurriculumCatalogs } from '../../hooks/useCurriculum.js';
import type {
  QuestionDto,
  QuestionFilterDto,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from '@tibyan/contracts';
import {
  HelpCircle,
  Plus,
  Upload,
  Search,
} from 'lucide-react';

export function QuestionBankPage() {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<QuestionDto | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Queries
  const filter: QuestionFilterDto = useMemo(() => {
    return {
      catalogId: selectedCatalogId || undefined,
      questionType: (selectedType || undefined) as QuestionType | undefined,
      difficulty: (selectedDifficulty || undefined) as QuestionDifficulty | undefined,
      status: (selectedStatus || undefined) as QuestionStatus | undefined,
    };
  }, [selectedCatalogId, selectedType, selectedDifficulty, selectedStatus]);

  const { data: questions, isLoading } = useQuestions(filter);
  const { data: catalogs } = useCurriculumCatalogs();
  const deleteMutation = useDeleteQuestion();

  // Local client-side search across question code and text
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    if (!searchTerm.trim()) return questions;

    const term = searchTerm.toLowerCase();
    return questions.filter((q) => {
      if (q.code.toLowerCase().includes(term)) return true;
      const textBlocks = q.body.blocks.filter((b) => b.type === 'text');
      if (textBlocks.some((b) => (b as { content: string }).content.toLowerCase().includes(term))) return true;
      return false;
    });
  }, [questions, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المسألة نهائياً؟')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'فشل حذف المسألة');
    }
  };

  const handleEdit = (question: QuestionDto) => {
    setQuestionToEdit(question);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl" data-testid="question-bank-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[var(--color-brand-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">بنك الأسئلة والمسائل الرياضية</h1>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            مستودع الأسئلة والمسائل الرياضية، مصنفة بالمهارات المنهجية ومربوطة بمصادر ومراجع الكتب الرقمية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setIsBulkModalOpen(true)}
            data-testid="open-bulk-ingestion-modal-btn"
          >
            <Upload className="w-4 h-4 me-1.5" />
            استيراد دفعة ومراجعة التكرار
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setQuestionToEdit(null);
              setIsEditorOpen(true);
            }}
            data-testid="create-new-question-btn"
          >
            <Plus className="w-4 h-4 me-1.5" />
            مسألة جديدة
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search box */}
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث بالرمز (Q-000001)، أو نص المسألة..."
                className="ps-9 text-xs"
                data-testid="question-search-input"
              />
            </div>
          </div>

          {/* Curriculum Filter */}
          <div className="w-56">
            <Select
              value={selectedCatalogId}
              onChange={(e) => setSelectedCatalogId(e.target.value)}
              options={[
                { value: '', label: 'جميع المناهج والمراحل' },
                ...(catalogs || []).map((c) => ({ value: c.id, label: `${c.title} (${c.gradeLevel})` })),
              ]}
              data-testid="filter-curriculum-select"
            />
          </div>

          {/* Type Filter */}
          <div className="w-40">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={[
                { value: '', label: 'كافة أنواع الأسئلة' },
                { value: 'MULTIPLE_CHOICE', label: 'اختيار من متعدد' },
                { value: 'SHORT_ANSWER', label: 'إجابة قصيرة' },
                { value: 'ESSAY', label: 'حل تفصيلي' },
                { value: 'TRUE_FALSE', label: 'صواب / خطأ' },
              ]}
              data-testid="filter-type-select"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="w-36">
            <Select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              options={[
                { value: '', label: 'كافة المستويات' },
                { value: 'EASY', label: 'سهل' },
                { value: 'MEDIUM', label: 'متوسط' },
                { value: 'HARD', label: 'صعب' },
                { value: 'CHALLENGE', label: 'تحدي' },
              ]}
              data-testid="filter-difficulty-select"
            />
          </div>

          {/* Status Filter */}
          <div className="w-32">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: '', label: 'كافة الحالات' },
                { value: 'ACTIVE', label: 'نشطة فقط' },
                { value: 'DRAFT', label: 'مسودات' },
                { value: 'ARCHIVED', label: 'مؤرشفة' },
              ]}
              data-testid="filter-status-select"
            />
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1">
          <span>
            النتائج المعروضة:{' '}
            <strong className="text-[var(--color-text-primary)]">{filteredQuestions.length}</strong> مسألة
          </span>
          {(searchTerm || selectedCatalogId || selectedType || selectedDifficulty || selectedStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCatalogId('');
                setSelectedType('');
                setSelectedDifficulty('');
                setSelectedStatus('');
              }}
              className="text-[var(--color-brand-primary)] hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Questions Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--color-text-secondary)]">جاري تحميل المسائل...</div>
      ) : filteredQuestions.length === 0 ? (
        <Card className="p-12 text-center space-y-3 bg-[var(--color-bg-surface)] border-dashed">
          <HelpCircle className="w-12 h-12 text-[var(--color-text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">لا توجد مسائل مطابقة</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
            لم يتم العثور على أية مسائل مطابقة للبحث المحدد. يمكنك إضافة مسائل جديدة أو استيراد دفعة من المسائل.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setQuestionToEdit(null);
                setIsEditorOpen(true);
              }}
            >
              <Plus className="w-4 h-4 me-1" />
              إضافة مسألة جديدة
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsBulkModalOpen(true)}>
              <Upload className="w-4 h-4 me-1" />
              استيراد دفعة
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setQuestionToEdit(null);
        }}
        questionToEdit={questionToEdit}
      />

      <BulkQuestionIngestionModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />
    </div>
  );
}
