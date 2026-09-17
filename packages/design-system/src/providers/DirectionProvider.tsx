import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { cn } from '../utils/cn.js';

export type Direction = 'rtl' | 'ltr';

export interface DirectionContextValue {
  direction: Direction;
  isRtl: boolean;
  setDirection: (direction: Direction) => void;
  toggleDirection: () => void;
}

const DirectionContext = createContext<DirectionContextValue | undefined>(undefined);

export interface DirectionProviderProps {
  children: React.ReactNode;
  defaultDirection?: Direction;
  targetElement?: HTMLElement | null;
}

/**
 * Applies the direction attribute to the target element (defaults to document.documentElement).
 */
function applyDirectionToDom(direction: Direction, target?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  const el = target ?? document.documentElement;
  el.setAttribute('dir', direction);
}

export function DirectionProvider({
  children,
  defaultDirection = 'rtl',
  targetElement,
}: DirectionProviderProps) {
  const [direction, setDirection] = useState<Direction>(defaultDirection);

  useEffect(() => {
    applyDirectionToDom(direction, targetElement);
  }, [direction, targetElement]);

  const toggleDirection = () => {
    setDirection((prev) => (prev === 'rtl' ? 'ltr' : 'rtl'));
  };

  const contextValue: DirectionContextValue = useMemo(
    () => ({
      direction,
      isRtl: direction === 'rtl',
      setDirection,
      toggleDirection,
    }),
    [direction]
  );

  return (
    <DirectionContext.Provider value={contextValue}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection(): DirectionContextValue {
  const context = useContext(DirectionContext);
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
}

export interface DirectionIsolationProps extends React.HTMLAttributes<HTMLSpanElement> {
  dir?: Direction;
  as?: 'span' | 'div';
}

/**
 * Directional isolation container for numbers, phone numbers, codes, times,
 * and mathematical expressions that should not be affected by parent RTL flow.
 */
export function DirectionIsolation({
  children,
  dir = 'ltr',
  as: Component = 'span',
  className,
  ...props
}: DirectionIsolationProps) {
  return (
    <Component
      dir={dir}
      className={cn('inline-block unicode-isolate', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Convenience wrapper for isolating LTR content (PIN codes, student codes, phone numbers, math).
 */
export function IsolatedLtr(props: Omit<DirectionIsolationProps, 'dir'>) {
  return <DirectionIsolation dir="ltr" {...props} />;
}
