import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'red' | 'yellow' | 'green' | 'gray' | 'indigo' | 'blue';
}

// Brand-aligned badge colors
const variantStyles: Record<NonNullable<BadgeProps['variant']>, React.CSSProperties> = {
  default: { backgroundColor: '#E7EBE2',        color: '#1F2937',  boxShadow: '0 0 0 1px #DDE5DD inset' },
  green:   { backgroundColor: 'rgba(83,176,75,0.12)', color: '#0B4C4A', boxShadow: '0 0 0 1px rgba(83,176,75,0.25) inset' },
  indigo:  { backgroundColor: 'rgba(11,76,74,0.1)',   color: '#0B4C4A', boxShadow: '0 0 0 1px rgba(11,76,74,0.2) inset' },
  blue:    { backgroundColor: 'rgba(11,76,74,0.08)',  color: '#0B4C4A', boxShadow: '0 0 0 1px rgba(11,76,74,0.15) inset' },
  gray:    { backgroundColor: '#E7EBE2',        color: '#6D7B77',  boxShadow: '0 0 0 1px #DDE5DD inset' },
  // Functional/alert colors — kept intentionally off-brand for legibility
  red:     { backgroundColor: '#fff1f2', color: '#be123c', boxShadow: '0 0 0 1px #fecdd3 inset' },
  yellow:  { backgroundColor: '#fffbeb', color: '#92400e', boxShadow: '0 0 0 1px #fde68a inset' },
};

export function Badge({ className, variant = 'default', style, ...props }: BadgeProps) {
  return (
    <span
      style={{ ...variantStyles[variant], ...style }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className
      )}
      {...props}
    />
  );
}
