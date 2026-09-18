import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CameraScannerModal } from '../src/features/attendance/CameraScannerModal.js';
import { AttendanceRosterTable } from '../src/features/attendance/AttendanceRosterTable.js';
import { AttendancePage } from '../src/features/attendance/AttendancePage.js';
import { attendanceKeys } from '../src/hooks/useAttendance.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type { SessionRosterItemDto, SessionAttendanceRosterDto } from '@tibyan/contracts';

describe('Gate 2: Scanner Experience & Camera Viewfinder Suite', () => {
  let queryClient: QueryClient;

  const mockRoster: SessionRosterItemDto[] = [
    {
      studentId: '11111111-1111-4111-8111-111111111111',
      studentCode: 'TB-0001',
      studentName: 'أحمد محمود',
      photoUrl: null,
      enrollmentId: 'enroll-1',
      attendanceRecord: null,
    },
    {
      studentId: '22222222-2222-4222-8222-222222222222',
      studentCode: 'TB-0002',
      studentName: 'سارة إبراهيم',
      photoUrl: null,
      enrollmentId: 'enroll-2',
      attendanceRecord: null,
    },
  ];

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
    roster: mockRoster,
    summary: {
      totalStudents: 2,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unmarked: 2,
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

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      attendance: {
        getRoster: vi.fn().mockResolvedValue({ success: true, data: mockRosterPayload }),
        record: vi.fn().mockResolvedValue({ success: true, data: {} }),
        batchRecord: vi.fn().mockResolvedValue({ success: true, data: [] }),
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

  it('renders CameraScannerModal with viewfinder target and close button', () => {
    const html = renderToStaticMarkup(
      <CameraScannerModal isOpen={true} onClose={() => {}} onScan={() => {}} />
    );

    expect(html).toContain('ماسح الكاميرا للـ QR والباركود');
    expect(html).toContain('data-testid="camera-scanner-video"');
    expect(html).toContain('data-testid="close-camera-scanner-btn"');
    expect(html).toContain('وجّه كاميرا الجهاز');
  });

  it('renders AttendanceRosterTable with highlighted student row on scan', () => {
    const html = renderToStaticMarkup(
      <AttendanceRosterTable
        roster={mockRoster}
        highlightedStudentId="11111111-1111-4111-8111-111111111111"
        onUpdateStatus={() => {}}
        onBulkMarkPresent={() => {}}
      />
    );

    expect(html).toContain('TB-0001');
    expect(html).toContain('أحمد محمود');
    // Row for student 1 should have highlight class
    expect(html).toContain('ring-emerald-500');
  });

  it('AttendancePage exposes Camera Scanner CTA in Gate 2, but strictly conceals Gate 3 Parent Follow-Up', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/attendance?sessionId=session-1']}>
          <AttendancePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Gate 2 control must now be exposed
    expect(html).toContain('btn-open-camera-scanner');
    expect(html).toContain('ماسح الكاميرا');

    // Gate 3 controls MUST remain concealed until Gate 3
    expect(html).not.toContain('btn-open-followup-drawer');
    expect(html).not.toContain('متابعة الغياب');
  });
});
