import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextValue {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleResolve = useCallback(
    (result: boolean) => {
      if (resolverRef.current) {
        resolverRef.current(result);
        resolverRef.current = null;
      }
      setOptions(null);
    },
    []
  );

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {options && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card rounded-lg w-full max-w-md shadow-xl animate-slide-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    options.variant === 'destructive'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{options.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {options.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => handleResolve(false)}
                >
                  {options.cancelText || 'ביטול'}
                </Button>
                <Button
                  variant={options.variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={() => handleResolve(true)}
                >
                  {options.confirmText || 'אישור'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
