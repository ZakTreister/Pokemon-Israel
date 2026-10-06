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
  center = false,
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
        <span className={dark ? 'text-gold' : 'text-blue-500'}>
          {highlightWord}
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <div className={cn(center && 'text-center', 'mb-7', className)}>
      <div
        aria-hidden="true"
        className={cn('cs-section-mark mb-3', center && 'mx-auto')}
      />
      {icon && (
        <div
          className={cn(
            'mb-2 flex items-center gap-2 text-sm font-bold',
            center && 'justify-center',
            dark ? 'text-blue-cyan' : 'text-blue-500',
          )}
        >
          {icon}
          <span>CARDSCHOOL IL</span>
        </div>
      )}
      <h2
        className={cn(
          'text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2 leading-tight',
          dark ? 'text-white' : 'text-foreground',
        )}
      >
        {renderTitle()}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'max-w-2xl',
            center && 'mx-auto',
            dark ? 'text-blue-200' : 'text-muted-foreground',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
