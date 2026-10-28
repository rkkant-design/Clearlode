import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'neon'; className?: string }) => {
  const variants = {
    default: "bg-zinc-800 text-zinc-300",
    outline: "border border-zinc-700 text-zinc-400 bg-transparent",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    neon: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 box-shadow-neon",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wider", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg' }
>(({ children, variant = 'primary', size = 'md', className, ...props }, ref) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100",
    danger: "bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50",
    success: "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50",
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
});
Button.displayName = 'Button';
