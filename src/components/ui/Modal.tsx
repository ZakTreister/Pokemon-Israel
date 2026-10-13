import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  title: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  closeVariant?: 'outline' | 'ghost';
  panelClassName?: string;
  footer?: ReactNode;
}

/** Presentation shell; the caller owns visibility, dismissal and form state. */
export default function Modal({
  title,
  children,
  onClose,
  closeVariant = 'outline',
  panelClassName = 'max-w-md',
  footer,
}: ModalProps) {
  const titleId = useId();
  return (
    <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm p-4 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        className={`bg-card p-6 rounded-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col ${panelClassName}`}
      >
        {onClose ? (
          <div className="flex justify-between items-center mb-4">
            <h3 id={titleId} className="text-xl font-bold">
              {title}
            </h3>
            <Button
              variant={closeVariant}
              size="icon"
              onClick={onClose}
              aria-label="סגור"
              className={
                closeVariant === 'outline'
                  ? 'text-muted-foreground hover:text-foreground'
                  : undefined
              }
            >
              <X size={20} />
            </Button>
          </div>
        ) : (
          <h3 id={titleId} className="text-xl font-bold mb-4">
            {title}
          </h3>
        )}
        <div className="min-h-0 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t mt-4 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
