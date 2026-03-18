'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} style={{ color: 'var(--positive)' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--negative)' }} />;
      case 'warning':
        return <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />;
    }
  };

  const getBackground = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'var(--positive-bg)';
      case 'error':
        return 'var(--negative-bg)';
      case 'warning':
        return 'var(--warning-bg)';
    }
  };

  const getBorder = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'var(--positive)';
      case 'error':
        return 'var(--negative)';
      case 'warning':
        return 'var(--warning)';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '400px',
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: getBackground(toast.type),
              border: `1px solid ${getBorder(toast.type)}`,
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            {getIcon(toast.type)}
            <p style={{ flex: 1, fontSize: '0.875rem', color: 'var(--foreground)' }}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--foreground-secondary)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
