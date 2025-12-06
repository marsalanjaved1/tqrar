import React from 'react';
import { cn } from '../utils/classNames';

export interface IToastProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  autoCloseDuration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const Toast: React.FC<IToastProps> = ({
  message,
  action,
  onDismiss,
  autoCloseDuration = 5000,
  type = 'info'
}) => {
  React.useEffect(() => {
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration, onDismiss]);

  const typeStyles = {
    info: 'tq-bg-accent-blue tq-text-white',
    success: 'tq-bg-green-600 tq-text-white',
    warning: 'tq-bg-yellow-600 tq-text-white',
    error: 'tq-bg-red-600 tq-text-white'
  };

  return (
    <div
      className={cn(
        'tq-fixed tq-bottom-4 tq-right-4 tq-px-4 tq-py-3 tq-rounded-lg tq-shadow-lg',
        'tq-flex tq-items-center tq-gap-3 tq-max-w-sm',
        'tq-animate-slide-in-up tq-z-50',
        typeStyles[type]
      )}
      role="status"
      aria-live="polite"
    >
      <span className="tq-flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="tq-font-semibold tq-whitespace-nowrap tq-hover:tq-opacity-90 tq-transition-opacity"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="tq-ml-2 tq-text-lg tq-hover:tq-opacity-90 tq-transition-opacity"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};
