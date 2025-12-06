/**
 * Tool Call Card Component - Kiro Style
 * Clean, minimal tool execution display with expandable details
 */

import React from 'react';
import { IToolExecutionEvent } from '../types';
import { cn } from '../utils/classNames';
import { ToolIcon } from './ToolIcon';

export interface IToolCallCardProps {
  execution: IToolExecutionEvent;
}

/**
 * Format tool arguments for display
 */
const formatParameters = (args: string): string => {
  try {
    const parsed = JSON.parse(args);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return args;
  }
};

/**
 * Get a human-readable summary of the tool action
 */
const getToolSummary = (toolName: string, args: string): string => {
  try {
    const parsed = JSON.parse(args);
    switch (toolName) {
      case 'createCell':
        return `Create ${parsed.cellType || 'code'} cell`;
      case 'updateCell':
        return `Update cell ${parsed.cellIndex}`;
      case 'deleteCell':
        return `Delete cell ${parsed.cellIndex}`;
      case 'executeCell':
        return `Execute cell ${parsed.cellIndex}`;
      case 'insertCell':
        return `Insert ${parsed.cellType || 'code'} cell at ${parsed.index}`;
      case 'writeFile':
        return `Write to ${parsed.path}`;
      case 'readFile':
        return `Read ${parsed.path}`;
      case 'listFiles':
        return `List files in ${parsed.path || '/'}`;
      case 'getCells':
        return 'Get notebook cells';
      case 'getVariables':
        return 'Get kernel variables';
      case 'inspectVariable':
        return `Inspect ${parsed.name}`;
      default:
        return toolName.replace(/([A-Z])/g, ' $1').trim();
    }
  } catch {
    return toolName.replace(/([A-Z])/g, ' $1').trim();
  }
};

/**
 * Status indicator component
 */
const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'success':
      return (
        <div className="tq-flex tq-items-center tq-gap-1">
          <svg width="14" height="14" viewBox="0 0 14 14" className="tq-text-success">
            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span className="tq-text-xs tq-text-success tq-font-medium">Done</span>
        </div>
      );
    case 'error':
      return (
        <div className="tq-flex tq-items-center tq-gap-1">
          <svg width="14" height="14" viewBox="0 0 14 14" className="tq-text-error">
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="tq-text-xs tq-text-error tq-font-medium">Failed</span>
        </div>
      );
    case 'running':
      return (
        <div className="tq-flex tq-items-center tq-gap-1">
          <svg width="14" height="14" viewBox="0 0 14 14" className="tq-text-warning tq-animate-spin-slow">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="20" strokeDashoffset="5"/>
          </svg>
          <span className="tq-text-xs tq-text-warning tq-font-medium">Running</span>
        </div>
      );
    default:
      return (
        <div className="tq-flex tq-items-center tq-gap-1">
          <div className="tq-w-2 tq-h-2 tq-rounded-full tq-bg-text-muted" />
          <span className="tq-text-xs tq-text-text-muted tq-font-medium">Pending</span>
        </div>
      );
  }
};

export const ToolCallCard: React.FC<IToolCallCardProps> = ({ execution }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toolName = execution.toolCall.function.name;
  const parameters = execution.toolCall.function.arguments;
  const summary = getToolSummary(toolName, parameters);

  return (
    <div className={cn(
      'kiro-tool-card',
      'tq-border tq-rounded-lg tq-overflow-hidden tq-transition-all',
      execution.status === 'error' 
        ? 'tq-border-error tq-bg-error-bg' 
        : 'tq-border-border-default tq-bg-bg-secondary'
    )}>
      {/* Header - always visible */}
      <div 
        className={cn(
          'tq-flex tq-items-center tq-gap-2 tq-px-3 tq-py-2 tq-cursor-pointer',
          'hover:tq-bg-bg-hover tq-transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Tool icon */}
        <ToolIcon toolName={toolName} className="tq-text-base tq-flex-shrink-0" />
        
        {/* Tool info */}
        <div className="tq-flex-1 tq-min-w-0">
          <div className="tq-text-sm tq-text-text-primary tq-font-medium tq-truncate">
            {summary}
          </div>
        </div>

        {/* Status indicator */}
        <StatusIndicator status={execution.status} />

        {/* Expand/collapse chevron */}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          className={cn(
            'tq-text-text-muted tq-transition-transform tq-flex-shrink-0',
            isExpanded && 'tq-rotate-90'
          )}
        >
          <path 
            d="M4 2l4 4-4 4" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="tq-border-t tq-border-border-default tq-bg-bg-tertiary tq-animate-slide-down">
          {/* Parameters */}
          <div className="tq-px-3 tq-py-2">
            <div className="tq-text-xs tq-font-medium tq-text-text-secondary tq-mb-1">Parameters</div>
            <pre className="tq-text-xs tq-font-mono tq-text-text-code tq-bg-bg-primary tq-p-2 tq-rounded tq-overflow-x-auto tq-m-0 tq-border tq-border-border-default">
              {formatParameters(parameters)}
            </pre>
          </div>

          {/* Result (if success) */}
          {execution.result && execution.status === 'success' && (
            <div className="tq-px-3 tq-pb-2">
              <div className="tq-text-xs tq-font-medium tq-text-text-secondary tq-mb-1">Result</div>
              <pre className="tq-text-xs tq-font-mono tq-text-text-code tq-bg-bg-primary tq-p-2 tq-rounded tq-overflow-x-auto tq-m-0 tq-border tq-border-border-default tq-max-h-48 tq-overflow-y-auto">
                {JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error (if failed) */}
          {execution.error && execution.status === 'error' && (
            <div className="tq-px-3 tq-pb-2">
              <div className="tq-text-xs tq-font-medium tq-text-error tq-mb-1">Error</div>
              <div className="tq-text-xs tq-text-error tq-bg-error-bg tq-p-2 tq-rounded tq-border tq-border-error">
                {execution.error.message}
              </div>
            </div>
          )}

          {/* Duration */}
          {execution.duration !== undefined && (
            <div className="tq-px-3 tq-pb-2 tq-flex tq-justify-end">
              <span className="tq-text-xs tq-text-text-muted tq-font-mono">
                {execution.duration < 1000
                  ? `${Math.round(execution.duration)}ms`
                  : `${(execution.duration / 1000).toFixed(2)}s`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
