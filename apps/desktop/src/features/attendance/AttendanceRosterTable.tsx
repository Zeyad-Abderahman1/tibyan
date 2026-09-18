import { useState, useMemo } from 'react';
import type { SessionRosterItemDto, AttendanceStatus } from '@tibyan/contracts';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Button,
  Badge,
} from '@tibyan/design-system';
import { Search, UserCheck, Clock, User } from 'lucide-react';
import { StatusSegmentedControl } from './StatusSegmentedControl.js';

export interface AttendanceRosterTableProps {
  roster: SessionRosterItemDto[];
  disabled?: boolean;
  canWrite?: boolean;
  highlightedStudentId?: string | null;
  onUpdateStatus: (studentId: string, status: AttendanceStatus, arrivalTime?: string | null) => void;
  onBulkMarkPresent: (studentIds: string[]) => void;
  className?: string;
}

export function AttendanceRosterTable({
  roster,
  disabled = false,
  canWrite = true,
  highlightedStudentId,
  onUpdateStatus,
  onBulkMarkPresent,
  className,
}: AttendanceRosterTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((item) => {
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentCode.toLowerCase().includes(q)
      );
    });
  }, [roster, searchQuery]);

  const unmarkedStudents = useMemo(() => {
    return roster.filter((item) => !item.attendanceRecord);
  }, [roster]);

  const handleBulkPresent = () => {
    const ids = unmarkedStudents.map((s) => s.studentId);
    if (ids.length > 0) {
      onBulkMarkPresent(ids);
    }
  };

  return (
    <div className={`space-y-4 ${className || ''}`} dir="rtl">
      {/* Table Toolbar: Search + Bulk Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Input
            type="text"
            placeholder="بحث بالاسم أو كود الطالب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 text-xs"
            data-testid="attendance-search-input"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]">
            <Search className="w-3.5 h-3.5" />
          </div>
        </div>

        {canWrite && !disabled && unmarkedStudents.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleBulkPresent}
            className="text-xs shrink-0 flex items-center gap-1.5"
            data-testid="btn-mark-all-present"
          >
            <UserCheck className="w-4 h-4 text-[var(--color-brand-primary)] dark:text-[#5CE1E6]" />
            <span>تحديد الكل كـ حاضر ({unmarkedStudents.length})</span>
          </Button>
        )}
      </div>

      {/* Roster Table */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden shadow-2xs">
        <Table data-testid="attendance-roster-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">الصورة</TableHead>
              <TableHead className="w-28">كود الطالب</TableHead>
              <TableHead>اسم الطالب</TableHead>
              <TableHead className="w-80 text-center">تسجيل الحضور</TableHead>
              <TableHead className="w-36 text-center">وقت الحضور</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[var(--color-text-muted)]">
                  {searchQuery.trim()
                    ? 'لا توجد نتائج مطابقة لبحثك في سجل الحضور.'
                    : 'لا يوجد طلاب مقيدون في هذه الحصة.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRoster.map((student) => {
                const record = student.attendanceRecord;
                const status = record?.status ?? null;
                const arrivalTime = record?.arrivalTime ?? null;

                return (
                  <TableRow
                    key={student.studentId}
                    data-testid={`roster-row-${student.studentCode}`}
                    className={`transition-all duration-300 ${
                      highlightedStudentId === student.studentId
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500/50'
                        : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Photo / Avatar */}
                    <TableCell className="text-center py-2.5">
                      <div className="w-9 h-9 mx-auto rounded-full bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] overflow-hidden flex items-center justify-center">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.studentName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                    </TableCell>

                    {/* Student Code */}
                    <TableCell className="font-mono text-xs font-semibold text-[var(--color-text-secondary)]">
                      <span dir="ltr">{student.studentCode}</span>
                    </TableCell>

                    {/* Student Name */}
                    <TableCell>
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">
                        {student.studentName}
                      </span>
                    </TableCell>

                    {/* Status Segmented Control */}
                    <TableCell className="text-center">
                      <StatusSegmentedControl
                        currentStatus={status}
                        studentName={student.studentName}
                        studentCode={student.studentCode}
                        initialArrivalTime={arrivalTime}
                        disabled={disabled || !canWrite}
                        onSelectStatus={(newStatus, newArrivalTime) => {
                          onUpdateStatus(student.studentId, newStatus, newArrivalTime);
                        }}
                      />
                    </TableCell>

                    {/* Arrival Time */}
                    <TableCell className="text-center">
                      {status === 'LATE' && arrivalTime ? (
                        <Badge variant="warning" size="sm" className="font-mono" dir="ltr">
                          <Clock className="w-3 h-3 ml-1" />
                          <span>{arrivalTime}</span>
                        </Badge>
                      ) : status === 'PRESENT' && arrivalTime ? (
                        <span className="text-xs font-mono text-[var(--color-text-muted)]" dir="ltr">
                          {arrivalTime}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
