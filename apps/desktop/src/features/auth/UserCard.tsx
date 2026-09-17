import { CheckCircle } from 'lucide-react';
import { Badge } from '@tibyan/design-system';
import type { LoginUserDto } from '@tibyan/contracts';

export interface UserCardProps {
  user: LoginUserDto;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}

export function UserCard({
  user,
  isSelected,
  onSelect,
  disabled = false,
  className = '',
}: UserCardProps) {
  const isOwner = user.role === 'OWNER';
  const initial = user.fullName.trim().charAt(0) || 'م';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
      data-testid={`user-card-${user.id}`}
      className={`
        relative w-full text-right p-4 rounded-xl transition-all duration-150 select-none
        border flex items-center justify-between gap-3
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isSelected
            ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary-subtle)]/30 ring-1 ring-[var(--color-brand-primary)] shadow-sm'
            : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-subtle)] hover:border-[var(--color-border-strong)]'
        }
        ${className}
      `}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Avatar initial */}
        <div
          className={`
            w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 transition-colors
            ${
              isSelected
                ? 'bg-[var(--color-brand-primary)] text-white'
                : 'bg-[var(--color-bg-surface-subtle)] text-[var(--color-brand-primary)] border border-[var(--color-border-subtle)]'
            }
          `}
          aria-hidden="true"
        >
          {initial}
        </div>

        {/* User Details */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
              {user.fullName}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--color-text-secondary)] truncate num-isolate" dir="ltr">
              @{user.username}
            </span>
            <Badge
              variant={isOwner ? 'primary' : 'neutral'}
              size="sm"
              className="text-[10px] py-0 px-1.5 font-medium"
            >
              {isOwner ? 'المعلم المسؤول' : 'مساعد'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Selected Indicator */}
      <div className="shrink-0 text-[var(--color-brand-primary)]">
        {isSelected ? (
          <CheckCircle className="w-5 h-5 text-[var(--color-brand-primary)]" aria-hidden="true" />
        ) : (
          <div className="w-5 h-5 rounded-full border border-[var(--color-border-subtle)]" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}
