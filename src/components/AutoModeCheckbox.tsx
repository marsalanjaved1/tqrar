/**
 * Auto Mode Checkbox Component
 * 
 * Controls whether execution starts automatically in Act mode
 * - When checked: Agent executes tools automatically without user approval
 * - When unchecked: Agent waits for manual trigger before execution
 */

import React from 'react';

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
      className={`jp-AutoModeCheckbox ${className}`}
      title={tooltipText}
    >
      <label className="jp-AutoModeCheckbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="jp-AutoModeCheckbox-input"
          aria-label={tooltipText}
        />
        <span className="jp-AutoModeCheckbox-text">
          Auto Mode
        </span>
      </label>

      {/* Screen reader announcement for state changes */}
      <span className="jp-sr-only" role="status" aria-live="polite" aria-atomic="true">
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
