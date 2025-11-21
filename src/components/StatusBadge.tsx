/**
 * Status Badge Component
 * 
 * Displays the execution status of a tool with visual indicators
 * Supports pending, running, success, and error states
 */

import React from 'react';
import { ToolExecutionStatus } from '../types';
import { cn } from '../utils/classNames';

/**
 * Props for StatusBadge component
 */
export interface IStatusBadgeProps {
  /**
   * Current execution status
   */
  status: ToolExecutionStatus;

  /**
   * Optional custom label text
   */
  label?: string;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Whether to show the label text (default: true)
   */
  showLabel?: boolean;

  /**
   * Whether to show the icon (default: true)
   */
  showIcon?: boolean;
}

/**
 * Status configuration interface
 */
interface IStatusConfig {
  /**
   * Display label for the status
   */
  label: string;

  /**
   * Icon symbol for the status
   */
  icon: string;

  /**
   * CSS class name for styling
   */
  className: string;

  /**
   * ARIA label for accessibility
   */
  ariaLabel: string;

  /**
   * Whether this status represents an active/animated state
   */
  isAnimated: boolean;
}

/**
 * Status configurations for each state
 */
const STATUS_CONFIGS: Record<ToolExecutionStatus, IStatusConfig> = {
  pending: {
    label: 'Pending',
    icon: '⏱️',
    className: 'tq-status-pending',
    ariaLabel: 'Tool execution pending',
    isAnimated: false
  },
  running: {
    label: 'Running',
    icon: '⚙️',
    className: 'tq-status-running',
    ariaLabel: 'Tool execution in progress',
    isAnimated: true
  },
  success: {
    label: 'Success',
    icon: '✓',
    className: 'tq-status-success',
    ariaLabel: 'Tool execution succeeded',
    isAnimated: false
  },
  error: {
    label: 'Error',
    icon: '✗',
    className: 'tq-status-error',
    ariaLabel: 'Tool execution failed',
    isAnimated: false
  }
};

/**
 * StatusBadge component
 * Displays a visual indicator for tool execution status
 */
export const StatusBadge: React.FC<IStatusBadgeProps> = ({
  status,
  label,
  className = '',
  showLabel = true,
  showIcon = true
}) => {
  const config = STATUS_CONFIGS[status];
  const displayLabel = label || config.label;

  return (
    <span
      className={cn('tq-status-badge', config.className, className)}
      role="status"
      aria-label={config.ariaLabel}
      aria-live={config.isAnimated ? 'polite' : 'off'}
    >
      {showIcon && (
        <span
          className={cn(
            'tq-mr-1',
            config.isAnimated && 'tq-animate-pulse-dot'
          )}
          aria-hidden="true"
        >
          {config.icon}
        </span>
      )}
      {showLabel && (
        <span>
          {displayLabel}
        </span>
      )}
    </span>
  );
};

/**
 * Get status configuration for a given status
 * Useful for accessing status info without rendering the component
 * 
 * @param status - Tool execution status
 * @returns Status configuration
 */
export function getStatusConfig(status: ToolExecutionStatus): IStatusConfig {
  return STATUS_CONFIGS[status];
}

/**
 * Check if a status represents a completed state (success or error)
 * 
 * @param status - Tool execution status
 * @returns True if the status is completed
 */
export function isStatusCompleted(status: ToolExecutionStatus): boolean {
  return status === 'success' || status === 'error';
}

/**
 * Check if a status represents an active state (pending or running)
 * 
 * @param status - Tool execution status
 * @returns True if the status is active
 */
export function isStatusActive(status: ToolExecutionStatus): boolean {
  return status === 'pending' || status === 'running';
}

/**
 * Get the next logical status in the execution lifecycle
 * Useful for status transitions
 * 
 * @param currentStatus - Current tool execution status
 * @returns Next expected status or null if at terminal state
 */
export function getNextStatus(currentStatus: ToolExecutionStatus): ToolExecutionStatus | null {
  switch (currentStatus) {
    case 'pending':
      return 'running';
    case 'running':
      // Running can transition to either success or error
      // Return null as the next state is determined by execution result
      return null;
    case 'success':
    case 'error':
      // Terminal states
      return null;
    default:
      return null;
  }
}

/**
 * Export status configurations for use in other components
 */
export { STATUS_CONFIGS };
