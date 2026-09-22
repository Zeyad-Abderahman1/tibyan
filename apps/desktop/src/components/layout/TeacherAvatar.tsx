import { cn } from '@tibyan/design-system';

export interface TeacherAvatarProps {
  name: string;
  role?: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Teacher Avatar component.
 * Displays photo if available, otherwise generates an elegant monogram avatar.
 * Avoids stretching and stays strictly circular / softly rounded.
 */
export function TeacherAvatar({
  name,
  role = 'OWNER',
  photoUrl,
  size = 'md',
  className,
}: TeacherAvatarProps) {
  const initial = name.trim().charAt(0) || 'م';

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  if (photoUrl) {
    return (
      <div
        className={cn(
          'relative rounded-full overflow-hidden border border-[var(--color-border-subtle)] shrink-0 shadow-2xs',
          sizeClasses,
          className
        )}
        data-testid="teacher-avatar"
      >
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold font-sans shrink-0 border select-none transition-colors shadow-2xs',
        role === 'OWNER'
          ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/20 dark:bg-[#5CE1E6]/15 dark:text-[#5CE1E6] dark:border-[#5CE1E6]/30'
          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        sizeClasses,
        className
      )}
      aria-label={`الصورة الرمزية للمعلم ${name}`}
      data-testid="teacher-avatar"
    >
      <span>{initial}</span>
    </div>
  );
}
