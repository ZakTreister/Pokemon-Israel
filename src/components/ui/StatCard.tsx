import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  accent?: 'blue' | 'gold' | 'red' | 'navy';
  className?: string;
}

const accentClasses = {
  blue: 'text-blue-500',
  gold: 'text-gold-600',
  red: 'text-red-400',
  navy: 'text-navy-500',
};

export function StatCard({ value, label, icon, accent = 'blue', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-card-tint px-4 py-3 text-center shadow-card',
        className
      )}
    >
      {icon && <div className="mb-1 flex justify-center text-ink-muted">{icon}</div>}
      <div className={cn('text-2xl font-extrabold leading-none', accentClasses[accent])}>{value}</div>
      <div className="mt-1 text-xs font-medium text-ink-muted">{label}</div>
    </div>
  );
}

export default StatCard;
