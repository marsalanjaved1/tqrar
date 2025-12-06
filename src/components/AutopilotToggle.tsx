/**
 * Autopilot Toggle Component - Kiro Style
 * 
 * Clean, minimal toggle for autopilot mode
 * - When ON: Agent executes tools automatically
 * - When OFF: User must approve each action
 */

import React from 'react';
import { cn } from '../utils/classNames';

export interface IAutopilotToggleProps {
  /**
   * Whether autopilot is enabled
   */
  enabled: boolean;

  /**
   * Callback when toggle state changes
   */
  onChange: (enabled: boolean) => void;

  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * AutopilotToggle component - Kiro style
 * Minimal toggle button that shows current mode
 */
export const AutopilotToggle: React.FC<IAutopilotToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
  className = ''
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!enabled);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'kiro-autopilot-toggle',
        'tq-flex tq-items-center tq-gap-1.5 tq-px-2 tq-py-1 tq-rounded-md',
        'tq-text-xs tq-font-medium tq-transition-all tq-cursor-pointer',
        'tq-border tq-border-transparent',
        enabled
          ? 'tq-bg-accent-green-bg tq-text-accent-green hover:tq-bg-accent-green-hover-bg'
          : 'tq-bg-bg-secondary tq-text-text-secondary hover:tq-bg-bg-hover hover:tq-text-text-primary',
        disabled && 'tq-opacity-50 tq-cursor-not-allowed',
        className
      )}
      title={enabled ? 'Autopilot ON - Actions execute automatically' : 'Autopilot OFF - Manual approval required'}
      aria-label={enabled ? 'Autopilot enabled' : 'Autopilot disabled'}
    >
      {/* Autopilot icon */}
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 16 16" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'tq-transition-colors',
          enabled ? 'tq-text-accent-green' : 'tq-text-text-muted'
        )}
      >
        <path 
          d="M8 1L2 4v4c0 4.5 2.5 7.5 6 9 3.5-1.5 6-4.5 6-9V4L8 1z" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill={enabled ? 'currentColor' : 'none'}
          fillOpacity={enabled ? 0.2 : 0}
        />
        {enabled && (
          <path 
            d="M5.5 8L7 9.5L10.5 6" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        )}
      </svg>
      
      <span>Autopilot</span>
      
      {/* Status indicator dot */}
      <span 
        className={cn(
          'tq-w-1.5 tq-h-1.5 tq-rounded-full tq-transition-colors',
          enabled ? 'tq-bg-accent-green' : 'tq-bg-text-muted'
        )}
      />
    </button>
  );
};
