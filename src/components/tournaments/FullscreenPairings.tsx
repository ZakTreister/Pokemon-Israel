import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import Button from '../ui/Button';

interface FullscreenPairingsProps {
  title: string;
  children: (presenting: boolean) => ReactNode;
  enabled?: boolean;
  disabled?: boolean;
}

/**
 * Present the actual pairings subtree in the browser's fullscreen top layer.
 * Only that subtree remains visible; the surrounding management layout is
 * excluded automatically. On browsers without the Fullscreen API, use a
 * viewport overlay and support Escape to dismiss it.
 */
export default function FullscreenPairings({
  title,
  children,
  enabled = true,
  disabled = false,
}: FullscreenPairingsProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'normal' | 'native' | 'overlay'>('normal');
  const presenting = mode !== 'normal';

  useEffect(() => {
    // SSR and React's test renderer do not supply a browser document.
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      if (document.fullscreenElement === surfaceRef.current) {
        setMode('native');
      } else {
        setMode((current) => (current === 'native' ? 'normal' : current));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (mode !== 'overlay') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('normal');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mode]);

  const toggle = async () => {
    if (mode === 'overlay') {
      setMode('normal');
      return;
    }
    if (mode === 'native') {
      if (document.fullscreenElement === surfaceRef.current) {
        try {
          await document.exitFullscreen();
        } catch {
          // Escape remains available if the browser refuses programmatic exit.
        }
      } else {
        setMode('normal');
      }
      return;
    }
    if (!enabled || disabled || !surfaceRef.current) return;
    try {
      if (!surfaceRef.current.requestFullscreen) throw new Error('Fullscreen unsupported');
      await surfaceRef.current.requestFullscreen();
    } catch {
      // Still provide a focused view in browsers that block the Fullscreen API.
      setMode('overlay');
    }
  };

  if (!enabled) return <>{children(false)}</>;

  return (
    <div
      ref={surfaceRef}
      dir="rtl"
      aria-label={title}
      className={
        presenting
          ? 'fixed inset-0 z-[100] h-screen w-screen overflow-y-auto bg-background p-3 text-foreground sm:p-6'
          : 'space-y-4'
      }
    >
      <div className={presenting
        ? 'sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 rounded-lg border bg-background/95 p-2 shadow-sm'
        : 'flex justify-end'}>
        {presenting && <h2 className="min-w-0 truncate text-lg font-bold sm:text-xl">{title}</h2>}
        {(!disabled || presenting) && (
          <Button
            type="button"
            size="icon"
            contextual
            variant="outline"
            className="shrink-0 bg-card"
            title={presenting ? 'יציאה ממסך מלא (Esc)' : 'הגדל למסך מלא'}
            aria-label={presenting ? 'צמצם תצוגת צימודים' : 'הגדל צימודים למסך מלא'}
            aria-pressed={presenting}
            onClick={() => void toggle()}
          >
            {presenting ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
          </Button>
        )}
      </div>
      <div className={presenting ? 'mx-auto max-w-[1600px] space-y-5' : 'space-y-5'}>
        {children(presenting)}
      </div>
    </div>
  );
}
