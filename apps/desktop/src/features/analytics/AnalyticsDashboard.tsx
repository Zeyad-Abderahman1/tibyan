import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@tibyan/design-system';
import { useExams } from '../../hooks/useExams.js';
import {
  useExamSummary,
  useScoreDistribution,
  useQuestionPerformance,
  useSkillPerformance,
  useStudentResults,
} from '../../hooks/useAnalytics.js';

export function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [selectedExamId, setSelectedExamId] = useState('');

  const { data: exams = [] } = useExams();
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useExamSummary(selectedExamId);
  const { data: distribution } = useScoreDistribution(selectedExamId);
  const { data: questionPerf = [] } = useQuestionPerformance(selectedExamId);
  const { data: skillPerf = [] } = useSkillPerformance(selectedExamId);
  const { data: studentResults = [] } = useStudentResults(selectedExamId);

  return (
    <div className="space-y-4" data-testid="page-analytics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">تحليلات الاختبارات</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            ملخصات شاملة لأداء الطلاب وأداء الأسئلة والمهارات
          </p>
        </div>
      </div>

      {/* Exam Selector */}
      <Card variant="default" className="p-4" data-testid="exam-selector">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">اختر اختباراً</label>
            <Select
              options={[
                { value: '', label: 'اختر اختبار...' },
                ...exams.map(e => ({ value: e.id, label: e.title })),
              ]}
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              data-testid="analytics-exam-select"
            />
          </div>
        </div>
      </Card>

      {/* No Exam Selected */}
      {!selectedExamId && (
        <Card variant="default" className="p-12 text-center space-y-3" data-testid="select-exam-hint">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-muted)] flex items-center justify-center mx-auto">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">اختر اختباراً لعرض التحليلات</h3>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mx-auto">
            اختر اختباراً من القائمة أعلاه لعرض ملخص الأداء وتوزيع الدرجات وأداء الأسئلة.
          </p>
        </Card>
      )}

      {/* Loading */}
      {selectedExamId && summaryLoading && (
        <Card variant="default" className="p-12 text-center text-xs text-[var(--color-text-muted)]" data-testid="analytics-loading">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
            <span>جاري تحميل التحليلات...</span>
          </div>
        </Card>
      )}

      {/* Error */}
      {selectedExamId && summaryError && (
        <Card variant="subtle" className="p-6 text-center space-y-3" data-testid="analytics-error">
          <div className="w-10 h-10 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">تعذر تحميل التحليلات</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{(summaryError as Error)?.message}</p>
        </Card>
      )}

      {/* Analytics Content */}
      {selectedExamId && summary && !summaryLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="summary-cards">
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">متوسط الدرجات</p>
              <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{summary.averageScore?.toFixed(1) ?? '—'}</p>
            </Card>
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">الوسيط</p>
              <p className="text-2xl font-bold text-[var(--color-text-secondary)]">{summary.medianScore?.toFixed(1) ?? '—'}</p>
            </Card>
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">أعلى درجة</p>
              <p className="text-2xl font-bold text-[var(--color-status-success)]">{summary.highestScore ?? '—'}</p>
            </Card>
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">أدنى درجة</p>
              <p className="text-2xl font-bold text-[var(--color-status-danger)]">{summary.lowestScore ?? '—'}</p>
            </Card>
          </div>

          {/* Participation Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">عدد递交ات</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{summary.totalSubmissions}</p>
            </Card>
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">递交ات مُنهاة</p>
              <p className="text-2xl font-bold text-[var(--color-status-success)]">{summary.finalizedCount}</p>
            </Card>
            <Card variant="default" className="p-4 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">المتوسط النسبي</p>
              <p className="text-2xl font-bold text-[var(--color-brand-primary)]">
                {summary.averagePercentage != null ? `${summary.averagePercentage.toFixed(1)}%` : '—'}
              </p>
            </Card>
          </div>

          {/* Score Distribution */}
          {distribution && distribution.buckets.length > 0 && (
            <Card variant="default" className="p-4" data-testid="score-distribution">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">توزيع الدرجات</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">إجمالي الطلاب: {distribution.totalStudents}</p>
              <div className="space-y-2">
                {distribution.buckets.map((bucket, idx) => {
                  const maxCount = Math.max(...distribution.buckets.map(b => b.count), 1);
                  const pct = (bucket.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-3" data-testid={`dist-bucket-${idx}`}>
                      <span className="text-xs text-[var(--color-text-muted)] w-28 text-left">
                        {bucket.rangeStart}–{bucket.rangeEnd}
                      </span>
                      <div className="flex-1 h-4 bg-[var(--color-bg-surface-subtle)] rounded overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-brand-primary)] rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] w-10 text-left">{bucket.count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Question Performance */}
          {questionPerf.length > 0 && (
            <Card variant="default" className="overflow-hidden" data-testid="question-performance">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">أداء الأسئلة</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>السؤال</TableHead>
                    <TableHead className="w-16 text-center">القصوى</TableHead>
                    <TableHead className="w-16 text-center">المتوسط</TableHead>
                    <TableHead className="w-16 text-center">المحاولات</TableHead>
                    <TableHead className="w-16 text-center">نجاح</TableHead>
                    <TableHead className="w-16 text-center">جزئي</TableHead>
                    <TableHead className="w-16 text-center">صفر</TableHead>
                    <TableHead className="w-20 text-center">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionPerf.map((qp, idx) => (
                    <TableRow key={qp.examQuestionId} data-testid={`question-perf-${idx}`}>
                      <TableCell className="text-xs">{qp.questionPosition}</TableCell>
                      <TableCell className="text-sm">{qp.questionType}</TableCell>
                      <TableCell className="text-center text-xs">{qp.maxMarks}</TableCell>
                      <TableCell className="text-center text-xs">{qp.averageAwardedMarks?.toFixed(1) ?? '—'}</TableCell>
                      <TableCell className="text-center text-xs">{qp.attempts}</TableCell>
                      <TableCell className="text-center text-xs text-[var(--color-status-success)]">{qp.fullCreditCount}</TableCell>
                      <TableCell className="text-center text-xs text-[var(--color-status-warning)]">{qp.partialCreditCount}</TableCell>
                      <TableCell className="text-center text-xs text-[var(--color-status-danger)]">{qp.zeroCreditCount}</TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="font-semibold">{qp.successPercentage != null ? `${qp.successPercentage.toFixed(1)}%` : '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Skill Performance */}
          {skillPerf.length > 0 && (
            <Card variant="default" className="overflow-hidden" data-testid="skill-performance">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">الأداء حسب المهارات</h3>
              </div>
              <div className="p-4 space-y-3">
                {skillPerf.map((sp) => {
                  const sPct = sp.averageMaxMarks != null && sp.averageAwardedMarks != null
                    ? Math.round((sp.averageAwardedMarks / sp.averageMaxMarks) * 100)
                    : sp.successPercentage != null ? Math.round(sp.successPercentage) : 0;
                  return (
                    <div key={sp.curriculumNodeId} className="space-y-1" data-testid={`skill-perf-${sp.curriculumNodeId}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-primary)]">{sp.nodeTitle}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{sPct}% ({sp.sampleSize} عينة)</span>
                      </div>
                      <div className="h-2 bg-[var(--color-bg-surface-subtle)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${sPct >= 50 ? 'bg-[var(--color-status-success)]' : 'bg-[var(--color-status-danger)]'}`}
                          style={{ width: `${sPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Student Results */}
          {studentResults.length > 0 && (
            <Card variant="default" className="overflow-hidden" data-testid="student-results-list">
              <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">نتائج الطلاب</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>الطالب</TableHead>
                    <TableHead className="w-20 text-center">الدرجة</TableHead>
                    <TableHead className="w-20 text-center">القصوى</TableHead>
                    <TableHead className="w-16 text-center">النسبة</TableHead>
                    <TableHead className="w-16 text-center">الحالة</TableHead>
                    <TableHead className="w-20 text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentResults.map((sr) => {
                    const pct = sr.totalMaxMarks > 0 ? Math.round((sr.totalAwardedMarks / sr.totalMaxMarks) * 100) : 0;
                    return (
                      <TableRow key={sr.submissionId} data-testid={`student-result-row-${sr.submissionId}`}>
                        <TableCell className="text-xs">{sr.studentCode}</TableCell>
                        <TableCell className="text-sm font-semibold">{sr.studentName}</TableCell>
                        <TableCell className="text-center text-sm font-bold text-[var(--color-brand-primary)]">{sr.totalAwardedMarks}</TableCell>
                        <TableCell className="text-center text-xs">{sr.totalMaxMarks}</TableCell>
                        <TableCell className="text-center text-xs">
                          <span className={pct >= 50 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-danger)]'}>
                            {pct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sr.isFinalized ? 'success' : 'warning'} size="sm">
                            {sr.isFinalized ? 'نهائي' : 'مبدئي'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/student-result/${sr.submissionId}`)}
                            className="p-1.5"
                            data-testid={`view-student-result-${sr.submissionId}`}
                          >
                            <ChevronLeft size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
