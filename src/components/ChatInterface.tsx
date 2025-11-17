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
import { DebugPanel } from './DebugPanel';
import type { IToolExecutionEvent } from '../types';

export interface IChatInterfaceProps {
  messages: IMessage[];
  onSendMessage: (content: string) => void;
  isStreaming: boolean;
  toolExecutionTracker?: ToolExecutionTracker;
}

export const ChatInterface: React.FC<IChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  toolExecutionTracker
}) => {
  const [inputValue, setInputValue] = React.useState('');
  // Map of user message index to tool executions (tools appear after user message)
  const [messageTools, setMessageTools] = React.useState<Map<number, IToolExecutionEvent[]>>(new Map());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const currentUserIndexRef = React.useRef<number>(-1);
  const activeToolUserIndexRef = React.useRef<number>(-1); // Locked index for active tool execution
  const messagesRef = React.useRef<IMessage[]>(messages);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);

  // Keep messages ref in sync
  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Update current user message index when messages change
  React.useEffect(() => {
    // Find the last user message index (this is what triggered the current response)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        currentUserIndexRef.current = i;
        break;
      }
    }
  }, [messages]);

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
      return;
    }

    const handleStart = (event: IToolExecutionEvent) => {
      // Lock to the current user index on first tool execution
      if (activeToolUserIndexRef.current === -1) {
        activeToolUserIndexRef.current = currentUserIndexRef.current;
      }
      
      const userIndex = activeToolUserIndexRef.current;
      
      console.log('[ChatInterface] Tool execution started:', {
        toolName: event.toolCall.function.name,
        userIndex,
        totalMessages: messagesRef.current.length
      });

      setMessageTools(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(userIndex) || [];
        newMap.set(userIndex, [...existing, event]);
        console.log('[ChatInterface] Updated messageTools:', {
          userIndex,
          toolCount: existing.length + 1
        });
        return newMap;
      });
    };

    const handleUpdate = (event: IToolExecutionEvent) => {
      setMessageTools(prev => {
        const newMap = new Map(prev);
        // Update the tool in whichever message it belongs to
        for (const [index, tools] of newMap.entries()) {
          const toolIndex = tools.findIndex(t => t.id === event.id);
          if (toolIndex !== -1) {
            const updatedTools = [...tools];
            updatedTools[toolIndex] = event;
            newMap.set(index, updatedTools);
            break;
          }
        }
        return newMap;
      });
    };

    const handleComplete = (event: IToolExecutionEvent) => {
      handleUpdate(event);
      // Reset the locked index when all tools complete
      // (This is a simple heuristic - could be improved)
      setTimeout(() => {
        activeToolUserIndexRef.current = -1;
      }, 100);
    };

    const handleError = (event: IToolExecutionEvent) => {
      handleUpdate(event);
      // Reset the locked index on error
      setTimeout(() => {
        activeToolUserIndexRef.current = -1;
      }, 100);
    };

    toolExecutionTracker.on('execution:start', handleStart);
    toolExecutionTracker.on('execution:update', handleUpdate);
    toolExecutionTracker.on('execution:complete', handleComplete);
    toolExecutionTracker.on('execution:error', handleError);

    return () => {
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

  return (
    <div className="jp-ChatInterface" ref={containerRef}>
      
      {/* Messages container */}
      <div className="jp-ChatInterface-messages">
        {/* Welcome screen when no messages */}
        {messages.filter(m => m.role !== 'system').length === 0 && (
          <div className="jp-ChatInterface-welcome">
            <div className="jp-ChatInterface-welcomeContent">
              <img 
                src="https://raw.githubusercontent.com/marsalanjaved1/tqrar/main/ghost-logo.png" 
                alt="Tqrar Logo" 
                className="jp-ChatInterface-welcomeLogo"
              />
              <h2 className="jp-ChatInterface-welcomeTitle">Welcome to Tqrar</h2>
              <p className="jp-ChatInterface-welcomeSubtitle">Your AI assistant for JupyterLab</p>
              
              <div className="jp-ChatInterface-welcomePrompts">
                <button 
                  className="jp-ChatInterface-promptCard"
                  onClick={() => {
                    const prompt = "Load the iris dataset and show me the first 5 rows";
                    onSendMessage(prompt);
                  }}
                >
                  <span className="jp-ChatInterface-promptIcon">📊</span>
                  <span className="jp-ChatInterface-promptText">Load the iris dataset</span>
                </button>
                
                <button 
                  className="jp-ChatInterface-promptCard"
                  onClick={() => {
                    const prompt = "Create a scatter plot of sepal length vs width";
                    onSendMessage(prompt);
                  }}
                >
                  <span className="jp-ChatInterface-promptIcon">📈</span>
                  <span className="jp-ChatInterface-promptText">Create a visualization</span>
                </button>
                
                <button 
                  className="jp-ChatInterface-promptCard"
                  onClick={() => {
                    const prompt = "Explain what this code does";
                    onSendMessage(prompt);
                  }}
                >
                  <span className="jp-ChatInterface-promptIcon">💡</span>
                  <span className="jp-ChatInterface-promptText">Explain my code</span>
                </button>
                
                <button 
                  className="jp-ChatInterface-promptCard"
                  onClick={() => {
                    const prompt = "Help me debug this error";
                    onSendMessage(prompt);
                  }}
                >
                  <span className="jp-ChatInterface-promptIcon">🐛</span>
                  <span className="jp-ChatInterface-promptText">Debug an error</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => {
          // Skip system messages
          if (message.role === 'system') return null;

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

          // For user messages, show the message followed by any tool executions
          if (message.role === 'user') {
            // Get tools stored at this user message index
            const toolsForThisUser = messageTools.get(index) || [];

            return (
              <React.Fragment key={index}>
                {/* User message */}
                <div className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                  <div className="jp-ChatMessage-avatar">👤</div>
                  <div className="jp-ChatMessage-content">
                    <MessageContent content={message.content} role={message.role} />
                    <MessageActions
                      content={message.content}
                      role={message.role}
                      onEdit={handleEdit}
                    />
                    {message.timestamp && (
                      <div className="jp-ChatMessage-timestamp">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tool executions that belong to this user message */}
                {toolsForThisUser.length > 0 && toolsForThisUser.map(execution => (
                  <div key={execution.id} className="jp-ChatMessage jp-ChatMessage-tool">
                    <div className="jp-ChatMessage-avatar">🔧</div>
                    <div className="jp-ChatMessage-content">
                      <ToolCallCard execution={execution} />
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          }

          // For assistant messages, just show the final response
          // (tools were already shown after the user message)
          if (message.role === 'assistant') {
            return (
              <div key={index} className={`jp-ChatMessage jp-ChatMessage-${message.role}`}>
                <div className="jp-ChatMessage-avatar">
                  <img src="https://raw.githubusercontent.com/marsalanjaved1/tqrar/main/ghost-logo.png" alt="Tqrar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                </div>
                <div className="jp-ChatMessage-content">
                  <MessageContent content={message.content} role={message.role} />
                  <MessageActions
                    content={message.content}
                    role={message.role}
                    onRegenerate={handleRegenerate}
                  />
                  {message.timestamp && (
                    <div className="jp-ChatMessage-timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // For tool messages (shouldn't normally render these directly)
          return null;
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

      {/* Debug Panel */}
      {/* <DebugPanel
        messages={messages}
        messageTools={messageTools}
        isOpen={debugOpen}
        onToggle={() => setDebugOpen(!debugOpen)}
      /> */}

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
        currentModel={{ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }}
        onModelChange={(config) => {
          // TODO: Implement model change handler
        }}
      />
    </div>
  );
};
