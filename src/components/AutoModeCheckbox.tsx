/**
 * Auto Mode Checkbox Component
 * 
 * Controls whether execution starts automatically in Act mode
 * - When checked: Agent executes tools automatically without user approval
 * - When unchecked: Agent waits for manual trigger before execution
 */

import React from 'react';
import { cn } from '../utils/classNames';

/**
 * Props for AutoModeCheckbox component
 */
export interface IAutoModeCheckboxProps {
  /**
   * Whether auto mode is enabled
   */
  checked: boolean;

  /**
   * Callback when checkbox state changes
   */
  onChange: (checked: boolean) => void;

  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * AutoModeCheckbox component
 * Displays a checkbox to control automatic execution in Act mode
 */
export const AutoModeCheckbox: React.FC<IAutoModeCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  className = ''
}) => {
  const tooltipText = checked
    ? 'Auto Mode: Agent executes tools automatically without approval'
    : 'Manual Mode: Agent waits for your approval before executing tools';

  /**
   * Handle checkbox change
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow Space to toggle (Enter is handled by default checkbox behavior)
    if (event.key === ' ') {
      event.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div 
      className={cn(
        'tq-flex tq-items-center tq-gap-2',
        className
      )}
      title={tooltipText}
    >
      <label className={cn(
        'tq-flex tq-items-center tq-gap-2 tq-cursor-pointer tq-select-none',
        disabled && 'tq-cursor-not-allowed tq-opacity-50'
      )}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'tq-w-4 tq-h-4 tq-rounded tq-border tq-border-border-default tq-bg-bg-secondary',
            'tq-cursor-pointer tq-transition-all tq-appearance-none',
            'tq-flex tq-items-center tq-justify-center',
            'checked:tq-bg-accent-blue checked:tq-border-accent-blue',
            'hover:tq-border-border-subtle',
            'focus:tq-outline-none focus:tq-ring-2 focus:tq-ring-accent-blue focus:tq-ring-offset-2 focus:tq-ring-offset-bg-primary',
            'disabled:tq-cursor-not-allowed disabled:tq-opacity-50 disabled:hover:tq-border-border-default',
            // Checkmark styling using background image
            'checked:after:tq-content-[""] checked:after:tq-block checked:after:tq-w-2.5 checked:after:tq-h-2.5',
            'checked:after:tq-bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22white%22%20d%3D%22M13.854%203.646a.5.5%200%200%201%200%20.708l-7%207a.5.5%200%200%201-.708%200l-3.5-3.5a.5.5%200%201%201%20.708-.708L6.5%2010.293l6.646-6.647a.5.5%200%200%201%20.708%200z%22%2F%3E%3C%2Fsvg%3E")]',
            'checked:after:tq-bg-no-repeat checked:after:tq-bg-center checked:after:tq-bg-contain'
          )}
          aria-label={tooltipText}
        />
        <span className={cn(
          'tq-text-sm tq-text-text-primary tq-font-medium',
          'tq-transition-colors',
          disabled && 'tq-text-text-muted'
        )}>
          Auto Mode
        </span>
      </label>

      {/* Screen reader announcement for state changes */}
      <span className="tq-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {checked ? 'Auto Mode enabled: Tools will execute automatically' : 'Auto Mode disabled: Manual approval required'}
      </span>
    </div>
  );
};

/**
 * Check if auto mode is enabled
 * Utility function for use in other components
 * 
 * @param autoMode - Auto mode state
 * @returns True if auto mode is enabled
 */
export function isAutoModeEnabled(autoMode: boolean): boolean {
  return autoMode === true;
}

/**
 * Check if manual approval is required
 * Utility function for use in other components
 * 
 * @param autoMode - Auto mode state
 * @returns True if manual approval is required
 */
export function requiresManualApproval(autoMode: boolean): boolean {
  return autoMode === false;
}
