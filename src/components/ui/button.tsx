import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';

const variants: Record<Variant, string> = {
  default: 'bg-emerald-500 text-black hover:bg-emerald-400',
  secondary: 'bg-zinc-700 text-white hover:bg-zinc-600',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
  outline: 'border border-zinc-700 bg-transparent text-white hover:bg-zinc-800',
  ghost: 'bg-transparent text-white hover:bg-zinc-800',
};

export function Button({ className, variant = 'default', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn('inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition rounded-xl disabled:opacity-50', variants[variant], className)}
      {...props}
    />
  );
}
