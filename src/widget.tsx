/**
 * Chat widget for AI Assistant with custom chat interface
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React from 'react';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { ChatInterface } from './components/ChatInterface';

// Import CSS
import '../style/widget.css';
import '../style/chat-interface.css';
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

  /**
   * Initial conversation history
   */
  initialMessages?: IMessage[];
}

/**
 * React component for the chat interface
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  toolExecutionTracker?: ToolExecutionTracker;
  initialMessages?: IMessage[];
}> = ({ onSettingsClick, onMessageSend, toolExecutionTracker, initialMessages = [] }) => {
  const [messages, setMessages] = React.useState<IMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = React.useState(false);

  const handleSendMessage = async (content: string) => {
    if (!onMessageSend) {
      // Add demo message if no handler
      const demoMessage: IMessage = {
        role: 'assistant',
        content: 'AI Assistant is not configured. Please click the settings icon to configure your API key.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, demoMessage]);
      return;
    }

    // Add user message
    const userMessage: IMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Stream assistant response
    setIsStreaming(true);
    try {
      const stream = await onMessageSend(content);
      let assistantContent = '';

      for await (const chunk of stream) {
        assistantContent += chunk;
        // Update the last message (assistant's response) with streaming content
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = assistantContent;
          } else {
            newMessages.push({
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date()
            });
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('[ChatComponent] Error streaming response:', error);
      const errorMessage: IMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
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

      {/* Chat interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
        toolExecutionTracker={toolExecutionTracker}
      />
    </div>
  );
};

/**
 * Chat widget using ReactWidget
 */
export class ChatWidget extends ReactWidget {
  private _onSettingsClick?: () => void;
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  private _toolExecutionTracker?: ToolExecutionTracker;
  private _initialMessages?: IMessage[];

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
    this._initialMessages = options.initialMessages;
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
        initialMessages={this._initialMessages}
      />
    );
  }

  /**
   * Add a message to the conversation (for backward compatibility)
   */
  addMessage(message: IMessage): void {
    console.log('Message added:', message);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    if (this._toolExecutionTracker) {
      this._toolExecutionTracker.clear();
      console.log('[ChatWidget] Cleared tool execution history');
    }
    console.log('Clear messages');
  }

  /**
   * Get the conversation history
   */
  getMessages(): IMessage[] {
    console.log('Get messages');
    return [];
  }
}
