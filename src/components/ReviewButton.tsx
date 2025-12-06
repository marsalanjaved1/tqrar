/**
 * Review Button Component - Kiro Style
 * 
 * Shows a button to review changes made by the agent
 * Opens a diff view or summary of changes
 */

import React from 'react';
import { cn } from '../utils/classNames';

export interface IChange {
  id: string;
  type: 'create' | 'update' | 'delete' | 'execute';
  target: string; // e.g., "Cell 3", "file.py"
  description: string;
  timestamp: Date;
  diff?: {
    before: string;
    after: string;
  };
}

export interface IReviewButtonProps {
  /**
   * List of changes to review
   */
  changes: IChange[];

  /**
   * Callback when user wants to view a specific change
   */
  onViewChange: (changeId: string) => void;

  /**
   * Callback when user accepts all changes
   */
  onAcceptAll: () => void;

  /**
   * Callback when user reverts all changes
   */
  onRevertAll: () => void;

  /**
   * Whether review operations are in progress
   */
  isLoading?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Get icon for change type
 */
const getChangeIcon = (type: IChange['type']): React.ReactNode => {
  switch (type) {
    case 'create':
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" className="tq-text-accent-green">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'update':
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" className="tq-text-accent-blue">
          <path d="M2 10L10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'delete':
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" className="tq-text-error">
          <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'execute':
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" className="tq-text-warning">
          <path d="M3 2v8l7-4-7-4z" fill="currentColor"/>
        </svg>
      );
  }
};

/**
 * ReviewButton component - Kiro style
 * Dropdown button for reviewing changes
 */
export const ReviewButton: React.FC<IReviewButtonProps> = ({
  changes,
  onViewChange,
  onAcceptAll,
  onRevertAll,
  isLoading = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't show if no changes
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className={cn('kiro-review tq-relative', className)} ref={dropdownRef}>
      {/* Main button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'kiro-review-btn',
          'tq-flex tq-items-center tq-gap-1.5 tq-px-2 tq-py-1 tq-rounded-md',
          'tq-text-xs tq-font-medium tq-transition-all tq-cursor-pointer',
          'tq-bg-accent-blue-bg tq-text-accent-blue tq-border tq-border-accent-blue',
          'hover:tq-bg-accent-blue-hover-bg',
          isOpen && 'tq-bg-accent-blue-hover-bg',
          isLoading && 'tq-opacity-50 tq-cursor-not-allowed'
        )}
        title={`Review ${changes.length} change${changes.length > 1 ? 's' : ''}`}
        aria-label="Review changes"
        aria-expanded={isOpen}
      >
        {/* Review icon */}
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 16 16" 
          fill="none" 
          className="tq-text-current"
        >
          <path 
            d="M8 2C4.5 2 1.5 5 1 8c.5 3 3.5 6 7 6s6.5-3 7-6c-.5-3-3.5-6-7-6z" 
            stroke="currentColor" 
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        
        <span>Review</span>
        
        {/* Change count badge */}
        <span className={cn(
          'tq-min-w-[18px] tq-h-[18px] tq-flex tq-items-center tq-justify-center',
          'tq-rounded-full tq-bg-accent-blue tq-text-white tq-text-[10px] tq-font-semibold'
        )}>
          {changes.length}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={cn(
          'kiro-review-dropdown',
          'tq-absolute tq-bottom-full tq-left-0 tq-mb-1',
          'tq-w-72 tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg',
          'tq-shadow-dropdown tq-z-50 tq-overflow-hidden',
          'tq-animate-fade-in'
        )}>
          {/* Header */}
          <div className="tq-flex tq-items-center tq-justify-between tq-px-3 tq-py-2.5 tq-border-b tq-border-border-default">
            <span className="tq-text-sm tq-font-semibold tq-text-text-primary">
              {changes.length} Change{changes.length > 1 ? 's' : ''}
            </span>
            <div className="tq-flex tq-items-center tq-gap-1">
              <button
                onClick={() => {
                  onAcceptAll();
                  setIsOpen(false);
                }}
                disabled={isLoading}
                className={cn(
                  'tq-text-xs tq-font-medium tq-px-2 tq-py-1 tq-rounded',
                  'tq-bg-accent-green tq-text-white',
                  'hover:tq-bg-accent-green-hover',
                  'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
                )}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  onRevertAll();
                  setIsOpen(false);
                }}
                disabled={isLoading}
                className={cn(
                  'tq-text-xs tq-font-medium tq-px-2 tq-py-1 tq-rounded',
                  'tq-bg-transparent tq-text-text-secondary tq-border tq-border-border-default',
                  'hover:tq-bg-bg-hover hover:tq-text-error',
                  'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
                )}
              >
                Revert
              </button>
            </div>
          </div>

          {/* Changes list */}
          <div className="tq-max-h-64 tq-overflow-y-auto">
            {changes.map((change) => (
              <button
                key={change.id}
                onClick={() => {
                  onViewChange(change.id);
                }}
                disabled={isLoading}
                className={cn(
                  'tq-w-full tq-flex tq-items-start tq-gap-2 tq-px-3 tq-py-2',
                  'tq-text-left tq-transition-colors tq-border-b tq-border-border-default last:tq-border-b-0',
                  'hover:tq-bg-bg-hover',
                  'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
                )}
              >
                <div className="tq-mt-0.5 tq-flex-shrink-0">
                  {getChangeIcon(change.type)}
                </div>
                <div className="tq-flex-1 tq-min-w-0">
                  <div className="tq-text-sm tq-text-text-primary tq-truncate">
                    {change.target}
                  </div>
                  <div className="tq-text-xs tq-text-text-muted tq-truncate">
                    {change.description}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" className="tq-text-text-muted tq-mt-1 tq-flex-shrink-0">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
