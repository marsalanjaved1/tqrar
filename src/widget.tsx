/**
 * Chat widget for AI Assistant using Assistant UI library
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React from 'react';
import {
  AssistantRuntimeProvider,
  Thread,
  useLocalRuntime,
  makeAssistantToolUI,
  AssistantMessage
} from '@assistant-ui/react';
import type { ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult } from '@assistant-ui/react';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { ToolExecutionPanel } from './components/ToolExecutionPanel';

// Import CSS
import '../style/widget.css';
import '../style/tool-execution.css';

/**
 * Options for creating a ChatWidget
 */
export interface IChatWidgetOptions {
  /**
   * Callback when settings button is clicked
   */
  onSettingsClick?: () => void;

  /**
   * Callback when a message is sent - returns an async generator for streaming
   */
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;

  /**
   * RenderMime registry for rendering rich content
   */
  rendermime?: IRenderMimeRegistry;

  /**
   * Tool execution tracker for monitoring tool calls
   */
  toolExecutionTracker?: ToolExecutionTracker;
}

/**
 * Custom chat adapter for Assistant UI
 * Handles streaming responses from the LLM and integrates with JupyterLab
 */
class JupyterLabChatAdapter implements ChatModelAdapter {
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  private _toolExecutionTracker?: ToolExecutionTracker;

  constructor(onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>, toolExecutionTracker?: ToolExecutionTracker) {
    this._onMessageSend = onMessageSend;
    this._toolExecutionTracker = toolExecutionTracker;
  }

  /**
   * Run the chat model with streaming support
   * This method is called by Assistant UI when a user sends a message
   */
  async *run(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    const { messages, abortSignal } = options;

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return;
    }

    // Extract text content from the message
    const content = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : lastMessage.content.map(c => c.type === 'text' ? c.text : '').join('');

    if (!this._onMessageSend) {
      // Demo response if no handler is set
      yield {
        content: [
          {
            type: 'text' as const,
            text: 'AI Assistant is not configured. Please click the settings icon to configure your API key.'
          }
        ]
      };
      return;
    }

    try {
      // Track active tool executions during this message
      const activeToolExecutions: string[] = [];

      // Listen for tool executions that start during this message
      const handleToolStart = (event: import('./types').IToolExecutionEvent) => {
        console.log('[JupyterLabChatAdapter] Tool execution started:', event.toolCall.function.name, event.id);
        activeToolExecutions.push(event.id);
      };

      if (this._toolExecutionTracker) {
        console.log('[JupyterLabChatAdapter] Setting up tool execution listener');
        this._toolExecutionTracker.on('execution:start', handleToolStart);
      } else {
        console.log('[JupyterLabChatAdapter] No tool execution tracker available');
      }

      // Get the streaming response from the conversation manager
      const stream = await this._onMessageSend(content);

      // Stream the response incrementally
      let fullText = '';
      for await (const chunk of stream) {
        // Check if the request was aborted
        if (abortSignal?.aborted) {
          break;
        }

        // Accumulate the text
        fullText += chunk;

        // Yield the updated content
        yield {
          content: [
            {
              type: 'text' as const,
              text: fullText
            }
          ]
        };
      }

      console.log('[JupyterLabChatAdapter] Streaming complete. Active tool executions:', activeToolExecutions.length);

      // Clean up listener
      if (this._toolExecutionTracker) {
        this._toolExecutionTracker.off('execution:start', handleToolStart);
      }

      // After streaming completes, add tool execution summaries to the message
      if (activeToolExecutions.length > 0 && this._toolExecutionTracker) {
        console.log('[JupyterLabChatAdapter] Adding tool summaries for', activeToolExecutions.length, 'executions');
        let toolSummary = '\n\n**Tools Used:**';
        for (const execId of activeToolExecutions) {
          const execution = this._toolExecutionTracker.getExecution(execId);
          console.log('[JupyterLabChatAdapter] Execution', execId, ':', execution?.status);
          if (execution) {
            const status = execution.status === 'success' ? '✓' : execution.status === 'error' ? '✗' : '⚙️';
            const duration = execution.duration ? ` (${(execution.duration / 1000).toFixed(2)}s)` : '';
            toolSummary += `\n- ${status} ${execution.toolCall.function.name}${duration}`;
          }
        }

        fullText += toolSummary;
        console.log('[JupyterLabChatAdapter] Final text with tool summary:', fullText.substring(Math.max(0, fullText.length - 200)));

        yield {
          content: [
            {
              type: 'text' as const,
              text: fullText
            }
          ]
        };
      }
    } catch (error) {
      // Handle errors gracefully
      console.error('[AI Assistant] Error in streaming response:', error);
      yield {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
          }
        ]
      };
    }
  }
}

/**
 * Tool execution context provider
 * Makes tool execution tracker available to child components
 */
const ToolExecutionContext = React.createContext<ToolExecutionTracker | undefined>(undefined);

/**
 * Hook to access tool execution tracker
 */
const useToolExecutionTracker = () => {
  return React.useContext(ToolExecutionContext);
};

/**
 * Custom tool UI component that renders inline with messages
 * This integrates with Assistant UI's tool rendering system
 */
const InlineToolUI: React.FC<{ toolName: string; toolCallId: string }> = ({ toolName, toolCallId }) => {
  const tracker = useToolExecutionTracker();
  const [execution, setExecution] = React.useState<import('./types').IToolExecutionEvent | null>(null);

  // Find the execution for this tool call
  React.useEffect(() => {
    if (!tracker) {
      console.log('[InlineToolUI] No tracker available');
      return;
    }

    console.log('[InlineToolUI] Looking for execution with toolCallId:', toolCallId);

    // Find execution by tool call ID using the new method
    const findExecution = () => {
      const found = tracker.getExecutionByToolCallId(toolCallId);
      if (found) {
        console.log('[InlineToolUI] Found execution:', found.id, found.status);
        setExecution(found);
      } else {
        console.log('[InlineToolUI] No execution found for toolCallId:', toolCallId);
      }
    };

    // Initial search
    findExecution();

    // Listen for updates
    const handleUpdate = (event: import('./types').IToolExecutionEvent) => {
      if (event.toolCall.id === toolCallId) {
        console.log('[InlineToolUI] Received update for toolCallId:', toolCallId, event.status);
        setExecution(event);
      }
    };

    tracker.on('execution:start', handleUpdate);
    tracker.on('execution:update', handleUpdate);
    tracker.on('execution:complete', handleUpdate);
    tracker.on('execution:error', handleUpdate);

    return () => {
      tracker.off('execution:start', handleUpdate);
      tracker.off('execution:update', handleUpdate);
      tracker.off('execution:complete', handleUpdate);
      tracker.off('execution:error', handleUpdate);
    };
  }, [tracker, toolCallId]);

  if (!execution) {
    console.log('[InlineToolUI] No execution to render for toolCallId:', toolCallId);
    return null;
  }

  console.log('[InlineToolUI] Rendering execution:', execution.id);
  return <ToolExecutionPanel execution={execution} />;
};

/**
 * React component for the chat interface
 * Integrates Assistant UI with JupyterLab theming and layout
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  toolExecutionTracker?: ToolExecutionTracker;
}> = ({ onSettingsClick, onMessageSend, toolExecutionTracker }) => {
  // Create the runtime with our custom adapter
  const runtime = useLocalRuntime(
    new JupyterLabChatAdapter(onMessageSend, toolExecutionTracker)
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="jp-AIAssistant-container">
        {/* Header with settings button */}
        <div className="jp-AIAssistant-header">
          <div className="jp-AIAssistant-title">AI Assistant</div>
          <button
            className="jp-AIAssistant-settings-button jp-Button"
            title="Configure AI Assistant Settings"
            onClick={() => onSettingsClick?.()}
            dangerouslySetInnerHTML={{ __html: settingsIcon.svgstr }}
          />
        </div>

        {/* Assistant UI Thread component */}
        <div className="jp-AIAssistant-thread-container">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};

/**
 * Chat widget using ReactWidget and Assistant UI
 */
export class ChatWidget extends ReactWidget {
  private _onSettingsClick?: () => void;
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  private _toolExecutionTracker?: ToolExecutionTracker;

  /**
   * Construct a new chat widget
   */
  constructor(options: IChatWidgetOptions = {}) {
    super();

    this.addClass('jp-AIAssistant');
    this.id = 'ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;

    this._onSettingsClick = options.onSettingsClick;
    this._onMessageSend = options.onMessageSend;
    this._toolExecutionTracker = options.toolExecutionTracker;
  }

  /**
   * Render the React component
   */
  render(): JSX.Element {
    return (
      <ChatComponent
        onSettingsClick={this._onSettingsClick}
        onMessageSend={this._onMessageSend}
        toolExecutionTracker={this._toolExecutionTracker}
      />
    );
  }

  /**
   * Add a message to the conversation (for backward compatibility)
   * Note: With Assistant UI, messages are managed by the runtime
   */
  addMessage(message: IMessage): void {
    // This method is kept for backward compatibility
    // In the new implementation, messages are managed by Assistant UI runtime
    console.log('Message added (managed by Assistant UI):', message);
  }

  /**
   * Clear all messages (for backward compatibility)
   */
  clear(): void {
    // Clear tool execution history when conversation is cleared
    if (this._toolExecutionTracker) {
      this._toolExecutionTracker.clear();
      console.log('[ChatWidget] Cleared tool execution history');
    }

    // This would need to be implemented by resetting the runtime
    console.log('Clear messages (to be implemented with runtime reset)');
  }

  /**
   * Get the conversation history (for backward compatibility)
   */
  getMessages(): IMessage[] {
    // This would need to be implemented by accessing the runtime state
    console.log('Get messages (to be implemented with runtime state access)');
    return [];
  }
}

