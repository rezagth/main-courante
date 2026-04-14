import { cn } from '@/lib/utils';
import * as React from 'react';

export const Card = React.forwardRef<
  HTMLElement,
  { className?: string; children: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <section ref={ref} className={cn('rounded-xl border border-zinc-200 bg-white p-4', className)}>
      {children}
    </section>
  );
});

Card.displayName = 'Card';
