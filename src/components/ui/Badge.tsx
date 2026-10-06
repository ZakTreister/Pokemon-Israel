import { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant =
  | 'live'
  | 'upcoming'
  | 'completed'
  | 'registration'
  | 'new'
  | 'active'
  | 'rank-1'
  | 'rank-2'
  | 'rank-3'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  live: 'bg-red-400 text-white shadow-glow-red',
  upcoming: 'bg-blue-50 text-blue-500 border border-blue-200 dark:bg-blue-500/15 dark:border-blue-400/30 dark:text-blue-300',
  completed: 'bg-muted text-muted-foreground border border-border',
  registration: 'bg-gold/15 text-navy-700 border border-gold/30 dark:text-gold-300',
  new: 'bg-gold text-navy-700',
  active: 'bg-success/15 text-green-800 dark:text-green-300 border border-success/30',
  'rank-1': 'bg-gold-gradient text-navy-700',
  'rank-2': 'bg-gradient-to-br from-slate-200 to-slate-400 text-navy-700',
  'rank-3': 'bg-gradient-to-br from-amber-300 to-amber-500 text-navy-700',
  neutral: 'bg-muted text-muted-foreground border border-border',
  info: 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:border-blue-400/30 dark:text-blue-300',
  success: 'bg-success/15 text-green-800 dark:text-green-300 border border-success/30',
  warning: 'bg-gold/15 text-navy-700 border border-gold/30 dark:text-gold-300',
  danger: 'bg-red-50 text-red-500 border border-red-200 dark:bg-red-400/15 dark:border-red-400/30 dark:text-red-300',
};

export function Badge({ variant = 'neutral', pulse, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        variantClasses[variant],
        pulse && 'motion-safe:animate-pulse-glow',
        className
      )}
      {...props}
    >
      {variant === 'live' && (
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      )}
      {children}
    </span>
  );
}

export default Badge;
