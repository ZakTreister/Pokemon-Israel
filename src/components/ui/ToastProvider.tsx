import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  remaining: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 10000;
const TICK_MS = 50;

const toastConfig: Record<ToastType, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'bg-success text-success-foreground' },
  error: { icon: XCircle, classes: 'bg-destructive text-destructive-foreground' },
  info: { icon: Info, classes: 'bg-secondary text-secondary-foreground' },
  warning: { icon: AlertTriangle, classes: 'bg-warning text-warning-foreground' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newToast: ToastItem = { id, message, type, remaining: TOAST_DURATION };
      setToasts((prev) => [...prev, newToast]);

      timersRef.current[id] = setInterval(() => {
        setToasts((prev) => {
          const toast = prev.find((t) => t.id === id);
          if (!toast) return prev;
          const newRemaining = toast.remaining - TICK_MS;
          if (newRemaining <= 0) {
            if (timersRef.current[id]) {
              clearInterval(timersRef.current[id]);
              delete timersRef.current[id];
            }
            return prev.filter((t) => t.id !== id);
          }
          return prev.map((t) => (t.id === id ? { ...t, remaining: newRemaining } : t));
        });
      }, TICK_MS);
    },
    []
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
      timersRef.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;
          const progressPct = (toast.remaining / TOAST_DURATION) * 100;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full rounded-lg shadow-lg overflow-hidden animate-slide-in ${config.classes}`}
            >
              <div className="flex items-start gap-3 p-4">
                <Icon size={20} className="flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="סגור"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="h-1 bg-black/20">
                <div
                  className="h-full bg-current opacity-30 transition-all duration-75 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
