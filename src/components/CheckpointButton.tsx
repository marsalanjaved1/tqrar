/**
 * Checkpoint Button Component - Kiro Style
 * 
 * Allows users to create and restore checkpoints
 * - Create checkpoint: Save current state
 * - Restore checkpoint: Revert to saved state
 */

import React from 'react';
import { cn } from '../utils/classNames';

export interface ICheckpoint {
  id: string;
  timestamp: Date;
  description: string;
  messageCount: number;
}

export interface ICheckpointButtonProps {
  /**
   * List of available checkpoints
   */
  checkpoints: ICheckpoint[];

  /**
   * Callback to create a new checkpoint
   */
  onCreateCheckpoint: () => void;

  /**
   * Callback to restore a checkpoint
   */
  onRestoreCheckpoint: (checkpointId: string) => void;

  /**
   * Whether checkpoint operations are in progress
   */
  isLoading?: boolean;

  /**
   * Whether there are changes since last checkpoint
   */
  hasChanges?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Format relative time
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

/**
 * CheckpointButton component - Kiro style
 * Dropdown button for checkpoint management
 */
export const CheckpointButton: React.FC<ICheckpointButtonProps> = ({
  checkpoints,
  onCreateCheckpoint,
  onRestoreCheckpoint,
  isLoading = false,
  hasChanges = false,
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

  const latestCheckpoint = checkpoints[0];

  return (
    <div className={cn('kiro-checkpoint tq-relative', className)} ref={dropdownRef}>
      {/* Main button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          'kiro-checkpoint-btn',
          'tq-flex tq-items-center tq-gap-1.5 tq-px-2 tq-py-1 tq-rounded-md',
          'tq-text-xs tq-font-medium tq-transition-all tq-cursor-pointer',
          'tq-bg-bg-secondary tq-text-text-secondary tq-border tq-border-border-default',
          'hover:tq-bg-bg-hover hover:tq-text-text-primary hover:tq-border-border-subtle',
          isOpen && 'tq-bg-bg-hover tq-text-text-primary tq-border-border-subtle',
          isLoading && 'tq-opacity-50 tq-cursor-not-allowed'
        )}
        title="Checkpoints"
        aria-label="Checkpoint menu"
        aria-expanded={isOpen}
      >
        {/* Checkpoint icon */}
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 16 16" 
          fill="none" 
          className="tq-text-current"
        >
          <path 
            d="M8 2v12M2 8h12" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          <circle 
            cx="8" 
            cy="8" 
            r="3" 
            stroke="currentColor" 
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        
        <span>Checkpoint</span>
        
        {/* Change indicator */}
        {hasChanges && (
          <span className="tq-w-1.5 tq-h-1.5 tq-rounded-full tq-bg-warning" title="Unsaved changes" />
        )}
        
        {/* Dropdown arrow */}
        <svg 
          width="10" 
          height="10" 
          viewBox="0 0 10 10" 
          className={cn(
            'tq-transition-transform tq-ml-0.5',
            isOpen && 'tq-rotate-180'
          )}
        >
          <path 
            d="M2 4L5 7L8 4" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className={cn(
          'kiro-checkpoint-dropdown',
          'tq-absolute tq-bottom-full tq-left-0 tq-mb-1',
          'tq-w-64 tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg',
          'tq-shadow-dropdown tq-z-50 tq-overflow-hidden',
          'tq-animate-fade-in'
        )}>
          {/* Create checkpoint button */}
          <button
            onClick={() => {
              onCreateCheckpoint();
              setIsOpen(false);
            }}
            disabled={isLoading}
            className={cn(
              'tq-w-full tq-flex tq-items-center tq-gap-2 tq-px-3 tq-py-2.5',
              'tq-text-sm tq-text-text-primary tq-text-left',
              'tq-border-b tq-border-border-default',
              'hover:tq-bg-bg-hover tq-transition-colors',
              'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" className="tq-text-accent-blue">
              <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Create Checkpoint</span>
          </button>

          {/* Checkpoints list */}
          {checkpoints.length > 0 ? (
            <div className="tq-max-h-48 tq-overflow-y-auto">
              <div className="tq-px-3 tq-py-1.5 tq-text-xs tq-font-medium tq-text-text-muted tq-uppercase tq-tracking-wide">
                Restore to
              </div>
              {checkpoints.map((checkpoint) => (
                <button
                  key={checkpoint.id}
                  onClick={() => {
                    onRestoreCheckpoint(checkpoint.id);
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                  className={cn(
                    'tq-w-full tq-flex tq-items-start tq-gap-2 tq-px-3 tq-py-2',
                    'tq-text-left tq-transition-colors',
                    'hover:tq-bg-bg-hover',
                    'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" className="tq-text-text-muted tq-mt-0.5 tq-flex-shrink-0">
                    <path 
                      d="M2 7a5 5 0 1 1 1.5 3.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path d="M2 4v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <div className="tq-flex-1 tq-min-w-0">
                    <div className="tq-text-sm tq-text-text-primary tq-truncate">
                      {checkpoint.description}
                    </div>
                    <div className="tq-text-xs tq-text-text-muted">
                      {formatRelativeTime(checkpoint.timestamp)} · {checkpoint.messageCount} messages
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="tq-px-3 tq-py-4 tq-text-center tq-text-sm tq-text-text-muted">
              No checkpoints yet
            </div>
          )}
        </div>
      )}
    </div>
  );
};
