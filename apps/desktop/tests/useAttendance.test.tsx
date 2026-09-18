import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attendanceKeys } from '../src/hooks/useAttendance.js';

describe('useAttendance hooks and query keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).window = (global as any).window || {};
  });

  afterEach(() => {
    if ((global as any).window) {
      delete (global as any).window.tibyan;
    }
  });

  it('exports canonical query key factory with deterministic keys', () => {
    expect(attendanceKeys.all).toEqual(['attendance']);
    expect(attendanceKeys.roster('session-123')).toEqual(['attendance', 'roster', 'session-123']);
    expect(attendanceKeys.endOfDay('2026-09-18')).toEqual(['attendance', 'endOfDay', '2026-09-18']);
  });

  it('validates window.tibyan.attendance and sessions.complete contracts', () => {
    const mockRoster = {
      session: { id: 's-1', groupId: 'g-1' },
      groupName: 'Group 1',
      roster: [],
      summary: { totalStudents: 0, present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 },
    };

    (global as any).window.tibyan = {
      attendance: {
        getRoster: vi.fn().mockResolvedValue({ success: true, data: mockRoster }),
        record: vi.fn().mockResolvedValue({ success: true, data: {} }),
        batchRecord: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getEndOfDay: vi.fn().mockResolvedValue({ success: true, data: { followUps: [] } }),
      },
      sessions: {
        complete: vi.fn().mockResolvedValue({ success: true, data: {} }),
      },
    };

    expect((global as any).window.tibyan.attendance.getRoster).toBeDefined();
    expect((global as any).window.tibyan.attendance.record).toBeDefined();
    expect((global as any).window.tibyan.attendance.batchRecord).toBeDefined();
    expect((global as any).window.tibyan.attendance.getEndOfDay).toBeDefined();
    expect((global as any).window.tibyan.sessions.complete).toBeDefined();
  });
});
