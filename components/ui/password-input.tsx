'use client';

import * as React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function EyeIcon({ tachado }: { tachado: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [mostrar, setMostrar] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={mostrar ? 'text' : 'password'}
          className={cn('pr-9', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setMostrar((m) => !m)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center transition-colors"
          style={{ color: '#9AA7A3' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6D7B77'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9AA7A3'; }}
          tabIndex={-1}
          aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <EyeIcon tachado={!mostrar} />
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
