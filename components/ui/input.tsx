import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg px-3 py-2 text-sm transition-shadow duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      style={{
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        border: '1px solid #DDE5DD',
        // focus is handled via the CSS :focus-visible + inline override below
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
Input.displayName = 'Input';
