import React, { forwardRef } from 'react';
import officialLogoSrc from '../assets/tibyan-official-logo.png';
import { cn } from '../utils/cn.js';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'custom';

export interface LogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  size?: LogoSize;
  alt?: string;
  src?: string;
}

const sizeStyles: Record<Exclude<LogoSize, 'custom'>, string> = {
  sm: 'h-8 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto',
  xl: 'h-24 w-auto',
};

/**
 * Official immutable Tibyan logo component.
 * Uses object-fit: contain to ensure aspect ratio is strictly preserved without distortion.
 */
export const Logo = forwardRef<HTMLImageElement, LogoProps>(
  (
    {
      size = 'md',
      alt = 'تِبيان — Tibyan',
      src = officialLogoSrc,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <img
        ref={ref}
        src={src}
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

export { officialLogoSrc };
