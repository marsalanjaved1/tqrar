/**
 * Chat widget for AI Assistant using Assistant UI library
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React from 'react';
import { AssistantRuntimeProvider, useLocalRuntime, Thread } from '@assistant-ui/react';
import type { ChatModelAdapter, ChatModelRunOptions, ChatModelRunResult } from '@assistant-ui/react';

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
 */
class JupyterLabChatAdapter implements ChatModelAdapter {
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;

  constructor(onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>) {
    this._onMessageSend = onMessageSend;
  }

  async *run(options: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    console.log('[KIRO_AI_ASSISTANT] Adapter.run() called');
    const { messages, abortSignal } = options;
    console.log('[KIRO_AI_ASSISTANT] Messages:', messages);
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      console.log('[KIRO_AI_ASSISTANT] No user message found');
      return;
    }

    const content = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : lastMessage.content.map(c => c.type === 'text' ? c.text : '').join('');
    
    console.log('[KIRO_AI_ASSISTANT] User message content:', content);

    if (!this._onMessageSend) {
      console.log('[KIRO_AI_ASSISTANT] No message handler, returning demo response');
      // Demo response if no handler is set
      return {
        content: [
          {
            type: 'text' as const,
            text: 'This is a demo response. Configure the message handler to enable AI responses.'
          }
        ]
      };
    }

    try {
      console.log('[KIRO_AI_ASSISTANT] Getting streaming response');
      // Get the streaming response
      const stream = await this._onMessageSend(content);

      // Accumulate the full response
      let fullText = '';
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          console.log('[KIRO_AI_ASSISTANT] Stream aborted');
          break;
        }
        fullText += chunk;
        console.log('[KIRO_AI_ASSISTANT] Yielding chunk, total length:', fullText.length);
        // Yield incremental updates
        yield {
          content: [
            {
              type: 'text' as const,
              text: fullText
            }
          ]
        };
      }
      console.log('[KIRO_AI_ASSISTANT] Stream complete');
    } catch (error) {
      console.error('[KIRO_AI_ASSISTANT] Error in stream:', error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ]
      };
    }
  }
}

/**
 * React component for the chat interface
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
}> = ({ onSettingsClick, onMessageSend }) => {
  console.log('[KIRO_AI_ASSISTANT] ChatComponent rendering');
  console.log('[KIRO_AI_ASSISTANT] onSettingsClick:', !!onSettingsClick);
  console.log('[KIRO_AI_ASSISTANT] onMessageSend:', !!onMessageSend);
  
  const runtime = useLocalRuntime(
    new JupyterLabChatAdapter(onMessageSend)
  );
  
  console.log('[KIRO_AI_ASSISTANT] Runtime created:', runtime);

  React.useEffect(() => {
    console.log('[KIRO_AI_ASSISTANT] Component mounted');
    return () => {
      console.log('[KIRO_AI_ASSISTANT] Component unmounting');
    };
  }, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="jp-AIAssistant-container" data-kiro-debug="ai-assistant-container">
        {/* Header with settings button */}
        <div className="jp-AIAssistant-header" data-kiro-debug="header">
          <div className="jp-AIAssistant-title">AI Assistant</div>
          <button
            className="jp-AIAssistant-settings-button jp-Button"
            title="Configure AI Assistant Settings"
            onClick={() => {
              console.log('[KIRO_AI_ASSISTANT] Settings button clicked');
              onSettingsClick?.();
            }}
            dangerouslySetInnerHTML={{ __html: settingsIcon.svgstr }}
          />
        </div>

        {/* Assistant UI Thread component */}
        <div className="jp-AIAssistant-thread-container" data-kiro-debug="thread-container">
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
    console.log('[KIRO_AI_ASSISTANT] ChatWidget constructor called');
    console.log('[KIRO_AI_ASSISTANT] Options:', options);
    
    this.addClass('jp-AIAssistant');
    this.id = 'ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;

    this._onSettingsClick = options.onSettingsClick;
    this._onMessageSend = options.onMessageSend;
    
    console.log('[KIRO_AI_ASSISTANT] ChatWidget initialized');
  }

  /**
   * Render the React component
   */
  render(): JSX.Element {
    console.log('[KIRO_AI_ASSISTANT] ChatWidget.render() called');
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

