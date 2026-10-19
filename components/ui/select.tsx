import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full appearance-none rounded-lg px-3 py-2 text-sm',
        'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236D7B77\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")] bg-no-repeat bg-position-[right_10px_center] pr-8',
        'transition-shadow duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none',
        className
      )}
      style={{
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        border: '1px solid #DDE5DD',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#53B04B';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(83,176,75,0.18)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#DDE5DD';
        e.currentTarget.style.boxShadow = '';
        props.onBlur?.(e);
      }}
      {...props}
    />
  )
);
Select.displayName = 'Select';
