/**
 * Tool Call Card Component - Tqrar Style
 * Expandable/collapsible tool call display with formatted parameters
 */

import React from 'react';
import { IToolExecutionEvent } from '../types';
import { cn } from '../utils/classNames';

export interface IToolCallCardProps {
  execution: IToolExecutionEvent;
}

export const ToolCallCard: React.FC<IToolCallCardProps> = ({ execution }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getToolIcon = (toolName: string): string => {
    const iconMap: Record<string, string> = {
      'createCell': '📝',
      'updateCell': '✏️',
      'deleteCell': '🗑️',
      'getCells': '📋',
      'readFile': '📄',
      'writeFile': '💾',
      'listFiles': '📁',
      'getCompletions': '💡',
      'getDocumentation': '📖',
      'executeCell': '▶️',
      'inspectVariable': '🔍',
      'readCellError': '🐛',
      'analyzeError': '🔍',
      'getVariables': '📊',
      'insertCell': '➕',
      'readDataFrame': '📊',
      'describeData': '📈',
      'plotData': '📊'
    };
    return iconMap[toolName] || '⚡';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'running';
      default:
        return 'pending';
    }
  };

  const formatParameters = (args: string): string => {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return args;
    }
  };

  const toolName = execution.toolCall.function.name;
  const parameters = execution.toolCall.function.arguments;
  const statusColor = getStatusColor(execution.status);

  return (
    <div className="tq-tool-card">
      <div className="tq-tool-card-header" onClick={toggleExpanded}>
        <div className="tq-flex tq-items-center tq-gap-2 tq-flex-1">
          <span className="tq-text-base">{getToolIcon(toolName)}</span>
          <span className="tq-text-code tq-font-mono tq-font-medium">{toolName}</span>
          <span className={cn(
            'tq-status-badge',
            statusColor === 'success' && 'tq-status-success',
            statusColor === 'error' && 'tq-status-error',
            statusColor === 'running' && 'tq-status-running',
            statusColor === 'pending' && 'tq-status-pending'
          )}>
            {execution.status}
          </span>
        </div>
        <span className="tq-text-text-secondary tq-text-xs tq-transition-transform" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▼
        </span>
      </div>

      {isExpanded && (
        <div className="tq-p-3 tq-bg-bg-tertiary tq-animate-slide-down">
          <div className="tq-mb-3">
            <div className="tq-text-xs tq-font-semibold tq-text-text-secondary tq-mb-1.5">Parameters:</div>
            <pre className="tq-bg-code-bg tq-border tq-border-border-default tq-rounded tq-p-2 tq-m-0 tq-overflow-x-auto tq-font-mono tq-text-sm tq-leading-relaxed tq-text-text-code">
              <code>{formatParameters(parameters)}</code>
            </pre>
          </div>

          {execution.result && execution.status === 'success' && (
            <div className="tq-mb-3">
              <div className="tq-text-xs tq-font-semibold tq-text-text-secondary tq-mb-1.5">Result:</div>
              <pre className="tq-bg-code-bg tq-border tq-border-border-default tq-rounded tq-p-2 tq-m-0 tq-overflow-x-auto tq-font-mono tq-text-sm tq-leading-relaxed tq-text-text-code">
                <code>{JSON.stringify(execution.result, null, 2)}</code>
              </pre>
            </div>
          )}

          {execution.error && execution.status === 'error' && (
            <div className="tq-mb-3">
              <div className="tq-text-xs tq-font-semibold tq-text-text-secondary tq-mb-1.5">Error:</div>
              <div className="tq-bg-error-bg tq-border tq-border-error tq-rounded tq-p-2 tq-text-error tq-text-sm tq-leading-relaxed">
                {execution.error.message}
              </div>
            </div>
          )}

          {execution.duration !== undefined && (
            <div className="tq-mt-2 tq-pt-2 tq-border-t tq-border-border-default tq-flex tq-justify-end">
              <span className="tq-text-xs tq-text-text-secondary tq-font-mono">
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
