import { ReactNode } from 'react';
import {LeagueLogo} from '../../features/siteSettings/LeagueLogo';
import type {LeagueLogoKey} from '../../../shared/siteSettings';
import { cn } from '../../utils/cn';

interface PageHeroProps {
  title: string;
  league?: LeagueLogoKey;
  subtitle?: string;
  highlightWord?: string;
  children?: ReactNode;
  variant?: 'dark' | 'light' | 'all-stars';
  className?: string;
}

export function PageHero({
  title,
  league,
  subtitle,
  highlightWord,
  children,
  variant = 'dark',
  className,
}: PageHeroProps) {
  const allStars = variant === 'all-stars';
  const dark = variant !== 'light';
  const renderTitle = () => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return title;
    }
    const parts = title.split(highlightWord);
    return (
      <>
        {parts[0]}
        <span className={allStars ? 'text-amber-300' : dark ? 'text-gold' : 'text-blue-500'}>
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
        allStars
          ? 'bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 text-white'
          : dark ? 'bg-hero-navy text-white' : 'bg-section-light text-foreground',
        className,
      )}
    >
      {dark && (
        <>
          <div aria-hidden="true" className={cn("absolute inset-0", allStars ? "bg-[radial-gradient(ellipse_at_80%_20%,rgba(251,191,36,0.12),transparent_50%)]" : "bg-hero-glow")} />
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
          {league&&<LeagueLogo league={league} decorative className="mb-4 h-20 sm:h-28 max-w-[14rem]"/>}
          <p className={cn("mb-4 text-xs font-bold tracking-[.2em]", allStars ? "text-amber-300" : "text-blue-cyan")}>
            CARDSCHOOL IL / POKÉMON TCG
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            {renderTitle()}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-base md:text-lg mb-6',
                allStars ? 'text-purple-100' : dark ? 'text-blue-200' : 'text-muted-foreground',
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
