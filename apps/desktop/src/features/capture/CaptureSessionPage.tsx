import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  FileImage,
  User,
  ChevronLeft,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
} from '@tibyan/design-system';
import {
  useCaptureSessions,
  useCreateCaptureSession,
  useDeleteCaptureSession,
  useCaptureSubmissions,
} from '../../hooks/useCapture.js';
import { useExams } from '../../hooks/useExams.js';

const STATUS_LABELS: Record<string, string> = {
  COLLECTING: 'جمع الأوراق',
  EXTRACTING: 'استخراج الإجابات',
  READY_FOR_GRADING: 'جاهز للتصحيح',
  GRADING: 'قيد التصحيح',
  FINALIZED: 'مكتمل',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'accent' | 'neutral'> = {
  COLLECTING: 'warning',
  EXTRACTING: 'accent',
  READY_FOR_GRADING: 'neutral',
  GRADING: 'warning',
  FINALIZED: 'success',
};

const SUB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'بانتظار التصحيح',
  EXTRACTING: 'استخراج',
  EXTRACTED: 'تم الاستخراج',
  GRADING: 'تصحيح',
  GRADED: 'تم التصحيح',
  REVIEWED: 'تمت المراجعة',
  FINALIZED: 'نهائي',
  FAILED: 'فشل',
};

export function CaptureSessionPage() {
  const navigate = useNavigate();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useCaptureSessions();
  const { data: exams = [] } = useExams();
  const createSession = useCreateCaptureSession();
  const deleteSession = useDeleteCaptureSession();

  const { data: submissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useCaptureSubmissions(selectedSessionId || '');

  const [newSessionExamId, setNewSessionExamId] = useState('');
  const [newSessionForm, setNewSessionForm] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleCreateSession = async () => {
    if (!newSessionExamId) return;
    try {
      const result = await createSession.mutateAsync({ examId: newSessionExamId, examFormLabel: newSessionForm });
      setSelectedSessionId(result.id);
      setShowCreateForm(false);
      setNewSessionExamId('');
      setNewSessionForm('A');
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession.mutateAsync(sessionId);
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-4" data-testid="page-capture-session">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">تصحيح ورصد الأوراق</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            إدارة جلسات التصوير واستيراد أوراق الاختبارات المسجلة
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateForm(true)}
          data-testid="create-session-btn"
        >
          <Plus size={16} className="me-1.5" />
          جلسة تصوير جديدة
        </Button>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <Card variant="default" className="p-4 space-y-3" data-testid="create-session-form">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">إنشاء جلسة تصوير جديدة</h3>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">الاختبار</label>
              <Select
                options={[
                  { value: '', label: 'اختر اختبار...' },
                  ...exams.map(e => ({ value: e.id, label: e.title })),
                ]}
                value={newSessionExamId}
                onChange={(e) => setNewSessionExamId(e.target.value)}
                data-testid="select-exam-for-session"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">الاستمارة</label>
              <Select
                options={[
                  { value: 'A', label: 'استمارة أ' },
                  { value: 'B', label: 'استمارة ب' },
                  { value: 'C', label: 'استمارة ج' },
                  { value: 'D', label: 'استمارة د' },
                ]}
                value={newSessionForm}
                onChange={(e) => setNewSessionForm(e.target.value as 'A' | 'B' | 'C' | 'D')}
                data-testid="select-form-for-session"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSession}
              disabled={!newSessionExamId || createSession.isPending}
              data-testid="confirm-create-session"
            >
              {createSession.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowCreateForm(false); setNewSessionExamId(''); }}
            >
              إلغاء
            </Button>
          </div>
        </Card>
      )}

      {/* Error State */}
      {sessionsError && (
        <Card variant="subtle" className="p-6 text-center space-y-3" data-testid="capture-error-state">
          <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تعذر تحميل جلسات التصوير</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{(sessionsError as Error)?.message}</p>
          <Button variant="secondary" size="sm" onClick={() => refetchSessions()} data-testid="retry-capture-btn">
            <RefreshCw size={14} className="me-1" />
            إعادة المحاولة
          </Button>
        </Card>
      )}

      {/* Loading */}
      {sessionsLoading && (
        <Card variant="default" className="p-12 text-center text-xs text-[var(--color-text-muted)]" data-testid="capture-loading">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
            <span>جاري تحميل جلسات التصوير...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!sessionsLoading && !sessionsError && sessions.length === 0 && (
        <Card variant="default" className="p-12 text-center space-y-3" data-testid="capture-empty-state">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] flex items-center justify-center mx-auto">
            <Camera size={24} />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">لا توجد جلسات تصوير</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            أنشئ جلسة تصوير لبدء استيراد أوراق الاختبارات المسجلة وتصحيحها.
          </p>
        </Card>
      )}

      {/* Sessions List + Detail */}
      {!sessionsLoading && sessions.length > 0 && (
        <div className="flex gap-4 min-h-[500px]">
          {/* Sessions Sidebar */}
          <div className="w-72 shrink-0 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] px-1">جلسات التصوير</h3>
            {sessions.map((session) => (
              <Card
                key={session.id}
                variant={selectedSessionId === session.id ? 'default' : 'default'}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedSessionId === session.id
                    ? 'border-2 border-[var(--color-brand-primary)]'
                    : 'hover:bg-[var(--color-bg-surface-subtle)]'
                }`}
                onClick={() => setSelectedSessionId(session.id)}
                data-testid={`session-card-${session.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                      {session.examTitle}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      استمارة {session.examFormLabel} — {new Date(session.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[session.status] || 'neutral'} size="sm">
                    {STATUS_LABELS[session.status] || session.status}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                  {session.totalSubmissions}递交ات ({session.completedSubmissions} مكتملة)
                </p>
              </Card>
            ))}
          </div>

          {/* Session Detail Panel */}
          <div className="flex-1 min-w-0">
            {!selectedSession && (
              <Card variant="default" className="p-12 text-center text-[var(--color-text-muted)]" data-testid="select-session-hint">
                <p className="text-sm">اختر جلسة من القائمة لعرض تفاصيلها</p>
              </Card>
            )}

            {selectedSession && (
              <div className="space-y-4">
                {/* Session Header */}
                <Card variant="default" className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {selectedSession.examTitle}
                      </h2>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        استمارة {selectedSession.examFormLabel} — الحالة:{' '}
                        <Badge variant={STATUS_VARIANTS[selectedSession.status] || 'neutral'} size="sm">
                          {STATUS_LABELS[selectedSession.status] || selectedSession.status}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => refetchSubmissions()}
                        data-testid="refresh-submissions-btn"
                      >
                        <RefreshCw size={14} className="me-1" />
                        تحديث
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/capture/${selectedSession.id}/import`)}
                        data-testid="import-files-btn"
                      >
                        <Upload size={14} className="me-1" />
                        استيراد ملفات
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--color-status-danger)] hover:text-[var(--color-status-danger)]"
                        onClick={() => handleDeleteSession(selectedSession.id)}
                        data-testid="delete-session-btn"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Submissions Table */}
                {submissionsLoading ? (
                  <Card variant="default" className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
                      <span>جاري تحميل递交ات...</span>
                    </div>
                  </Card>
                ) : submissions.length === 0 ? (
                  <Card variant="default" className="p-8 text-center space-y-2" data-testid="no-submissions">
                    <FileImage size={20} className="mx-auto text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-secondary)]">لا توجد递交ات في هذه الجلسة</p>
                    <p className="text-xs text-[var(--color-text-muted)]">استورد ملفات لبدء التصحيح</p>
                  </Card>
                ) : (
                  <Card variant="default" className="overflow-hidden" data-testid="submissions-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>الطالب</TableHead>
                          <TableHead>الكود</TableHead>
                          <TableHead>الصفحات</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="w-24 text-center">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((sub, idx) => (
                          <TableRow
                            key={sub.id}
                            className="cursor-pointer hover:bg-[var(--color-bg-surface-subtle)]"
                            onClick={() => navigate(`/grading/${sub.id}`)}
                            data-testid={`submission-row-${sub.id}`}
                          >
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              {sub.studentName ? (
                                <div className="flex items-center gap-2">
                                  <User size={14} className="text-[var(--color-text-muted)]" />
                                  <span className="text-sm font-semibold">{sub.studentName}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--color-text-muted)] italic">غير مرتبط</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-[var(--color-text-secondary)]" dir="ltr">
                                {sub.studentCode || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">{sub.pageCount} صفحات</TableCell>
                            <TableCell>
                              <Badge
                                variant={sub.status === 'GRADED' || sub.status === 'FINALIZED' ? 'success' : sub.status === 'PENDING' ? 'warning' : 'neutral'}
                                size="sm"
                              >
                                {SUB_STATUS_LABELS[sub.status] || sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); navigate(`/grading/${sub.id}`); }}
                                className="p-1.5"
                                aria-label="تصحيح التسليم"
                                data-testid={`grade-submission-btn-${sub.id}`}
                              >
                                <ChevronLeft size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                )}

                {/* Unassigned Warning */}
                {submissions.some(s => s.associationMethod === 'UNASSOCIATED') && (
                  <Card variant="subtle" className="p-3 flex items-center gap-2 text-xs text-[var(--color-status-warning)]" data-testid="unassigned-warning">
                    <AlertTriangle size={14} />
                    <span>هناك递交ات لم يتم ربطها بطلاب بعد. اربطها لبدء التصحيح.</span>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
