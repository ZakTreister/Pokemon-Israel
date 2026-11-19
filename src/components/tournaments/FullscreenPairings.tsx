import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import Button from '../ui/Button';

interface FullscreenPairingsProps {
  title: string;
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Expand the entire *interactive* tournament management area, not a copy of
 * its tables. Rendering the same children in both modes keeps match drafts,
 * editors, round controls and live Socket.IO updates intact.
 *
 * Fullscreen the document root (rather than this nested element) so dialogs
 * from ConfirmProvider and other app-level overlays remain usable. A focused
 * fixed surface hides only the surrounding site navigation and layout.
 */
export default function FullscreenPairings({
  title,
  children,
  enabled = true,
}: FullscreenPairingsProps) {
  const [mode, setMode] = useState<'normal' | 'native' | 'overlay'>('normal');
  const presenting = mode !== 'normal';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      if (document.fullscreenElement === document.documentElement) {
        setMode('native');
      } else {
        setMode((current) => (current === 'native' ? 'normal' : current));
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!presenting || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'overlay') setMode('normal');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [presenting, mode]);

  const toggle = async () => {
    if (mode === 'overlay') {
      setMode('normal');
      return;
    }
    if (mode === 'native') {
      if (document.fullscreenElement === document.documentElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // Native browser Escape can still exit if the API rejects the call.
        }
      } else {
        setMode('normal');
      }
      return;
    }
    try {
      if (!document.documentElement.requestFullscreen) throw new Error('Fullscreen unsupported');
      await document.documentElement.requestFullscreen();
    } catch {
      // Embedded mobile browsers may reject fullscreen: keep the same editor
      // and simply show it in a full-viewport layer.
      setMode('overlay');
    }
  };

  if (!enabled) return <>{children}</>;

  return (
    <div
      dir="rtl"
      aria-label={title}
      className={
        presenting
          ? 'fixed inset-0 z-[45] h-dvh w-screen overflow-y-auto bg-background p-3 text-foreground sm:p-6'
          : 'space-y-4'
      }
    >
      <div className={presenting
        ? 'sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 rounded-lg border bg-background/95 p-2 shadow-sm'
        : 'flex justify-end'}>
        {presenting && <h2 className="min-w-0 truncate text-lg font-bold sm:text-xl">{title}</h2>}
        <Button
          type="button"
          size="icon"
          contextual
          variant="outline"
          className="shrink-0 bg-card"
          title={presenting ? 'יציאה ממסך מלא (Esc)' : 'הגדל למסך מלא'}
          aria-label={presenting ? 'צמצם מסך ניהול טורניר' : 'הגדל מסך ניהול טורניר'}
          aria-pressed={presenting}
          onClick={() => void toggle()}
        >
          {presenting ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
        </Button>
      </div>
      <div className={presenting ? 'mx-auto max-w-[1600px] pb-6' : ''}>
        {children}
      </div>
    </div>
  );
}
