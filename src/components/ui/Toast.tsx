import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  show: (title: string, type?: ToastType, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const show = useCallback(
    (title: string, type: ToastType = 'info', message?: string) => {
      addToast({ title, type, message });
    },
    [addToast]
  );

  const iconMap: Record<ToastType, ReactNode> = {
    info: <Info className="h-4 w-4 text-forge-accent" />,
    success: <CheckCircle className="h-4 w-4 text-forge-success" />,
    warning: <AlertTriangle className="h-4 w-4 text-forge-warning" />,
    error: <XCircle className="h-4 w-4 text-forge-error" />,
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-forge-panel-elevated border border-forge-border shadow-lg animate-in slide-in-from-right"
          >
            <span className="flex-shrink-0 mt-0.5">{iconMap[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forge-text-primary">{t.title}</p>
              {t.message && <p className="text-xs text-forge-text-muted mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => removeToast(t.id)} className="flex-shrink-0 text-forge-text-muted hover:text-forge-text-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}