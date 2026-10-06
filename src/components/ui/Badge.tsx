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
  upcoming: 'bg-blue-50 text-blue-500 border border-blue-200',
  completed: 'bg-navy-50 text-navy-500 border border-navy-100',
  registration: 'bg-gold/15 text-gold-600 border border-gold/30',
  new: 'bg-gold text-navy-700',
  active: 'bg-success/15 text-success border border-success/30',
  'rank-1': 'bg-gold-gradient text-navy-700',
  'rank-2': 'bg-gradient-to-br from-slate-200 to-slate-400 text-navy-700',
  'rank-3': 'bg-gradient-to-br from-amber-300 to-amber-500 text-navy-700',
  neutral: 'bg-navy-50 text-navy-500 border border-navy-100',
  info: 'bg-blue-50 text-blue-600 border border-blue-200',
  success: 'bg-success/15 text-success border border-success/30',
  warning: 'bg-gold/15 text-gold-600 border border-gold/30',
  danger: 'bg-red-50 text-red-500 border border-red-200',
};

export function Badge({ variant = 'neutral', pulse, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        variantClasses[variant],
        pulse && 'animate-pulse-glow',
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
