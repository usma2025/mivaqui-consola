import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl" style={{ border: '1px solid #DDE5DD' }}>
      <table className={cn('w-full caption-bottom text-[14px]', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(className)}
      style={{ borderBottom: '1px solid #DDE5DD', backgroundColor: '#E7EBE2' }}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('divide-y bg-white', className)}
      style={{ '--tw-divide-opacity': '1' } as React.CSSProperties}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors duration-100', className)}
      style={{ borderBottom: '1px solid #DDE5DD' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(83,176,75,0.06)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('h-12 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-widest', className)}
      style={{ color: '#6D7B77' }}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-4 align-middle', className)}
      style={{ color: '#1F2937' }}
      {...props}
    />
  );
}
