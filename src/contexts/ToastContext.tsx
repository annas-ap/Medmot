import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  progress?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, id?: string) => string;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType, id?: string) => {
    const toastId = id || Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      // If ID exists, update it instead of adding new
      const exists = prev.find(t => t.id === toastId);
      if (exists) {
        return prev.map(t => t.id === toastId ? { ...t, message, type } : t);
      }
      return [...prev, { id: toastId, message, type }];
    });

    // Auto hide if not loading
    if (type !== 'loading') {
      setTimeout(() => {
        hideToast(toastId);
      }, 5000);
    }

    return toastId;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    
    // If updated to success or error, set auto hide
    if (updates.type && updates.type !== 'loading') {
      setTimeout(() => {
        hideToast(id);
      }, 5000);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, updateToast, hideToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              className="pointer-events-auto"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 min-w-[300px] max-w-md flex items-start gap-3 relative overflow-hidden">
                <div className="mt-0.5">
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                  {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                </div>
                
                <div className="flex-1 pr-6">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {toast.message}
                  </p>
                  {toast.type === 'loading' && toast.progress !== undefined && (
                    <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="bg-blue-500 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${toast.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => hideToast(toast.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Progress bar for auto-hide */}
                {toast.type !== 'loading' && (
                  <motion.div 
                    className={`absolute bottom-0 left-0 h-0.5 ${
                      toast.type === 'success' ? 'bg-green-500' : 
                      toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    initial={{ width: '100%' }}
                    animate={{ width: 0 }}
                    transition={{ duration: 5, ease: 'linear' }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
