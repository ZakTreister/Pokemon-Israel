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
        <span className={variant === 'dark' ? 'text-gold' : 'text-blue-500'}>
          {highlightWord}
        </span>
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
          : 'bg-section-light text-foreground',
        className,
      )}
    >
      {variant === 'dark' && (
        <>
          <div className="absolute inset-0 bg-hero-glow" />
          <div className="absolute inset-0 halftone-dots opacity-40" />
          <div className="absolute inset-0 diagonal-lines" />
        </>
      )}
      <div
        aria-hidden="true"
        className="cs-hero-lightning absolute left-[12%] top-8 hidden h-36 w-16 bg-gold/15 md:block"
      />
      <div className="container relative py-12 md:py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-bold tracking-[.2em] text-blue-cyan">
            CARDSCHOOL IL / POKÉMON TCG
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            {renderTitle()}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-base md:text-lg mb-6',
                variant === 'dark' ? 'text-blue-200' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          )}
          {children && <div className="flex flex-wrap gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export default PageHero;
