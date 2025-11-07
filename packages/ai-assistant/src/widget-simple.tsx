/**
 * Simple chat widget implementation with inline styles
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React, { useState, useRef, useEffect } from 'react';

export interface IChatWidgetOptions {
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  rendermime?: IRenderMimeRegistry;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
}> = ({ onSettingsClick, onMessageSend }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (onMessageSend) {
        const stream = await onMessageSend(input);
        let fullText = '';
        
        // Add empty assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        for await (const chunk of stream) {
          fullText += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'assistant', content: fullText };
            return newMessages;
          });
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: 'var(--jp-layout-color1)',
      color: 'var(--jp-ui-font-color1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--jp-border-color1)',
        background: 'var(--jp-layout-color2)',
        flexShrink: 0
      }}>
        <div style={{ 
          fontSize: 'var(--jp-ui-font-size1)', 
          fontWeight: 600
        }}>AI Assistant</div>
        <button
          onClick={onSettingsClick}
          title="Configure AI Assistant Settings"
          dangerouslySetInnerHTML={{ __html: settingsIcon.svgstr }}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        />
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '8px',
              background: msg.role === 'user' 
                ? 'var(--jp-brand-color1)' 
                : 'var(--jp-layout-color2)',
              color: msg.role === 'user'
                ? 'var(--jp-ui-inverse-font-color1)'
                : 'var(--jp-ui-font-color1)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{ 
            alignSelf: 'flex-start',
            padding: '12px 16px',
            color: 'var(--jp-ui-font-color2)'
          }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        padding: '12px 16px',
        borderTop: '1px solid var(--jp-border-color1)',
        background: 'var(--jp-layout-color1)'
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask me anything..."
          disabled={isLoading}
          style={{
            flex: 1,
            minHeight: '40px',
            maxHeight: '120px',
            padding: '8px 12px',
            border: '1px solid var(--jp-border-color1)',
            borderRadius: '4px',
            background: 'var(--jp-input-background)',
            color: 'var(--jp-ui-font-color1)',
            fontFamily: 'var(--jp-ui-font-family)',
            fontSize: 'var(--jp-ui-font-size1)',
            resize: 'vertical'
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '8px 16px',
            background: 'var(--jp-brand-color1)',
            color: 'var(--jp-ui-inverse-font-color1)',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 500,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !input.trim() ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export class ChatWidget extends ReactWidget {
  private _onSettingsClick?: () => void;
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;

  constructor(options: IChatWidgetOptions = {}) {
    super();
    this.addClass('jp-AIAssistant');
    this.id = 'ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;

    this._onSettingsClick = options.onSettingsClick;
    this._onMessageSend = options.onMessageSend;
  }

  render(): JSX.Element {
    return (
      <ChatComponent
        onSettingsClick={this._onSettingsClick}
        onMessageSend={this._onMessageSend}
      />
    );
  }

  addMessage(message: IMessage): void {
    console.log('Message added (managed by React state):', message);
  }

  clear(): void {
    console.log('Clear messages (to be implemented with state reset)');
  }

  getMessages(): IMessage[] {
    console.log('Get messages (to be implemented with state access)');
    return [];
  }
}
