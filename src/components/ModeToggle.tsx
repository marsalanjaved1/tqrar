/**
 * Mode Toggle Component
 * 
 * Allows users to switch between Act and Plan execution modes
 * - Act Mode: All tools available (read + write)
 * - Plan Mode: Only read tools available (safe exploration)
 */

import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import { ExecutionMode } from '../types';
import { cn } from '../utils/classNames';

/**
 * Props for ModeToggle component
 */
export interface IModeToggleProps {
  /**
   * Current execution mode
   */
  mode: ExecutionMode;

  /**
   * Callback when mode changes
   */
  onChange: (mode: ExecutionMode) => void;

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
 * Mode configuration interface
 */
interface IModeConfig {
  /**
   * Display label for the mode
   */
  label: string;

  /**
   * Description for tooltip
   */
  description: string;

  /**
   * ARIA label for accessibility
   */
  ariaLabel: string;
}

/**
 * Mode configurations
 */
const MODE_CONFIGS: Record<ExecutionMode, IModeConfig> = {
  plan: {
    label: 'Plan',
    description: 'Plan Mode: Read-only tools (safe exploration). The agent can gather information but cannot make changes.',
    ariaLabel: 'Plan mode - read-only operations'
  },
  act: {
    label: 'Act',
    description: 'Act Mode: All tools available (read + write). The agent can make changes to your notebook and files.',
    ariaLabel: 'Act mode - all operations enabled'
  }
};

/**
 * ModeToggle component
 * Displays a switch to toggle between Act and Plan execution modes
 */
export const ModeToggle: React.FC<IModeToggleProps> = ({
  mode,
  onChange,
  disabled = false,
  className = ''
}) => {
  const isActMode = mode === 'act';
  const currentConfig = MODE_CONFIGS[mode];
  const tooltipText = isActMode 
    ? MODE_CONFIGS.act.description 
    : MODE_CONFIGS.plan.description;

  /**
   * Handle switch change
   */
  const handleCheckedChange = (checked: boolean) => {
    const newMode: ExecutionMode = checked ? 'act' : 'plan';
    onChange(newMode);
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow Space and Enter to toggle (in addition to Radix's built-in handling)
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) {
        handleCheckedChange(!isActMode);
      }
    }
  };

  return (
    <div 
      className={cn('tq-flex tq-items-center tq-gap-2 tq-select-none', className)}
      title={tooltipText}
    >
      <label className="tq-flex tq-items-center tq-gap-2 tq-cursor-pointer">
        <span 
          className={cn(
            'tq-text-sm tq-font-medium tq-transition-colors',
            !isActMode ? 'tq-text-text-primary' : 'tq-text-text-secondary'
          )}
          aria-hidden="true"
        >
          {MODE_CONFIGS.plan.label}
        </span>
        
        <Switch.Root
          className="tq-mode-switch"
          checked={isActMode}
          onCheckedChange={handleCheckedChange}
          disabled={disabled}
          aria-label={currentConfig.ariaLabel}
          title={tooltipText}
          onKeyDown={handleKeyDown}
        >
          <Switch.Thumb className="tq-mode-thumb" />
        </Switch.Root>
        
        <span 
          className={cn(
            'tq-text-sm tq-font-medium tq-transition-colors',
            isActMode ? 'tq-text-text-primary' : 'tq-text-text-secondary'
          )}
          aria-hidden="true"
        >
          {MODE_CONFIGS.act.label}
        </span>
      </label>

      {/* Screen reader announcement for mode changes */}
      <span className="tq-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Current mode: ${currentConfig.label}. ${currentConfig.description}`}
      </span>
    </div>
  );
};

/**
 * Get mode configuration for a given mode
 * Useful for accessing mode info without rendering the component
 * 
 * @param mode - Execution mode
 * @returns Mode configuration
 */
export function getModeConfig(mode: ExecutionMode): IModeConfig {
  return MODE_CONFIGS[mode];
}

/**
 * Check if a mode allows write operations
 * 
 * @param mode - Execution mode
 * @returns True if the mode allows write operations
 */
export function isWriteMode(mode: ExecutionMode): boolean {
  return mode === 'act';
}

/**
 * Check if a mode is read-only
 * 
 * @param mode - Execution mode
 * @returns True if the mode is read-only
 */
export function isReadOnlyMode(mode: ExecutionMode): boolean {
  return mode === 'plan';
}

/**
 * Export mode configurations for use in other components
 */
export { MODE_CONFIGS };
