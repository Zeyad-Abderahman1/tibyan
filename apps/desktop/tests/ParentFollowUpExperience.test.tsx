import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ParentFollowUpDrawer } from '../src/features/attendance/ParentFollowUpDrawer.js';
import { AttendancePage } from '../src/features/attendance/AttendancePage.js';
import { attendanceKeys } from '../src/hooks/useAttendance.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type { SessionAttendanceRosterDto } from '@tibyan/contracts';

describe('Gate 3: Parent Follow-Up & WhatsApp Suite', () => {
  let queryClient: QueryClient;

  const mockFollowUpData = {
    date: '2026-09-18',
    totalSessions: 1,
    totalAbsent: 1,
    totalLate: 1,
    followUps: [
      {
        sessionId: 'session-1',
        groupName: 'مجموعة المتفوقين — الصف الثاني الثانوي',
        studentId: 'stud-1',
        studentName: 'حمزة ماجد علام',
        guardianPhone: '+201012345678',
        status: 'ABSENT' as const,
        arrivalTime: null,
        whatsappMessage:
          'السلام عليكم، نود إحاطتكم علمًا بغياب الطالب حمزة ماجد علام عن حصة مجموعة المتفوقين — الصف الثاني الثانوي المقررة بتاريخ 2026-09-18.',
      },
      {
        sessionId: 'session-1',
        groupName: 'مجموعة المتفوقين — الصف الثاني الثانوي',
        studentId: 'stud-2',
        studentName: 'آية شريف القاضي',
        guardianPhone: '+201098765432',
        status: 'LATE' as const,
        arrivalTime: '16:32',
        whatsappMessage:
          'السلام عليكم، نود إحاطتكم علمًا بتأخر الطالبة آية شريف القاضي عن حصة مجموعة المتفوقين — الصف الثاني الثانوي المقررة بتاريخ 2026-09-18 حيث كان وقت الحضور 16:32.',
      },
    ],
  };

  const mockRosterPayload: SessionAttendanceRosterDto = {
    session: {
      id: 'session-1',
      groupId: 'group-1',
      groupName: 'مجموعة المتفوقين — الصف الثاني الثانوي',
      scheduleId: 'sched-1',
      occurrenceKey: 'sched-1_2026-09-18',
      scheduledDate: '2026-09-18',
      scheduledStartTime: '16:00',
      effectiveDate: '2026-09-18',
      effectiveStartTime: '16:00',
      durationMinutes: 90,
      status: 'SCHEDULED',
      cancellationReason: null,
      rescheduleReason: null,
      notes: null,
      rescheduledAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    groupName: 'مجموعة المتفوقين — الصف الثاني الثانوي',
    roster: [],
    summary: {
      totalStudents: 2,
      present: 0,
      late: 1,
      absent: 1,
      excused: 0,
      unmarked: 0,
    },
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
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(attendanceKeys.roster('session-1'), mockRosterPayload);
    queryClient.setQueryData(attendanceKeys.endOfDay('2026-09-18'), mockFollowUpData);

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      attendance: {
        getRoster: vi.fn().mockResolvedValue({ success: true, data: mockRosterPayload }),
        record: vi.fn().mockResolvedValue({ success: true, data: {} }),
        batchRecord: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getEndOfDay: vi.fn().mockResolvedValue({ success: true, data: mockFollowUpData }),
      },
      system: {
        openWhatsApp: vi.fn().mockResolvedValue({ success: true }),
      },
      dashboard: {
        getToday: vi.fn().mockResolvedValue({
          success: true,
          data: {
            currentDate: '2026-09-18',
            weekdayArabic: 'الجمعة',
            classes: [],
            totalStudentsExpectedToday: 0,
            activeGroupsCount: 0,
            totalEnrolledStudents: 0,
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

  it('ParentFollowUpDrawer renders student follow-up cards with WhatsApp previews and contact actions', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentFollowUpDrawer
          isOpen={true}
          onClose={() => {}}
          sessionDate="2026-09-18"
        />
      </QueryClientProvider>
    );

    expect(html).toContain('متابعة أولياء الأمور والغياب');
    expect(html).toContain('حمزة ماجد علام');
    expect(html).toContain('آية شريف القاضي');
    expect(html).toContain('+201012345678');
    expect(html).toContain('+201098765432');
    expect(html).toContain('btn-copy-msg-stud-1');
    expect(html).toContain('btn-open-wa-stud-1');
    expect(html).toContain('نسخ الرسالة');
    expect(html).toContain('فتح واتساب');
    expect(html).toContain('غائب: 1');
    expect(html).toContain('متأخر: 1');
  });

  it('AttendancePage exposes Gate 3 Parent Follow-up CTA in the toolbar', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/attendance?sessionId=session-1']}>
          <AttendancePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('btn-open-followup-drawer');
    expect(html).toContain('متابعة الغياب');
    // Gate 2 camera button must also remain present
    expect(html).toContain('btn-open-camera-scanner');
  });
});
