/**
 * Tool Approval Card Component - Kiro Style
 * 
 * Shows pending tool calls that need user approval when autopilot is OFF
 * User can approve, reject, or approve all pending actions
 */

import React from 'react';
import { IToolCall, IToolExecutionEvent } from '../types';
import { cn } from '../utils/classNames';
import { ToolIcon } from './ToolIcon';

export interface IToolApprovalCardProps {
  /**
   * Pending tool calls awaiting approval
   */
  pendingTools: IToolCall[];

  /**
   * Callback when user approves a tool
   */
  onApprove: (toolCallId: string) => void;

  /**
   * Callback when user rejects a tool
   */
  onReject: (toolCallId: string) => void;

  /**
   * Callback when user approves all pending tools
   */
  onApproveAll: () => void;

  /**
   * Callback when user rejects all pending tools
   */
  onRejectAll: () => void;

  /**
   * Whether actions are being processed
   */
  isProcessing?: boolean;
}

/**
 * Format tool arguments for display
 */
const formatArguments = (args: string): Record<string, any> => {
  try {
    return JSON.parse(args);
  } catch {
    return { raw: args };
  }
};

/**
 * Get a summary of the tool action
 */
const getToolSummary = (toolCall: IToolCall): string => {
  const args = formatArguments(toolCall.function.arguments);
  const name = toolCall.function.name;

  switch (name) {
    case 'createCell':
      return `Create ${args.cellType || 'code'} cell`;
    case 'updateCell':
      return `Update cell ${args.cellIndex}`;
    case 'deleteCell':
      return `Delete cell ${args.cellIndex}`;
    case 'executeCell':
      return `Execute cell ${args.cellIndex}`;
    case 'writeFile':
      return `Write to ${args.path}`;
    case 'readFile':
      return `Read ${args.path}`;
    case 'insertCell':
      return `Insert ${args.cellType || 'code'} cell at ${args.index}`;
    default:
      return name.replace(/([A-Z])/g, ' $1').trim();
  }
};

/**
 * Single tool approval item
 */
const ToolApprovalItem: React.FC<{
  toolCall: IToolCall;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}> = ({ toolCall, onApprove, onReject, isProcessing }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const args = formatArguments(toolCall.function.arguments);

  return (
    <div className="kiro-approval-item tq-border tq-border-border-default tq-rounded-md tq-bg-bg-secondary tq-overflow-hidden">
      {/* Header */}
      <div 
        className="tq-flex tq-items-center tq-gap-2 tq-p-3 tq-cursor-pointer hover:tq-bg-bg-hover tq-transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ToolIcon toolName={toolCall.function.name} className="tq-text-base" />
        
        <div className="tq-flex-1 tq-min-w-0">
          <div className="tq-text-sm tq-font-medium tq-text-text-primary tq-truncate">
            {getToolSummary(toolCall)}
          </div>
          <div className="tq-text-xs tq-text-text-muted tq-font-mono">
            {toolCall.function.name}
          </div>
        </div>

        {/* Expand/collapse indicator */}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          className={cn(
            'tq-text-text-muted tq-transition-transform',
            isExpanded && 'tq-rotate-90'
          )}
        >
          <path 
            d="M4 2L8 6L4 10" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="tq-px-3 tq-pb-3 tq-border-t tq-border-border-default tq-bg-bg-tertiary">
          <div className="tq-pt-2">
            <div className="tq-text-xs tq-font-medium tq-text-text-secondary tq-mb-1">Parameters</div>
            <pre className="tq-text-xs tq-font-mono tq-text-text-code tq-bg-bg-primary tq-p-2 tq-rounded tq-overflow-x-auto tq-m-0">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="tq-flex tq-items-center tq-gap-2 tq-px-3 tq-py-2 tq-border-t tq-border-border-default tq-bg-bg-tertiary">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          disabled={isProcessing}
          className={cn(
            'kiro-btn-approve',
            'tq-flex tq-items-center tq-gap-1 tq-px-3 tq-py-1.5 tq-rounded-md',
            'tq-text-xs tq-font-medium tq-transition-all',
            'tq-bg-accent-green tq-text-white',
            'hover:tq-bg-accent-green-hover',
            'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Approve
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          disabled={isProcessing}
          className={cn(
            'kiro-btn-reject',
            'tq-flex tq-items-center tq-gap-1 tq-px-3 tq-py-1.5 tq-rounded-md',
            'tq-text-xs tq-font-medium tq-transition-all',
            'tq-bg-transparent tq-text-text-secondary tq-border tq-border-border-default',
            'hover:tq-bg-bg-hover hover:tq-text-error hover:tq-border-error',
            'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Reject
        </button>
      </div>
    </div>
  );
};

/**
 * ToolApprovalCard component - Kiro style
 * Shows all pending tools that need approval
 */
export const ToolApprovalCard: React.FC<IToolApprovalCardProps> = ({
  pendingTools,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  isProcessing = false
}) => {
  if (pendingTools.length === 0) {
    return null;
  }

  return (
    <div className="kiro-approval-card tq-bg-bg-primary tq-border tq-border-warning tq-rounded-lg tq-overflow-hidden tq-my-2 tq-animate-fade-in">
      {/* Header */}
      <div className="tq-flex tq-items-center tq-justify-between tq-px-4 tq-py-3 tq-bg-warning-bg tq-border-b tq-border-warning">
        <div className="tq-flex tq-items-center tq-gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" className="tq-text-warning">
            <path 
              d="M8 1L1 14h14L8 1z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              fill="none"
            />
            <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
          </svg>
          <span className="tq-text-sm tq-font-semibold tq-text-warning">
            {pendingTools.length} action{pendingTools.length > 1 ? 's' : ''} pending approval
          </span>
        </div>

        {/* Bulk actions */}
        {pendingTools.length > 1 && (
          <div className="tq-flex tq-items-center tq-gap-2">
            <button
              onClick={onApproveAll}
              disabled={isProcessing}
              className={cn(
                'tq-text-xs tq-font-medium tq-px-2 tq-py-1 tq-rounded',
                'tq-bg-accent-green tq-text-white',
                'hover:tq-bg-accent-green-hover',
                'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
              )}
            >
              Approve All
            </button>
            <button
              onClick={onRejectAll}
              disabled={isProcessing}
              className={cn(
                'tq-text-xs tq-font-medium tq-px-2 tq-py-1 tq-rounded',
                'tq-bg-transparent tq-text-text-secondary tq-border tq-border-border-default',
                'hover:tq-bg-bg-hover hover:tq-text-error',
                'disabled:tq-opacity-50 disabled:tq-cursor-not-allowed'
              )}
            >
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Tool list */}
      <div className="tq-p-3 tq-space-y-2">
        {pendingTools.map((tool) => (
          <ToolApprovalItem
            key={tool.id}
            toolCall={tool}
            onApprove={() => onApprove(tool.id)}
            onReject={() => onReject(tool.id)}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </div>
  );
};
