import React, { forwardRef } from 'react';
import officialLogoSrc from '../assets/tibyan-official-logo.png';
import tibyanLogoLightSrc from '../assets/tibyan-logo-light.jpg';
import tibyanLogoDarkSrc from '../assets/tibyan-logo-dark.jpg';
import { cn } from '../utils/cn.js';
import { useTheme } from '../providers/ThemeProvider.js';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'custom';
export type LogoVariant = 'official' | 'modern' | 'symbol' | 'wordmark';

export interface LogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  size?: LogoSize;
  alt?: string;
  src?: string;
  variant?: LogoVariant;
}

const sizeStyles: Record<Exclude<LogoSize, 'custom'>, string> = {
  sm: 'h-8 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto',
  xl: 'h-24 w-auto',
};

/**
 * Tibyan Logo component.
 * Supports legacy official immutable logo (SHA-256 preserved) and the new approved modern brand system.
 * Uses object-fit: contain to ensure aspect ratio is strictly preserved without distortion.
 */
export const Logo = forwardRef<HTMLImageElement, LogoProps>(
  (
    {
      size = 'md',
      alt = 'تِبيان — Tibyan',
      src,
      variant = 'official',
      className,
      style,
      ...props
    },
    ref
  ) => {
    let resolvedSrc = src;

    if (!resolvedSrc) {
      if (variant === 'official') {
        resolvedSrc = officialLogoSrc;
      } else {
        // Modern theme-aware logo
        // Check current resolved theme from context safely
        try {
          const themeContext = useTheme();
          resolvedSrc = themeContext.resolvedTheme === 'dark' ? tibyanLogoDarkSrc : tibyanLogoLightSrc;
        } catch {
          resolvedSrc = tibyanLogoLightSrc;
        }
      }
    }

    return (
      <img
        ref={ref}
        src={resolvedSrc}
        alt={alt}
        className={cn(
          'select-none shrink-0 rounded-lg bg-white p-1 border border-[var(--color-border-subtle)] shadow-xs dark:bg-white dark:border-[var(--color-border-strong)] dark:shadow-md',
          size !== 'custom' && sizeStyles[size],
          className
        )}
        style={{
          objectFit: 'contain',
          ...style,
        }}
        {...props}
      />
    );
  }
);

Logo.displayName = 'Logo';

/**
 * Modern theme-aware Tibyan brand symbol & wordmark component.
 */
export function TibyanBrand({
  size = 'md',
  showWordmark = true,
  showSubtitle = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showSubtitle?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const symbolSrc = resolvedTheme === 'dark' ? tibyanLogoDarkSrc : tibyanLogoLightSrc;

  const symbolDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div className={cn('relative shrink-0 rounded-xl overflow-hidden shadow-xs border border-[var(--color-border-subtle)]/80 bg-[var(--color-bg-surface)]', symbolDimensions)}>
        <img
          src={symbolSrc}
          alt="شعار تِبيان الذكي"
          className="w-full h-full object-cover"
        />
      </div>

      {(showWordmark || showSubtitle) && (
        <div className="flex flex-col leading-tight">
          {showWordmark && (
            <span className={cn(
              'font-bold tracking-tight text-[var(--color-text-primary)]',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
            )}>
              تِبيان
            </span>
          )}
          {showSubtitle && (
            <span className="text-[10px] text-[var(--color-text-muted)] font-normal tracking-wide">
              نظام إدارة المعلم الذكي
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { officialLogoSrc, tibyanLogoLightSrc, tibyanLogoDarkSrc };
