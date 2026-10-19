import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] active:brightness-90',
  outline:
    'bg-white text-[#0B4C4A] active:bg-[#E7EBE2]',
  ghost:
    'text-[#6D7B77] active:bg-[#E7EBE2]',
  destructive:
    'bg-rose-600 text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-rose-700 active:bg-rose-800',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm:      'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  default: 'h-10 px-4 text-[14px] rounded-lg gap-2',
  lg:      'h-11 px-5 text-[15px] rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', style, ...props }, ref) => {
    const variantStyle: React.CSSProperties =
      variant === 'default'
        ? { backgroundColor: '#53B04B' }
        : variant === 'outline'
        ? { borderColor: '#0B4C4A', border: '1px solid #0B4C4A' }
        : {};

    return (
      <button
        ref={ref}
        style={{ ...variantStyle, ...style }}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          variant === 'default' && 'hover:brightness-110',
          variant === 'outline' && 'hover:bg-[#E7EBE2]',
          variant === 'ghost'   && 'hover:bg-[#E7EBE2] hover:text-[#1F2937]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
