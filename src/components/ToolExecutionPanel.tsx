/**
 * Tool Execution Panel Component
 * 
 * Displays tool execution information including status, parameters, and results
 */

import React from 'react';
import { IToolExecutionEvent } from '../types';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import {
  sanitizeParameterValue,
  sanitizeResultValue,
  sanitizeError,
  sanitizeCodeSnippet,
  escapeHtml
} from '../utils/sanitization';
import { cn } from '../utils/classNames';

/**
 * Props for ToolExecutionPanel component
 */
export interface IToolExecutionPanelProps {
  /**
   * Tool execution event containing all execution details
   */
  execution: IToolExecutionEvent;
}

/**
 * State for ToolExecutionPanel component
 */
interface IToolExecutionPanelState {
  /**
   * Whether the parameters section is expanded
   */
  parametersExpanded: boolean;

  /**
   * Whether the result section is expanded
   */
  resultExpanded: boolean;

  /**
   * Screen reader announcement message
   */
  announcement: string;
}

/**
 * ToolExecutionPanel component
 * Displays a single tool execution with all its details
 * 
 * Memoized to prevent unnecessary re-renders when parent updates
 * but execution data hasn't changed.
 */
class ToolExecutionPanelComponent extends React.Component<
  IToolExecutionPanelProps,
  IToolExecutionPanelState
> {
  private panelRef: React.RefObject<HTMLDivElement>;
  private parametersButtonRef: React.RefObject<HTMLButtonElement>;
  private resultButtonRef: React.RefObject<HTMLButtonElement>;

  constructor(props: IToolExecutionPanelProps) {
    super(props);
    
    this.state = {
      parametersExpanded: false,
      resultExpanded: false,
      announcement: ''
    };

    this.panelRef = React.createRef();
    this.parametersButtonRef = React.createRef();
    this.resultButtonRef = React.createRef();
  }

  /**
   * Component lifecycle: After update
   * Manages focus and announcements when sections expand/collapse or status changes
   */
  componentDidUpdate(prevProps: IToolExecutionPanelProps, prevState: IToolExecutionPanelState): void {
    const { execution } = this.props;
    const toolName = execution.toolCall.function.name;

    // Announce status changes to screen readers
    if (prevProps.execution.status !== execution.status) {
      let announcement = '';
      
      switch (execution.status) {
        case 'running':
          announcement = `Tool ${toolName} is now running`;
          break;
        case 'success':
          announcement = `Tool ${toolName} completed successfully`;
          if (execution.duration) {
            announcement += ` in ${this.formatDuration(execution.duration)}`;
          }
          break;
        case 'error':
          announcement = `Tool ${toolName} failed with error: ${execution.error?.message || 'Unknown error'}`;
          break;
      }
      
      if (announcement) {
        this.setState({ announcement });
      }
    }

    // Announce section expansion/collapse
    if (prevState.parametersExpanded !== this.state.parametersExpanded) {
      const announcement = this.state.parametersExpanded
        ? 'Parameters section expanded'
        : 'Parameters section collapsed';
      this.setState({ announcement });
    }

    if (prevState.resultExpanded !== this.state.resultExpanded) {
      const announcement = this.state.resultExpanded
        ? 'Result section expanded'
        : 'Result section collapsed';
      this.setState({ announcement });
    }
  }

  /**
   * Toggle parameters section expansion
   */
  private toggleParameters = (): void => {
    this.setState(prev => {
      const newExpanded = !prev.parametersExpanded;
      
      // If collapsing, restore focus to the button
      if (!newExpanded && this.parametersButtonRef.current) {
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          this.parametersButtonRef.current?.focus();
        }, 0);
      }
      
      return { parametersExpanded: newExpanded };
    });
  };

  /**
   * Toggle result section expansion
   */
  private toggleResult = (): void => {
    this.setState(prev => {
      const newExpanded = !prev.resultExpanded;
      
      // If collapsing, restore focus to the button
      if (!newExpanded && this.resultButtonRef.current) {
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          this.resultButtonRef.current?.focus();
        }, 0);
      }
      
      return { resultExpanded: newExpanded };
    });
  };

  /**
   * Handle keyboard navigation for parameters section
   */
  private handleParametersKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    // Enter or Space to toggle
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleParameters();
    }
    
    // Escape to collapse
    if (event.key === 'Escape' && this.state.parametersExpanded) {
      event.preventDefault();
      this.setState({ parametersExpanded: false });
    }

    // Arrow Down to move to result section if available
    if (event.key === 'ArrowDown' && this.resultButtonRef.current) {
      event.preventDefault();
      this.resultButtonRef.current.focus();
    }
  };

  /**
   * Handle keyboard navigation for result section
   */
  private handleResultKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    // Enter or Space to toggle
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleResult();
    }
    
    // Escape to collapse
    if (event.key === 'Escape' && this.state.resultExpanded) {
      event.preventDefault();
      this.setState({ resultExpanded: false });
    }

    // Arrow Up to move to parameters section
    if (event.key === 'ArrowUp' && this.parametersButtonRef.current) {
      event.preventDefault();
      this.parametersButtonRef.current.focus();
    }
  };

  /**
   * Handle keyboard navigation for the panel container
   */
  private handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    // Escape to collapse all sections
    if (event.key === 'Escape') {
      const { parametersExpanded, resultExpanded } = this.state;
      if (parametersExpanded || resultExpanded) {
        event.preventDefault();
        this.setState({
          parametersExpanded: false,
          resultExpanded: false
        });
      }
    }
  };

  render(): JSX.Element {
    const { execution } = this.props;
    const { parametersExpanded, resultExpanded, announcement } = this.state;
    const toolName = execution.toolCall.function.name;
    const panelId = `tool-panel-${execution.id}`;
    const parametersId = `${panelId}-parameters`;
    const resultId = `${panelId}-result`;

    return (
      <>
        {/* Screen reader announcements */}
        <ScreenReaderAnnouncer 
          message={announcement} 
          politeness={execution.status === 'error' ? 'assertive' : 'polite'}
        />
        
        <div 
          ref={this.panelRef}
          className="tq-bg-bg-tertiary tq-border tq-border-border-default tq-rounded-md tq-overflow-hidden tq-my-2"
          onKeyDown={this.handlePanelKeyDown}
          role="region"
          aria-label={`Tool execution: ${toolName}`}
          tabIndex={-1}
        >
        {/* Tool header with icon and status badge */}
        <div className="tq-p-3 tq-bg-bg-secondary tq-flex tq-items-center tq-justify-between tq-border-b tq-border-border-default">
          <div className="tq-flex tq-items-center tq-gap-2">
            {this.renderToolIcon()}
            <span className="tq-text-text-primary tq-text-md tq-font-medium" id={`${panelId}-name`}>
              {toolName}
            </span>
          </div>
          <div className="tq-flex tq-items-center">
            {this.renderStatusBadge()}
          </div>
        </div>

        {/* Parameters section with formatting and syntax highlighting */}
        <div className="tq-border-b tq-border-border-default">
          <button
            ref={this.parametersButtonRef}
            className="tq-w-full tq-px-3 tq-py-2 tq-bg-bg-secondary tq-text-left tq-text-text-primary tq-text-sm tq-font-medium tq-flex tq-items-center tq-gap-2 tq-cursor-pointer tq-transition-colors hover:tq-bg-bg-hover"
            onClick={this.toggleParameters}
            onKeyDown={this.handleParametersKeyDown}
            aria-expanded={parametersExpanded}
            aria-controls={parametersId}
            aria-label="Toggle parameters section"
            type="button"
          >
            <span className="tq-text-text-secondary">
              {parametersExpanded ? '▼' : '▶'}
            </span>
            <span>Parameters</span>
          </button>
          {parametersExpanded && (
            <div
              id={parametersId}
              className="tq-p-3 tq-bg-bg-primary"
              role="region"
              aria-labelledby={`${panelId}-name`}
              aria-label="Tool parameters"
            >
              {this.renderParameters()}
            </div>
          )}
        </div>

        {/* Execution timer with human-readable duration */}
        <div className="tq-px-3 tq-py-2 tq-bg-bg-secondary tq-border-t tq-border-border-default">
          <div className="tq-text-xs tq-text-text-secondary" role="status" aria-live="polite">
            {this.renderTimer()}
          </div>
        </div>

        {/* Result section with formatted display */}
        {execution.result && execution.status === 'success' && (
          <div className="tq-border-t tq-border-border-default">
            <button
              ref={this.resultButtonRef}
              className="tq-w-full tq-px-3 tq-py-2 tq-bg-bg-secondary tq-text-left tq-text-text-primary tq-text-sm tq-font-medium tq-flex tq-items-center tq-gap-2 tq-cursor-pointer tq-transition-colors hover:tq-bg-bg-hover"
              onClick={this.toggleResult}
              onKeyDown={this.handleResultKeyDown}
              aria-expanded={resultExpanded}
              aria-controls={resultId}
              aria-label="Toggle result section"
              type="button"
            >
              <span className="tq-text-text-secondary">
                {resultExpanded ? '▼' : '▶'}
              </span>
              <span>Result</span>
            </button>
            {resultExpanded && (
              <div
                id={resultId}
                className="tq-p-3 tq-bg-bg-primary"
                role="region"
                aria-labelledby={`${panelId}-name`}
                aria-label="Tool result"
              >
                {this.renderResult()}
              </div>
            )}
          </div>
        )}

        {/* Error display with detailed information */}
        {execution.error && execution.status === 'error' && (
          <div className="tq-p-3 tq-bg-error-bg tq-border-t tq-border-error" role="alert" aria-live="assertive">
            {this.renderError()}
          </div>
        )}
        </div>
      </>
    );
  }

  /**
   * Render execution timer
   * Shows "Running..." while executing or duration when complete
   */
  private renderTimer(): JSX.Element {
    const { execution } = this.props;

    if (execution.status === 'pending') {
      return (
        <span className="tq-flex tq-items-center tq-gap-1 tq-text-pending">
          <span>⏱️</span>
          <span>Pending...</span>
        </span>
      );
    }

    if (execution.status === 'running') {
      return (
        <span className="tq-flex tq-items-center tq-gap-1 tq-text-warning">
          <span className="tq-animate-spin-slow">⚙️</span>
          <span>Running...</span>
        </span>
      );
    }

    if (execution.duration !== undefined) {
      const durationText = this.formatDuration(execution.duration);
      const icon = execution.status === 'success' ? '✓' : '✗';
      
      return (
        <span className={cn(
          'tq-flex tq-items-center tq-gap-1',
          execution.status === 'success' ? 'tq-text-success' : 'tq-text-error'
        )}>
          <span>{icon}</span>
          <span>Executed in {durationText}</span>
        </span>
      );
    }

    return <span></span>;
  }

  /**
   * Format duration in human-readable format
   * @param ms - Duration in milliseconds
   * @returns Formatted duration string (e.g., "45ms", "1.23s", "2m 15s")
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    }
    
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    
    // For durations over 1 minute, show minutes and seconds
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Render tool icon based on tool type
   * Maps tool names to appropriate icons
   */
  private renderToolIcon(): JSX.Element {
    const toolName = this.props.execution.toolCall.function.name;
    const iconClass = this.getToolIconClass(toolName);
    const category = this.getToolCategory(toolName);

    return (
      <span 
        className={cn(
          'tq-text-lg tq-flex tq-items-center tq-justify-center',
          iconClass
        )}
        role="img"
        aria-label={`${category} tool`}
      >
        {this.getToolIconSymbol(toolName)}
      </span>
    );
  }

  /**
   * Get tool category for accessibility
   * @param toolName - Name of the tool
   * @returns Category name
   */
  private getToolCategory(toolName: string): string {
    if (toolName.includes('Cell') || toolName.includes('cell')) {
      return 'Notebook';
    }
    if (toolName.includes('File') || toolName.includes('file') || toolName.includes('read') || toolName.includes('write')) {
      return 'File';
    }
    if (toolName.includes('get') || toolName.includes('inspect') || toolName.includes('Documentation') || toolName.includes('Completion')) {
      return 'Inspection';
    }
    return 'General';
  }

  /**
   * Get icon class for a tool
   * @param toolName - Name of the tool
   * @returns CSS class for the icon
   */
  private getToolIconClass(toolName: string): string {
    // Map tool names to categories for styling with Tailwind classes
    if (toolName.includes('Cell') || toolName.includes('cell')) {
      return 'tq-text-accent-blue';
    }
    if (toolName.includes('File') || toolName.includes('file') || toolName.includes('read') || toolName.includes('write')) {
      return 'tq-text-success';
    }
    if (toolName.includes('get') || toolName.includes('inspect') || toolName.includes('Documentation') || toolName.includes('Completion')) {
      return 'tq-text-warning';
    }
    return 'tq-text-text-secondary';
  }

  /**
   * Get icon symbol for a tool
   * @param toolName - Name of the tool
   * @returns Icon symbol (emoji or character)
   */
  private getToolIconSymbol(toolName: string): string {
    // Map tool names to icon symbols
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
      'inspectVariable': '🔍'
    };

    return iconMap[toolName] || '🔧';
  }

  /**
   * Render status badge with appropriate styling
   * Shows visual indicator for pending/running/success/error states
   */
  private renderStatusBadge(): JSX.Element {
    const { status } = this.props.execution;

    const statusConfig = {
      pending: { label: 'Pending', icon: '⏱️', className: 'tq-status-pending' },
      running: { label: 'Running', icon: '⚙️', className: 'tq-status-running' },
      success: { label: 'Success', icon: '✓', className: 'tq-status-success' },
      error: { label: 'Error', icon: '✗', className: 'tq-status-error' }
    };

    const config = statusConfig[status];

    return (
      <span 
        className={cn('tq-status-badge', config.className)}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        <span className="tq-mr-1" aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  /**
   * Render parameters with appropriate formatting
   * Handles simple values inline and complex objects as formatted JSON
   */
  private renderParameters(): JSX.Element {
    const { execution } = this.props;
    
    try {
      const args = JSON.parse(execution.toolCall.function.arguments);
      
      // Sanitize parameters to prevent XSS and protect sensitive data
      const sanitizedArgs = sanitizeParameterValue(args);
      
      // Check if parameters are simple (all primitive values)
      const isSimple = this.areParametersSimple(sanitizedArgs);
      
      if (isSimple) {
        return this.renderSimpleParameters(sanitizedArgs);
      } else {
        return this.renderComplexParameters(sanitizedArgs);
      }
    } catch (error) {
      // If parsing fails, show sanitized raw arguments
      const sanitizedRaw = escapeHtml(execution.toolCall.function.arguments);
      return (
        <div className="tq-bg-code-bg tq-p-2 tq-rounded tq-overflow-x-auto">
          <pre className="tq-text-sm tq-text-text-code tq-font-mono">{sanitizedRaw}</pre>
        </div>
      );
    }
  }

  /**
   * Check if parameters are simple (all primitive values)
   * @param args - Parsed arguments object
   * @returns True if all values are primitives
   */
  private areParametersSimple(args: Record<string, any>): boolean {
    return Object.values(args).every(value => {
      const type = typeof value;
      return type === 'string' || type === 'number' || type === 'boolean' || value === null;
    });
  }

  /**
   * Render simple parameters inline
   * @param args - Parsed arguments object
   */
  private renderSimpleParameters(args: Record<string, any>): JSX.Element {
    return (
      <div className="tq-space-y-1">
        {Object.entries(args).map(([key, value]) => (
          <div key={key} className="tq-flex tq-gap-2">
            <span className="tq-text-text-secondary tq-font-medium">{key}:</span>
            <span className="tq-text-text-primary">
              {this.formatSimpleValue(value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  /**
   * Format a simple value for display
   * @param value - Value to format (already sanitized)
   * @returns Formatted string
   */
  private formatSimpleValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') {
      // Value is already sanitized and escaped, just truncate if needed
      if (value.length > 100) {
        return `"${value.substring(0, 100)}..."`;
      }
      return `"${value}"`;
    }
    return String(value);
  }

  /**
   * Render complex parameters as formatted JSON
   * @param args - Parsed arguments object (already sanitized)
   */
  private renderComplexParameters(args: Record<string, any>): JSX.Element {
    const formatted = JSON.stringify(args, null, 2);
    
    return (
      <div className="tq-bg-code-bg tq-p-2 tq-rounded tq-overflow-x-auto">
        <pre className="tq-text-sm tq-text-text-code tq-font-mono">
          <code>{this.highlightJSON(formatted)}</code>
        </pre>
      </div>
    );
  }

  /**
   * Apply basic syntax highlighting to JSON
   * @param json - JSON string to highlight (already sanitized)
   * @returns JSX with highlighted syntax
   * 
   * Note: The JSON string is already sanitized by sanitizeParameterValue,
   * so it's safe to use dangerouslySetInnerHTML here for syntax highlighting.
   */
  private highlightJSON(json: string): JSX.Element {
    // Simple syntax highlighting using regex
    // The input is already HTML-escaped, so we need to work with escaped entities
    const highlighted = json
      .replace(/"([^"]+)":/g, '<span class="jp-json-key">"$1":</span>')
      .replace(/: "([^"]*)"/g, ': <span class="jp-json-string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="jp-json-number">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="jp-json-keyword">$1</span>');
    
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }

  /**
   * Render result with appropriate formatting
   * Handles structured data, success messages, and file content
   */
  private renderResult(): JSX.Element {
    const { result } = this.props.execution;
    
    if (!result) {
      return <div className="tq-text-text-muted tq-text-sm">No result</div>;
    }

    // Sanitize the entire result to prevent XSS and limit size
    const sanitizedResult = sanitizeResultValue(result);

    // If result has a success message, display it prominently
    if (sanitizedResult.success && sanitizedResult.data) {
      return this.renderSuccessResult(sanitizedResult.data);
    }

    // If result is just success: true with no data
    if (sanitizedResult.success && !sanitizedResult.data) {
      return (
        <div className="tq-flex tq-items-center tq-gap-2 tq-text-success">
          <span className="tq-text-lg">✓</span>
          <span>Operation completed successfully</span>
        </div>
      );
    }

    // Fallback: show raw result
    return this.renderStructuredResult(sanitizedResult);
  }

  /**
   * Render success result with data
   * @param data - Result data to display (already sanitized)
   */
  private renderSuccessResult(data: any): JSX.Element {
    // Check if data is a simple message string
    if (typeof data === 'string') {
      return (
        <div className="tq-flex tq-items-center tq-gap-2 tq-text-success">
          <span className="tq-text-lg">✓</span>
          <span>{data}</span>
        </div>
      );
    }

    // Check if data has a message property
    if (data && typeof data === 'object' && 'message' in data) {
      return (
        <div className="tq-space-y-2">
          <div className="tq-flex tq-items-center tq-gap-2 tq-text-success">
            <span className="tq-text-lg">✓</span>
            <span>{data.message}</span>
          </div>
          {Object.keys(data).length > 1 && (
            <div className="tq-mt-2">
              {this.renderStructuredResult(data)}
            </div>
          )}
        </div>
      );
    }

    // For structured data, render as formatted JSON
    return this.renderStructuredResult(data);
  }

  /**
   * Render structured data as formatted JSON
   * @param data - Data to display (already sanitized)
   */
  private renderStructuredResult(data: any): JSX.Element {
    const formatted = JSON.stringify(data, null, 2);
    
    // Check if result is lengthy (more than 20 lines)
    const lines = formatted.split('\n').length;
    const isLengthy = lines > 20;
    
    return (
      <div className="tq-bg-code-bg tq-p-2 tq-rounded tq-overflow-x-auto">
        <pre className="tq-text-sm tq-text-text-code tq-font-mono">
          <code>{this.highlightJSON(formatted)}</code>
        </pre>
        {isLengthy && (
          <div className="tq-text-xs tq-text-text-muted tq-mt-2">
            {lines} lines
          </div>
        )}
      </div>
    );
  }

  /**
   * Render error display with detailed information
   * Shows error type, message, and actionable suggestions
   */
  private renderError(): JSX.Element {
    const { error } = this.props.execution;
    
    if (!error) {
      return <div></div>;
    }

    // Sanitize error to remove sensitive paths, API keys, and escape HTML
    const sanitizedError = sanitizeError(error);

    const errorType = sanitizedError.type || 'Error';
    const errorMessage = sanitizedError.message || 'An unknown error occurred';
    
    return (
      <div className="tq-space-y-2" role="alert">
        <div className="tq-flex tq-items-center tq-gap-2">
          <span className="tq-text-lg tq-text-error" aria-hidden="true">✗</span>
          <span className="tq-text-error tq-font-semibold" role="heading" aria-level={3}>{errorType}</span>
        </div>
        
        <div className="tq-text-text-primary tq-text-sm" aria-label="Error message">
          {errorMessage}
        </div>

        {this.renderErrorSuggestions(errorType, errorMessage)}

        {sanitizedError.stack && (
          <details className="tq-mt-2">
            <summary 
              className="tq-text-sm tq-text-text-secondary tq-cursor-pointer hover:tq-text-text-primary tq-transition-colors"
              aria-label="Show stack trace"
            >
              Stack Trace
            </summary>
            <pre 
              className="tq-mt-2 tq-bg-code-bg tq-p-2 tq-rounded tq-text-xs tq-text-text-code tq-font-mono tq-overflow-x-auto"
              role="log"
              aria-label="Error stack trace"
            >
              {sanitizedError.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }

  /**
   * Render actionable error suggestions based on error type
   * @param errorType - Type of error
   * @param errorMessage - Error message
   */
  private renderErrorSuggestions(errorType: string, errorMessage: string): JSX.Element | null {
    const suggestions: string[] = [];

    // Detect common error patterns and provide suggestions
    if (errorType === 'ParseError' || errorMessage.includes('parse') || errorMessage.includes('JSON')) {
      suggestions.push('Check that the tool parameters are valid JSON');
      suggestions.push('Ensure all strings are properly quoted');
    }

    if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
      suggestions.push('Verify that the resource exists');
      suggestions.push('Check the spelling of names and paths');
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('denied')) {
      suggestions.push('Check file or resource permissions');
      suggestions.push('Ensure you have the necessary access rights');
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('required')) {
      suggestions.push('Review the required parameters for this tool');
      suggestions.push('Ensure all required fields are provided');
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      suggestions.push('The operation took too long to complete');
      suggestions.push('Try again or check system resources');
    }

    if (suggestions.length === 0) {
      return null;
    }

    return (
      <div className="tq-mt-2 tq-p-2 tq-bg-warning-bg tq-rounded tq-border tq-border-warning" role="complementary" aria-label="Error suggestions">
        <div className="tq-text-sm tq-font-semibold tq-text-warning tq-mb-1" role="heading" aria-level={4}>Suggestions:</div>
        <ul className="tq-list-disc tq-list-inside tq-space-y-1 tq-text-sm tq-text-text-primary" aria-label="List of suggestions to resolve the error">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

/**
 * Custom comparison function for React.memo
 * Only re-render if execution status, result, or error changes
 * 
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @returns True if props are equal (skip re-render), false otherwise
 */
function arePropsEqual(
  prevProps: IToolExecutionPanelProps,
  nextProps: IToolExecutionPanelProps
): boolean {
  const prevExec = prevProps.execution;
  const nextExec = nextProps.execution;

  // If execution IDs differ, definitely re-render
  if (prevExec.id !== nextExec.id) {
    return false;
  }

  // Check if status changed
  if (prevExec.status !== nextExec.status) {
    return false;
  }

  // Check if duration changed (indicates completion)
  if (prevExec.duration !== nextExec.duration) {
    return false;
  }

  // Check if result changed (deep comparison not needed - reference check is sufficient)
  if (prevExec.result !== nextExec.result) {
    return false;
  }

  // Check if error changed
  if (prevExec.error !== nextExec.error) {
    return false;
  }

  // Props are equal, skip re-render
  return true;
}

/**
 * Memoized ToolExecutionPanel component
 * Prevents unnecessary re-renders when execution data hasn't changed
 */
export const ToolExecutionPanel = React.memo(
  ToolExecutionPanelComponent,
  arePropsEqual
);
