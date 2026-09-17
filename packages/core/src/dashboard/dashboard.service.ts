import {
  type TodayDashboardDto,
  type TodayClassSlotDto,
  type NeedsAttentionItemDto,
  type GradeLevel,
  type StudentNoteTag,
  isValidCalendarDate,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  SessionRepository,
  GroupRepository,
  EnrollmentRepository,
  StudentRepository,
  type GroupRow,
} from '@tibyan/db';
import { DateProvider, DefaultDateProvider } from '../common/date-provider.js';

export type DashboardErrorCode = 'INVALID_DATE' | 'PERMISSION_DENIED';

export class DashboardError extends Error {
  constructor(public readonly code: DashboardErrorCode, message: string) {
    super(message);
    this.name = 'DashboardError';
  }
}

/**
 * Mapping of UTC day-of-week index (0 = Sunday .. 6 = Saturday) to Arabic weekday names.
 */
export const ARABIC_WEEKDAYS: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

/**
 * Computes deterministic Arabic weekday name for a YYYY-MM-DD calendar date
 * without local timezone or UTC midnight drift.
 */
export function getArabicWeekday(calendarDate: string): string {
  const parts = calendarDate.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayIndex = utcDate.getUTCDay();
  return ARABIC_WEEKDAYS[dayIndex] ?? '';
}

export interface DashboardServiceOptions {
  dateProvider?: DateProvider;
  sessionRepo?: SessionRepository;
  groupRepo?: GroupRepository;
  enrollmentRepo?: EnrollmentRepository;
  studentRepo?: StudentRepository;
}

/**
 * Aggregates live academic-year database state for the Today Dashboard.
 * Strictly read-only: performs zero mutations, writes zero audit records,
 * and never triggers automatic session horizon materialization.
 */
export class DashboardService {
  private readonly sessionRepo: SessionRepository;
  private readonly groupRepo: GroupRepository;
  private readonly enrollmentRepo: EnrollmentRepository;
  private readonly studentRepo: StudentRepository;
  private readonly dateProvider: DateProvider;

  constructor(
    private readonly db?: AcademicDrizzle,
    options?: DashboardServiceOptions
  ) {
    this.dateProvider = options?.dateProvider ?? new DefaultDateProvider();
    this.sessionRepo = options?.sessionRepo ?? new SessionRepository(this.db);
    this.groupRepo = options?.groupRepo ?? new GroupRepository(this.db);
    this.enrollmentRepo = options?.enrollmentRepo ?? new EnrollmentRepository(this.db);
    this.studentRepo = options?.studentRepo ?? new StudentRepository(this.db);
  }

  /**
   * Aggregates the Today Dashboard for the current date or an explicitly requested calendar date.
   *
   * @param requestedDate Optional calendar date formatted as YYYY-MM-DD. Defaults to dateProvider.today().
   */
  async getTodayDashboard(requestedDate?: string): Promise<TodayDashboardDto> {
    const targetDate = requestedDate ?? this.dateProvider.today();

    if (!isValidCalendarDate(targetDate)) {
      throw new DashboardError('INVALID_DATE', `Invalid calendar date: ${targetDate}`);
    }

    const weekdayArabic = getArabicWeekday(targetDate);

    // 1. Sessions for the requested date are filtered strictly by sessions.effectiveDate === targetDate
    const sessionRows = this.sessionRepo.listByEffectiveDate(targetDate);

    // 2. Fetch group metadata and active enrollment counts efficiently
    const uniqueGroupIds = Array.from(new Set(sessionRows.map((s) => s.groupId)));
    const groupRows = this.groupRepo.findByIds(uniqueGroupIds);
    const groupMap = new Map<string, GroupRow>(groupRows.map((g) => [g.id, g]));
    const activeEnrollmentCounts = this.enrollmentRepo.countActiveByGroupIds(uniqueGroupIds);

    // 3. Map session rows to TodayClassSlotDto
    const classes: TodayClassSlotDto[] = sessionRows.map((session) => {
      const group = groupMap.get(session.groupId);
      if (!group) {
        throw new Error(`Group not found for session: ${session.id} (group: ${session.groupId})`);
      }

      const isRescheduled = Boolean(
        session.rescheduledAt !== null ||
        session.scheduledDate !== session.effectiveDate ||
        session.scheduledStartTime !== session.effectiveStartTime
      );

      const enrolledCount = activeEnrollmentCounts.get(session.groupId) ?? 0;

      return {
        sessionId: session.id,
        groupId: session.groupId,
        groupName: group.name,
        educationSystem: group.educationSystem,
        gradeLevel: group.gradeLevel,
        languageTrack: group.languageTrack,
        effectiveStartTime: session.effectiveStartTime,
        durationMinutes: session.durationMinutes,
        status: session.status,
        isRescheduled,
        originalScheduledDate: session.scheduledDate,
        originalScheduledTime: session.scheduledStartTime,
        enrolledCount,
      };
    });

    // 4. Sort classes ascending by effectiveStartTime, with deterministic secondary ordering
    classes.sort((a, b) => {
      if (a.effectiveStartTime !== b.effectiveStartTime) {
        return a.effectiveStartTime.localeCompare(b.effectiveStartTime);
      }
      if (a.groupName !== b.groupName) {
        return a.groupName.localeCompare(b.groupName);
      }
      if (a.groupId !== b.groupId) {
        return a.groupId.localeCompare(b.groupId);
      }
      return a.sessionId.localeCompare(b.sessionId);
    });

    // 5. Aggregate statistics:
    // - totalStudentsExpectedToday: Active enrolled students across today's non-cancelled classes
    const totalStudentsExpectedToday = classes
      .filter((c) => c.status !== 'CANCELLED_BY_TEACHER')
      .reduce((sum, c) => sum + c.enrolledCount, 0);

    // - activeGroupsCount: Count of groups where status === 'ACTIVE' (archived excluded)
    const activeGroupsCount = this.groupRepo.countActive();

    // - totalEnrolledStudents: Distinct active students with at least one active enrollment
    const totalEnrolledStudents = this.enrollmentRepo.countDistinctActiveEnrolledStudents();

    // 6. NeedsAttention items: active students with NEEDS_FOLLOW_UP notes (deduplicated, latest note first)
    const followUpRows = this.studentRepo.listFollowUpNotesWithActiveStudents();

    const seenStudentIds = new Set<string>();
    const deduplicatedNotes: Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      gradeLevel: GradeLevel;
      tag: StudentNoteTag;
      latestNote: string;
      createdAt: string;
    }> = [];

    for (const row of followUpRows) {
      if (!seenStudentIds.has(row.student.id)) {
        seenStudentIds.add(row.student.id);
        deduplicatedNotes.push({
          studentId: row.student.id,
          studentName: row.student.fullName,
          studentCode: row.student.studentCode,
          gradeLevel: row.student.gradeLevel,
          tag: row.note.tag,
          latestNote: row.note.noteText,
          createdAt: row.note.createdAt,
        });
      }
    }

    // Resolve current active group context for needsAttention students
    const attentionStudentIds = deduplicatedNotes.map((n) => n.studentId);
    const studentActiveGroupsMap = this.enrollmentRepo.getActiveGroupsForStudents(attentionStudentIds);

    const needsAttention: NeedsAttentionItemDto[] = deduplicatedNotes.map((item) => {
      const activeGroups = studentActiveGroupsMap.get(item.studentId);
      const primaryGroupName = activeGroups && activeGroups.length > 0 ? activeGroups[0]!.groupName : '';
      return {
        studentId: item.studentId,
        studentName: item.studentName,
        studentCode: item.studentCode,
        gradeLevel: item.gradeLevel,
        groupName: primaryGroupName,
        tag: item.tag,
        latestNote: item.latestNote,
        createdAt: item.createdAt,
      };
    });

    return {
      currentDate: targetDate,
      weekdayArabic,
      classes,
      totalStudentsExpectedToday,
      activeGroupsCount,
      totalEnrolledStudents,
      needsAttention,
    };
  }

  /**
   * Alias for getTodayDashboard with an explicit calendar date.
   */
  async getDashboardForDate(date: string): Promise<TodayDashboardDto> {
    return this.getTodayDashboard(date);
  }
}
