import React from 'react';
import { cn } from '@/lib/utils';

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-zinc-800', className)}>
      <div className="h-full bg-gradient-to-r from-emerald-400 to-fuchsia-400 transition-all" style={{ width: `${safe}%` }} />
    </div>
  );
}
