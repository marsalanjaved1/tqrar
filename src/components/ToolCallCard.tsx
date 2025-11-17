/**
 * Tool Call Card Component - Tqrar Style
 * Expandable/collapsible tool call display with formatted parameters
 */

import React from 'react';
import { IToolExecutionEvent } from '../types';

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
    <div className={`jp-ToolCallCard ${isExpanded ? 'jp-ToolCallCard-expanded' : ''}`}>
      <div className="jp-ToolCallCard-header" onClick={toggleExpanded}>
        <div className="jp-ToolCallCard-title">
          <span className="jp-ToolCallCard-icon">{getToolIcon(toolName)}</span>
          <span className="jp-ToolCallCard-name">{toolName}</span>
          <span className={`jp-ToolCallCard-status jp-ToolCallCard-status-${statusColor}`}>
            {execution.status}
          </span>
        </div>
        <span className="jp-ToolCallCard-expandIcon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="jp-ToolCallCard-body">
          <div className="jp-ToolCallCard-section">
            <div className="jp-ToolCallCard-sectionTitle">Parameters:</div>
            <pre className="jp-ToolCallCard-parameters">
              <code>{formatParameters(parameters)}</code>
            </pre>
          </div>

          {execution.result && execution.status === 'success' && (
            <div className="jp-ToolCallCard-section">
              <div className="jp-ToolCallCard-sectionTitle">Result:</div>
              <pre className="jp-ToolCallCard-result">
                <code>{JSON.stringify(execution.result, null, 2)}</code>
              </pre>
            </div>
          )}

          {execution.error && execution.status === 'error' && (
            <div className="jp-ToolCallCard-section">
              <div className="jp-ToolCallCard-sectionTitle">Error:</div>
              <div className="jp-ToolCallCard-error">
                {execution.error.message}
              </div>
            </div>
          )}

          {execution.duration !== undefined && (
            <div className="jp-ToolCallCard-footer">
              <span className="jp-ToolCallCard-duration">
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
