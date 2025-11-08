/**
 * Chat widget for AI Assistant using Assistant UI library
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React from 'react';
import { AssistantRuntimeProvider, Thread, useLocalRuntime } from '@assistant-ui/react';
import type { ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult } from '@assistant-ui/react';

// Import CSS
import '../style/widget.css';

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
}

/**
 * Custom chat adapter for Assistant UI
 * Handles streaming responses from the LLM and integrates with JupyterLab
 */
class JupyterLabChatAdapter implements ChatModelAdapter {
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;

  constructor(onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>) {
    this._onMessageSend = onMessageSend;
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
 * React component for the chat interface
 * Integrates Assistant UI with JupyterLab theming and layout
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
}> = ({ onSettingsClick, onMessageSend }) => {
  // Create the runtime with our custom adapter
  const runtime = useLocalRuntime(
    new JupyterLabChatAdapter(onMessageSend)
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

        {/* Assistant UI Thread component - handles message display and input */}
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
  }

  /**
   * Render the React component
   */
  render(): JSX.Element {
    return (
      <ChatComponent
        onSettingsClick={this._onSettingsClick}
        onMessageSend={this._onMessageSend}
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

