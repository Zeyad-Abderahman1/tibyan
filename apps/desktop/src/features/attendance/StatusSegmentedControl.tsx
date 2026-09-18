import React, { useState } from 'react';
import type { AttendanceStatus } from '@tibyan/contracts';
import { cn } from '@tibyan/design-system';
import { Check, Clock, UserX, FileText } from 'lucide-react';
import { LateTimeModal } from './LateTimeModal.js';

export interface StatusSegmentedControlProps {
  currentStatus: AttendanceStatus | null | undefined;
  studentName: string;
  studentCode: string;
  initialArrivalTime?: string | null;
  disabled?: boolean;
  onSelectStatus: (status: AttendanceStatus, arrivalTime?: string | null) => void;
  className?: string;
}

interface StatusOption {
  status: AttendanceStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClasses: string;
  testIdPrefix: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'PRESENT',
    label: 'حاضر',
    icon: Check,
    activeClasses:
      'bg-[var(--color-brand-primary)] text-white dark:bg-[#5CE1E6] dark:text-[#0A1417] shadow-sm font-bold',
    testIdPrefix: 'btn-status-present',
  },
  {
    status: 'LATE',
    label: 'متأخر',
    icon: Clock,
    activeClasses:
      'bg-[var(--color-brand-accent)] text-white dark:bg-[#C59B27] dark:text-[#0A1417] shadow-sm font-bold',
    testIdPrefix: 'btn-status-late',
  },
  {
    status: 'ABSENT',
    label: 'غائب',
    icon: UserX,
    activeClasses:
      'bg-[var(--color-status-danger)] text-white shadow-sm font-bold',
    testIdPrefix: 'btn-status-absent',
  },
  {
    status: 'EXCUSED',
    label: 'معذور',
    icon: FileText,
    activeClasses:
      'bg-[#64748B] text-white dark:bg-[#94A3B8] dark:text-[#0A1417] shadow-sm font-bold',
    testIdPrefix: 'btn-status-excused',
  },
];

export function StatusSegmentedControl({
  currentStatus,
  studentName,
  studentCode,
  initialArrivalTime,
  disabled = false,
  onSelectStatus,
  className,
}: StatusSegmentedControlProps) {
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);

  const handleClick = (status: AttendanceStatus) => {
    if (disabled) return;

    if (status === 'LATE') {
      setIsLateModalOpen(true);
      return;
    }

    onSelectStatus(status, null);
  };

  const handleConfirmLate = (arrivalTime: string) => {
    setIsLateModalOpen(false);
    onSelectStatus('LATE', arrivalTime);
  };

  return (
    <>
      <div
        className={cn(
          'inline-flex items-center p-0.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)] transition-all',
          disabled && 'opacity-60 pointer-events-none',
          className
        )}
        role="group"
        aria-label={`تحديد حالة الحضور للطالب ${studentName}`}
        dir="rtl"
      >
        {STATUS_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = currentStatus === opt.status;

          return (
            <button
              key={opt.status}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(opt.status)}
              data-active={isActive ? 'true' : undefined}
              data-testid={`${opt.testIdPrefix}-${studentCode}`}
              aria-pressed={isActive}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)] focus-visible:z-10',
                isActive
                  ? opt.activeClasses
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <LateTimeModal
        isOpen={isLateModalOpen}
        onClose={() => setIsLateModalOpen(false)}
        onConfirm={handleConfirmLate}
        studentName={studentName}
        initialTime={initialArrivalTime}
      />
    </>
  );
}
