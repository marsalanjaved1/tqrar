/**
 * Custom Chat Interface Component
 * Simple, clean chat UI with inline tool execution display
 */

import React from 'react';
import { IMessage } from '../types';
import { ToolCallCard } from './ToolCallCard';
import { ToolExecutionTracker } from '../tools/ToolExecutionTracker';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import { InputArea } from './InputArea';
import type { IToolExecutionEvent } from '../types';

export interface IChatInterfaceProps {
  messages: IMessage[];
  onSendMessage: (content: string) => void;
  isStreaming: boolean;
  toolExecutionTracker?: ToolExecutionTracker;
}

// Map to track which tool executions belong to which message
interface MessageWithTools extends IMessage {
  toolExecutions?: IToolExecutionEvent[];
}

export const ChatInterface: React.FC<IChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  toolExecutionTracker
}) => {
  const [inputValue, setInputValue] = React.useState('');
  // Map of message index to tool executions
  const [messageTools, setMessageTools] = React.useState<Map<number, IToolExecutionEvent[]>>(new Map());
  // Map of message index to content length when first tool started
  const [contentBeforeTools, setContentBeforeTools] = React.useState<Map<number, number>>(new Map());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const currentMessageIndexRef = React.useRef<number>(-1);
  const messagesRef = React.useRef<IMessage[]>(messages);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep messages ref in sync
  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Update current message index when messages change
  React.useEffect(() => {
    if (isStreaming) {
      // Find the last assistant message index
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          currentMessageIndexRef.current = i;
          console.log('[ChatInterface] Current message index:', i);
          break;
        }
      }
    }
  }, [messages, isStreaming]);

  // Listen for custom send-message events
  React.useEffect(() => {
    const handleSendMessage = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setInputValue(customEvent.detail);
        // Auto-submit after a short delay
        setTimeout(() => {
          onSendMessage(customEvent.detail);
          setInputValue('');
        }, 100);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('send-message', handleSendMessage);
      return () => {
        container.removeEventListener('send-message', handleSendMessage);
      };
    }
  }, [onSendMessage]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messageTools]);

  // Track tool executions
  React.useEffect(() => {
    if (!toolExecutionTracker) {
      console.log('[ChatInterface] No tool execution tracker available');
      return;
    }

    console.log('[ChatInterface] Setting up tool execution listeners');

    const handleStart = (event: IToolExecutionEvent) => {
      const messageIndex = currentMessageIndexRef.current;
      console.log('[ChatInterface] Tool started:', event.toolCall.function.name, 'for message index:', messageIndex);

      // Capture content length when first tool starts for this message
      setContentBeforeTools(prev => {
        if (!prev.has(messageIndex) && messageIndex >= 0) {
          const newMap = new Map(prev);
          const currentMessages = messagesRef.current;
          if (messageIndex < currentMessages.length) {
            const contentLength = currentMessages[messageIndex].content.length;
            newMap.set(messageIndex, contentLength);
            console.log('🔍 CAPTURE: Captured content length', contentLength, 'for message', messageIndex);
            console.log('🔍 CAPTURE: Content at capture time:', currentMessages[messageIndex].content);
            return newMap;
          }
        }
        return prev;
      });

      setMessageTools(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageIndex) || [];
        newMap.set(messageIndex, [...existing, event]);
        console.log('[ChatInterface] Added tool to message', messageIndex, 'total tools:', newMap.get(messageIndex)?.length);
        return newMap;
      });
    };

    const handleUpdate = (event: IToolExecutionEvent) => {
      console.log('[ChatInterface] Tool updated:', event.id, event.status);

      setMessageTools(prev => {
        const newMap = new Map(prev);
        // Update the tool in whichever message it belongs to
        for (const [index, tools] of newMap.entries()) {
          const toolIndex = tools.findIndex(t => t.id === event.id);
          if (toolIndex !== -1) {
            const updatedTools = [...tools];
            updatedTools[toolIndex] = event;
            newMap.set(index, updatedTools);
            console.log('[ChatInterface] Updated tool in message', index);
            break;
          }
        }
        return newMap;
      });
    };

    const handleComplete = (event: IToolExecutionEvent) => {
      console.log('[ChatInterface] Tool completed:', event.id);
      handleUpdate(event);
    };

    const handleError = (event: IToolExecutionEvent) => {
      console.log('[ChatInterface] Tool failed:', event.id);
      handleUpdate(event);
    };

    toolExecutionTracker.on('execution:start', handleStart);
    toolExecutionTracker.on('execution:update', handleUpdate);
    toolExecutionTracker.on('execution:complete', handleComplete);
    toolExecutionTracker.on('execution:error', handleError);

    return () => {
      console.log('[ChatInterface] Cleaning up tool execution listeners');
      toolExecutionTracker.off('execution:start', handleStart);
      toolExecutionTracker.off('execution:update', handleUpdate);
      toolExecutionTracker.off('execution:complete', handleComplete);
      toolExecutionTracker.off('execution:error', handleError);
    };
  }, [toolExecutionTracker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="jp-ChatInterface" ref={containerRef}>
      {/* Messages container */}
      <div className="jp-ChatInterface-messages">
        {messages.map((message, index) => {
          // Skip system messages
          if (message.role === 'system') return null;

          // Get tools for this message
          const toolsForMessage = messageTools.get(index) || [];

          if (toolsForMessage.length > 0) {
            console.log('[ChatInterface] Rendering', toolsForMessage.length, 'tools for message', index);
          }

          // For assistant messages with tools, split content to show tools in the middle
          const hasTools = toolsForMessage.length > 0;
          let beforeTools = message.content;
          let afterTools = '';

          if (hasTools && message.role === 'assistant') {
            const capturedLength = contentBeforeTools.get(index);

            if (capturedLength !== undefined) {
              // Split based on captured content length
              beforeTools = message.content.substring(0, capturedLength);
              afterTools = message.content.substring(capturedLength);
            }
          }

          const handleEdit = () => {
            setInputValue(message.content);
            inputRef.current?.focus();
          };

          const handleRegenerate = () => {
            // Find the previous user message
            for (let i = index - 1; i >= 0; i--) {
              if (messages[i].role === 'user') {
                onSendMessage(messages[i].content);
                break;
              }
            }
          };

          return (
            <React.Fragment key={index}>
              {/* Message content before tools */}
              <div className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                <div className="jp-ChatMessage-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="jp-ChatMessage-content">
                  <MessageContent content={beforeTools} role={message.role} />
                  {!hasTools && (
                    <>
                      <MessageActions
                        content={message.content}
                        role={message.role}
                        onEdit={message.role === 'user' ? handleEdit : undefined}
                        onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                      />
                      {message.timestamp && (
                        <div className="jp-ChatMessage-timestamp">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Tool executions inline in the middle */}
              {toolsForMessage.map(execution => (
                <div key={execution.id} className="jp-ChatMessage jp-ChatMessage-tool">
                  <div className="jp-ChatMessage-avatar">🔧</div>
                  <div className="jp-ChatMessage-content">
                    <ToolCallCard execution={execution} />
                  </div>
                </div>
              ))}

              {/* Message content after tools */}
              {hasTools && afterTools && (
                <div className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                  <div className="jp-ChatMessage-avatar">
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="jp-ChatMessage-content">
                    <MessageContent content={afterTools} role={message.role} />
                    <MessageActions
                      content={message.content}
                      role={message.role}
                      onEdit={message.role === 'user' ? handleEdit : undefined}
                      onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                    />
                    {message.timestamp && (
                      <div className="jp-ChatMessage-timestamp">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="jp-ChatMessage jp-ChatMessage-assistant">
            <div className="jp-ChatMessage-avatar">🤖</div>
            <div className="jp-ChatMessage-content">
              <div className="jp-ChatMessage-streaming">
                <span className="jp-ChatMessage-dot"></span>
                <span className="jp-ChatMessage-dot"></span>
                <span className="jp-ChatMessage-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => {
          if (inputValue.trim() && !isStreaming) {
            onSendMessage(inputValue.trim());
            setInputValue('');
            inputRef.current?.focus();
          }
        }}
        disabled={isStreaming}
        placeholder="Ask Tqrar..."
      />
    </div>
  );
};
