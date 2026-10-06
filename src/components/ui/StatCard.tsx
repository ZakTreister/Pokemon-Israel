import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  accent?: 'blue' | 'gold' | 'red' | 'navy';
  className?: string;
  compact?: boolean;
}

const accentClasses = {
  blue: 'text-blue-500',
  gold: 'text-navy-700 dark:text-gold-300',
  red: 'text-red-400',
  navy: 'text-foreground',
};

export function StatCard({
  value,
  label,
  icon,
  accent = 'blue',
  compact = false,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        'cs-stat relative border border-border bg-card text-card-foreground px-4 py-4 shadow-card',
        compact
          ? 'rounded-md text-center'
          : 'cs-public-card h-full min-h-[150px] flex flex-col items-start justify-center',
        `cs-stat-${accent}`,
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/15',
            compact && 'mx-auto',
            accentClasses[accent],
          )}
        >
          {icon}
        </div>
      )}
      <div
        className={cn(
          'text-3xl font-extrabold leading-none tabular-nums',
          accentClasses[accent],
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-xs font-bold text-muted-foreground">
        {label}
      </div>
    </div>
  );
  return compact ? (
    content
  ) : (
    <div className="cs-card-frame min-w-0">{content}</div>
  );
}

export default StatCard;
