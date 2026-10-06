import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  highlightWord?: string;
  children?: ReactNode;
  variant?: 'dark' | 'light';
  className?: string;
}

export function PageHero({
  title,
  subtitle,
  highlightWord,
  children,
  variant = 'dark',
  className,
}: PageHeroProps) {
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className={variant === 'dark' ? 'text-gold' : 'text-blue-500'}>{highlightWord}</span>
        {parts[1]}
      </>
    );
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        variant === 'dark'
          ? 'bg-hero-navy text-white'
          : 'bg-section-light text-navy-700',
        className
      )}
    >
      {variant === 'dark' && (
        <>
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="absolute inset-0 halftone-dots opacity-40" />
          <div className="absolute inset-0 diagonal-lines" />
        </>
      )}
      <div className="container relative py-16 md:py-24">
        <div className={cn('max-w-3xl', !subtitle && !children && 'mx-auto text-center')}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
            {renderTitle()}
          </h1>
          {subtitle && (
            <p className={cn('text-lg md:text-xl mb-6', variant === 'dark' ? 'text-blue-200' : 'text-ink-muted')}>
              {subtitle}
            </p>
          )}
          {children && <div className="flex flex-col sm:flex-row gap-4">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export default PageHero;
