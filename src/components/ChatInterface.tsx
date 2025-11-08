/**
 * Custom Chat Interface Component
 * Simple, clean chat UI with inline tool execution display
 */

import React from 'react';
import { IMessage } from '../types';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { ToolExecutionTracker } from '../tools/ToolExecutionTracker';
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
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const currentMessageIndexRef = React.useRef<number>(-1);

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
    <div className="jp-ChatInterface">
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
            console.log('🔍 SPLIT_DEBUG: Message has tools, attempting to split');
            console.log('🔍 SPLIT_DEBUG: Full content:', message.content);
            console.log('🔍 SPLIT_DEBUG: Content length:', message.content.length);
            
            // Split by double newline to find natural break point
            const parts = message.content.split('\n\n');
            console.log('🔍 SPLIT_DEBUG: Split into', parts.length, 'parts');
            console.log('🔍 SPLIT_DEBUG: Parts:', parts);
            
            if (parts.length > 1) {
              // Put first part before tools, rest after
              beforeTools = parts[0];
              afterTools = parts.slice(1).join('\n\n');
              console.log('🔍 SPLIT_DEBUG: BEFORE TOOLS:', beforeTools);
              console.log('🔍 SPLIT_DEBUG: AFTER TOOLS:', afterTools);
            } else {
              console.log('🔍 SPLIT_DEBUG: No \\n\\n found, showing all content before tools');
            }
            
            console.log('🔍 SPLIT_DEBUG: FINAL beforeTools length:', beforeTools.length);
            console.log('🔍 SPLIT_DEBUG: FINAL afterTools length:', afterTools.length);
            console.log('🔍 SPLIT_DEBUG: afterTools is truthy?', !!afterTools);
          }

          return (
            <React.Fragment key={index}>
              {/* Message content before tools */}
              <div className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                <div className="jp-ChatMessage-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="jp-ChatMessage-content">
                  <div className="jp-ChatMessage-text">
                    {beforeTools}
                  </div>
                  {!hasTools && message.timestamp && (
                    <div className="jp-ChatMessage-timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Tool executions inline in the middle */}
              {toolsForMessage.map(execution => {
                console.log('🔍 RENDER_DEBUG: Rendering tool execution:', execution.toolCall.function.name, execution.status);
                return (
                  <div key={execution.id} className="jp-ChatMessage jp-ChatMessage-tool">
                    <div className="jp-ChatMessage-avatar">🔧</div>
                    <div className="jp-ChatMessage-content">
                      <ToolExecutionPanel execution={execution} />
                    </div>
                  </div>
                );
              })}
              
              {/* Message content after tools */}
              {hasTools && afterTools && (
                <>
                  {console.log('🔍 RENDER_DEBUG: Rendering afterTools, length:', afterTools.length)}
                  <div className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                    <div className="jp-ChatMessage-avatar">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="jp-ChatMessage-content">
                      <div className="jp-ChatMessage-text">
                        {afterTools}
                      </div>
                      {message.timestamp && (
                        <div className="jp-ChatMessage-timestamp">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </>
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

      {/* Input form */}
      <form className="jp-ChatInterface-input" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="jp-ChatInterface-textarea"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          type="submit"
          className="jp-ChatInterface-send"
          disabled={!inputValue.trim() || isStreaming}
        >
          Send
        </button>
      </form>
    </div>
  );
};
