import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  AlertCircle,
  Check,
  Clock,
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
} from '@tibyan/design-system';
import { useStudentExamResult } from '../../hooks/useAnalytics.js';

export function StudentResultPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  const { data: result, isLoading, error } = useStudentExamResult(submissionId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="student-result-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          <span className="text-sm text-[var(--color-text-secondary)]">جاري تحميل النتيجة...</span>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <Card variant="subtle" className="p-8 text-center space-y-3" data-testid="student-result-error">
        <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تعذر تحميل النتيجة</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">{(error as Error)?.message}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>العودة</Button>
      </Card>
    );
  }

  const percentage = result.totalMaxMarks > 0 ? Math.round((result.totalAwardedMarks / result.totalMaxMarks) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="page-student-result">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border-subtle)]">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
          <ChevronRight size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">نتيجة الطالب</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--color-text-secondary)]">{result.studentName}</span>
            <span className="text-xs text-[var(--color-text-muted)]">—</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{result.examTitle}</span>
          </div>
        </div>
        <Badge variant={result.isFinalized ? 'success' : 'warning'} size="sm">
          {result.isFinalized ? <Check size={10} className="me-1" /> : <Clock size={10} className="me-1" />}
          {result.isFinalized ? 'نهائي' : 'مبدئي'}
        </Badge>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="default" className="p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">الدرجة الممنوحة</p>
          <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{result.totalAwardedMarks}</p>
        </Card>
        <Card variant="default" className="p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">الدرجة القصوى</p>
          <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{result.totalMaxMarks}</p>
        </Card>
        <Card variant="default" className="p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">النسبة المئوية</p>
          <p className={`text-2xl font-bold ${percentage >= 50 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
            {percentage}%
          </p>
        </Card>
        <Card variant="default" className="p-4 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">التقدير</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {percentage >= 90 ? 'ممتاز' : percentage >= 80 ? 'جيد جداً' : percentage >= 70 ? 'جيد' : percentage >= 60 ? 'مقبول' : 'راسب'}
          </p>
        </Card>
      </div>

      {/* Questions Breakdown */}
      {result.questionResults.length > 0 && (
        <Card variant="default" className="overflow-hidden" data-testid="question-results-table">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تفصيل الدرجات حسب الأسئلة</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>رقم السؤال</TableHead>
                <TableHead className="w-20 text-center">القصوى</TableHead>
                <TableHead className="w-20 text-center">الممنوحة</TableHead>
                <TableHead className="w-20 text-center">النسبة</TableHead>
                <TableHead className="w-28">التقييم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.questionResults.map((qr, idx) => {
                const qPct = qr.maxMarks > 0 ? Math.round((qr.awardedMarks / qr.maxMarks) * 100) : 0;
                return (
                  <TableRow key={qr.examQuestionId} data-testid={`question-result-${idx}`}>
                    <TableCell className="text-xs">{qr.questionPosition}</TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--color-text-primary)]">سؤال {qr.questionPosition}</span>
                    </TableCell>
                    <TableCell className="text-center text-xs">{qr.maxMarks}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-bold text-[var(--color-brand-primary)]">{qr.awardedMarks}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-semibold ${qPct >= 50 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}`}>
                        {qPct}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {qr.teacherOverride && (
                          <Badge variant="warning" size="sm">تعديل يدوي</Badge>
                        )}
                        <Badge variant="neutral" size="sm">{qr.gradingMethod}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Skill Performance */}
      {result.skillPerformance.length > 0 && (
        <Card variant="default" className="overflow-hidden" data-testid="skill-results">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">الأداء حسب المهارات</h3>
          </div>
          <div className="p-4 space-y-2">
            {result.skillPerformance.map((sr) => {
              const sPct = sr.averageMaxMarks != null && sr.averageAwardedMarks != null
                ? Math.round((sr.averageAwardedMarks / sr.averageMaxMarks) * 100)
                : sr.successPercentage != null ? Math.round(sr.successPercentage) : 0;
              return (
                <div key={sr.curriculumNodeId} className="flex items-center gap-3" data-testid={`skill-result-${sr.curriculumNodeId}`}>
                  <span className="text-sm text-[var(--color-text-primary)] min-w-[120px]">{sr.nodeTitle}</span>
                  <div className="flex-1 h-2 bg-[var(--color-bg-surface-subtle)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sPct >= 50 ? 'bg-[var(--color-status-success)]' : 'bg-[var(--color-status-danger)]'}`}
                      style={{ width: `${sPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-16 text-left">
                    {sr.averageAwardedMarks?.toFixed(1) ?? '—'}/{sr.averageMaxMarks?.toFixed(1) ?? '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
