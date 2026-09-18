import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AttendanceSummaryStrip } from '../src/features/attendance/AttendanceSummaryStrip.js';
import { AttendanceRosterTable } from '../src/features/attendance/AttendanceRosterTable.js';
import { AttendancePage } from '../src/features/attendance/AttendancePage.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type { SessionRosterItemDto } from '@tibyan/contracts';

describe('AttendancePage, Roster & Summary Suite', () => {
  let queryClient: QueryClient;

  const mockRosterItem1: SessionRosterItemDto = {
    studentId: '11111111-1111-4111-8111-111111111111',
    studentCode: 'TB-0001',
    studentName: 'أحمد محمود',
    photoUrl: null,
    enrollmentId: 'enroll-1',
    attendanceRecord: {
      id: 'att-1',
      sessionId: 'session-1',
      studentId: '11111111-1111-4111-8111-111111111111',
      status: 'PRESENT',
      arrivalTime: null,
      notes: null,
      recordedByUserId: null,
      recordedAt: '2026-09-18T14:00:00Z',
      updatedAt: '2026-09-18T14:00:00Z',
    },
  };

  const mockRosterItem2: SessionRosterItemDto = {
    studentId: '22222222-2222-4222-8222-222222222222',
    studentCode: 'TB-0002',
    studentName: 'سارة إبراهيم',
    photoUrl: 'tibyan-media://student-photos/sara.jpg',
    enrollmentId: 'enroll-2',
    attendanceRecord: {
      id: 'att-2',
      sessionId: 'session-1',
      studentId: '22222222-2222-4222-8222-222222222222',
      status: 'LATE',
      arrivalTime: '14:25',
      notes: null,
      recordedByUserId: null,
      recordedAt: '2026-09-18T14:25:00Z',
      updatedAt: '2026-09-18T14:25:00Z',
    },
  };

  const mockRosterItem3: SessionRosterItemDto = {
    studentId: '33333333-3333-4333-8333-333333333333',
    studentCode: 'TB-0003',
    studentName: 'عمر خالد',
    photoUrl: null,
    enrollmentId: 'enroll-3',
    attendanceRecord: null, // unmarked
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      session: {
        userId: '11111111-1111-4111-8111-111111111111',
        fullName: 'الأستاذ أحمد الشريف',
        username: 'teacher',
        role: 'OWNER',
        permissions: ['ATTENDANCE_WRITE', 'GROUPS_READ', 'SESSIONS_MANAGE'],
        tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
      },
    });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      attendance: {
        getRoster: vi.fn().mockResolvedValue({
          success: true,
          data: {
            session: {
              id: 'session-1',
              groupId: 'group-1',
              scheduleId: 'sched-1',
              occurrenceKey: 'sched-1_2026-09-18',
              scheduledDate: '2026-09-18',
              scheduledStartTime: '14:00',
              effectiveDate: '2026-09-18',
              effectiveStartTime: '14:00',
              durationMinutes: 90,
              status: 'SCHEDULED',
              cancellationReason: null,
              notes: null,
              rescheduledAt: null,
              createdAt: '2026-09-01T00:00:00Z',
              updatedAt: '2026-09-01T00:00:00Z',
            },
            groupName: 'مجموعة الأوائل - أولى ثانوي',
            roster: [mockRosterItem1, mockRosterItem2, mockRosterItem3],
            summary: {
              totalStudents: 3,
              present: 1,
              late: 1,
              absent: 0,
              excused: 0,
              unmarked: 1,
            },
          },
        }),
        record: vi.fn().mockResolvedValue({ success: true, data: {} }),
        batchRecord: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getEndOfDay: vi.fn().mockResolvedValue({
          success: true,
          data: {
            date: '2026-09-18',
            totalSessions: 1,
            totalAbsent: 0,
            totalLate: 1,
            followUps: [],
          },
        }),
      },
      dashboard: {
        getToday: vi.fn().mockResolvedValue({
          success: true,
          data: {
            date: '2026-09-18',
            slots: [
              {
                sessionId: 'session-1',
                groupId: 'group-1',
                groupName: 'مجموعة الأوائل - أولى ثانوي',
                educationSystem: 'GENERAL',
                gradeLevel: 'SEC_1',
                languageTrack: 'ARABIC',
                effectiveStartTime: '14:00',
                durationMinutes: 90,
                status: 'SCHEDULED',
                isRescheduled: false,
                originalScheduledDate: '2026-09-18',
                originalScheduledTime: '14:00',
                enrolledCount: 3,
              },
            ],
            needsAttention: [],
          },
        }),
      },
      sessions: {
        complete: vi.fn().mockResolvedValue({ success: true, data: {} }),
      },
    };
  });

  afterEach(() => {
    if ((global as any).window) {
      delete (global as any).window.tibyan;
    }
  });

  it('renders AttendanceSummaryStrip with correct labels and numeric values', () => {
    const html = renderToStaticMarkup(
      <AttendanceSummaryStrip
        summary={{
          totalStudents: 25,
          present: 20,
          late: 3,
          absent: 1,
          excused: 1,
          unmarked: 0,
        }}
      />
    );

    expect(html).toContain('إجمالي الطلاب');
    expect(html).toContain('حاضر');
    expect(html).toContain('متأخر');
    expect(html).toContain('غائب');
    expect(html).toContain('معذور');
    expect(html).toContain('لم يُسجل');
    expect(html).toContain('>25<');
    expect(html).toContain('>20<');
    expect(html).toContain('>3<');
  });

  it('renders AttendanceRosterTable with student codes, names, and arrival time', () => {
    const html = renderToStaticMarkup(
      <AttendanceRosterTable
        roster={[mockRosterItem1, mockRosterItem2, mockRosterItem3]}
        onUpdateStatus={() => {}}
        onBulkMarkPresent={() => {}}
      />
    );

    expect(html).toContain('TB-0001');
    expect(html).toContain('أحمد محمود');
    expect(html).toContain('TB-0002');
    expect(html).toContain('سارة إبراهيم');
    expect(html).toContain('14:25'); // Late arrival time
    expect(html).toContain('TB-0003');
    expect(html).toContain('عمر خالد');
    expect(html).toContain('تحديد الكل كـ حاضر');
  });

  it('renders AttendancePage with header and action buttons', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/attendance?sessionId=session-1']}>
          <AttendancePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('تسجيل الحضور');
    expect(html).toContain('الماسح نشط');
    expect(html).toContain('إنهاء الحصة');
    expect(html).toContain('متابعة الغياب');
    expect(html).toContain('data-testid="page-attendance"');
  });
});
