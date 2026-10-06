import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  highlightWord?: string;
  center?: boolean;
  dark?: boolean;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  icon,
  highlightWord,
  center = true,
  dark = false,
  className,
}: SectionHeadingProps) {
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className="text-gold">{highlightWord}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <div className={cn(center && 'text-center', 'mb-10', className)}>
      <h2
        className={cn(
          'text-3xl md:text-4xl font-extrabold mb-2 leading-tight',
          dark ? 'text-white' : 'text-navy-700'
        )}
      >
        {icon && <span className="inline-flex items-center gap-2.5">{icon}{renderTitle()}</span>}
        {!icon && renderTitle()}
      </h2>
      {subtitle && (
        <p className={cn('max-w-2xl', center && 'mx-auto', dark ? 'text-blue-200' : 'text-ink-muted')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
