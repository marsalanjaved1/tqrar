/**
 * Custom Chat Interface Component
 * Simple, clean chat UI with inline tool execution display
 */

import React from 'react';
import { IMessage, IExecutionSettings } from '../types';
import { ToolCallCard } from './ToolCallCard';
import { ToolExecutionTracker } from '../tools/ToolExecutionTracker';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import { InputArea } from './InputArea';
import { DebugPanel } from './DebugPanel';
import type { IToolExecutionEvent } from '../types';
import { cn } from '../utils/classNames';

export interface IChatInterfaceProps {
  messages: IMessage[];
  onSendMessage: (content: string, executionSettings: IExecutionSettings) => void;
  isStreaming: boolean;
  toolExecutionTracker?: ToolExecutionTracker;
  executionSettings?: IExecutionSettings;
  onExecutionSettingsChange?: (settings: IExecutionSettings) => void;
}

export const ChatInterface: React.FC<IChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  toolExecutionTracker,
  executionSettings = { mode: 'act', autoMode: true },
  onExecutionSettingsChange
}) => {
  console.log('[TQRAR-DEBUG] [ChatInterface] Component render, toolExecutionTracker:', {
    hasTracker: !!toolExecutionTracker,
    trackerType: toolExecutionTracker?.constructor?.name
  });

  const [inputValue, setInputValue] = React.useState('');
  // Map of tool call ID to execution events for inline rendering
  const [toolExecutions, setToolExecutions] = React.useState<Map<string, IToolExecutionEvent>>(new Map());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesRef = React.useRef<IMessage[]>(messages);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [debugOpen, setDebugOpen] = React.useState(false);

  // Keep messages ref in sync
  React.useEffect(() => {
    messagesRef.current = messages;
    console.log('[TQRAR-DEBUG] [ChatInterface] Messages updated:', messages.map((m, i) => ({
      index: i,
      role: m.role,
      hasToolCalls: !!m.toolCalls,
      toolCallsCount: m.toolCalls?.length || 0,
      hasFinalContent: !!m.finalContent
    })));
  }, [messages]);



  // Listen for custom send-message events
  React.useEffect(() => {
    const handleSendMessage = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        setInputValue(customEvent.detail);
        // Auto-submit after a short delay
        setTimeout(() => {
          onSendMessage(customEvent.detail, executionSettings);
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
  }, [onSendMessage, executionSettings]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolExecutions]);

  // Track tool executions by tool call ID for inline rendering
  React.useEffect(() => {
    console.log('[TQRAR-DEBUG] [ChatInterface] ===== USEEFFECT CALLED =====');
    console.log('[TQRAR-DEBUG] [ChatInterface] Setting up tool execution tracker:', {
      hasTracker: !!toolExecutionTracker,
      trackerType: toolExecutionTracker?.constructor?.name,
      trackerInstance: toolExecutionTracker
    });

    if (!toolExecutionTracker) {
      console.warn('[TQRAR-DEBUG] [ChatInterface] No tool execution tracker provided!');
      return;
    }

    const handleExecutionEvent = (event: IToolExecutionEvent) => {
      console.log('[TQRAR-DEBUG] [ChatInterface] Tool execution event:', {
        id: event.id,
        toolCallId: event.toolCall.id,
        status: event.status,
        toolName: event.toolCall.function.name
      });
      
      setToolExecutions(prev => {
        const newMap = new Map(prev);
        newMap.set(event.toolCall.id, event);
        console.log('[TQRAR-DEBUG] [ChatInterface] Updated toolExecutions, size:', newMap.size);
        return newMap;
      });
    };

    console.log('[TQRAR-DEBUG] [ChatInterface] Registering event listeners...');
    toolExecutionTracker.on('execution:start', handleExecutionEvent);
    toolExecutionTracker.on('execution:update', handleExecutionEvent);
    toolExecutionTracker.on('execution:complete', handleExecutionEvent);
    toolExecutionTracker.on('execution:error', handleExecutionEvent);
    console.log('[TQRAR-DEBUG] [ChatInterface] Event listeners registered successfully');

    return () => {
      console.log('[TQRAR-DEBUG] [ChatInterface] Cleaning up event listeners');
      toolExecutionTracker.off('execution:start', handleExecutionEvent);
      toolExecutionTracker.off('execution:update', handleExecutionEvent);
      toolExecutionTracker.off('execution:complete', handleExecutionEvent);
      toolExecutionTracker.off('execution:error', handleExecutionEvent);
    };
  }, [toolExecutionTracker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      onSendMessage(inputValue.trim(), executionSettings);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="tq-chat-container" ref={containerRef}>
      
      {/* Messages container */}
      <div className="tq-chat-messages tq-scrollbar">
        {/* Welcome screen when no messages */}
        {messages.filter(m => m.role !== 'system').length === 0 && (
          <div className="tq-flex tq-flex-col tq-items-center tq-justify-center tq-h-full tq-text-center tq-px-4">
            <div className="tq-max-w-2xl">
              <img 
                src="/lab/extensions/tqrar/static/ghost-logo.png"
                alt="Tqrar Logo" 
                className="tq-w-24 tq-h-24 tq-mx-auto tq-mb-6 tq-opacity-80"
              />
              <h2 className="tq-text-2xl tq-font-semibold tq-text-text-primary tq-mb-2">Welcome to Tqrar</h2>
              <p className="tq-text-md tq-text-text-secondary tq-mb-8">Your AI assistant for JupyterLab</p>
              
              <div className="tq-grid tq-grid-cols-2 tq-gap-3 tq-max-w-xl tq-mx-auto">
                <button 
                  className="tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-p-4 tq-text-left tq-transition-all hover:tq-bg-bg-hover hover:tq-border-border-subtle tq-cursor-pointer tq-flex tq-flex-col tq-gap-2"
                  onClick={() => {
                    const prompt = "Load the iris dataset and show me the first 5 rows";
                    onSendMessage(prompt, executionSettings);
                  }}
                >
                  <span className="tq-text-2xl">📊</span>
                  <span className="tq-text-sm tq-text-text-primary">Load the iris dataset</span>
                </button>
                
                <button 
                  className="tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-p-4 tq-text-left tq-transition-all hover:tq-bg-bg-hover hover:tq-border-border-subtle tq-cursor-pointer tq-flex tq-flex-col tq-gap-2"
                  onClick={() => {
                    const prompt = "Create a scatter plot of sepal length vs width";
                    onSendMessage(prompt, executionSettings);
                  }}
                >
                  <span className="tq-text-2xl">📈</span>
                  <span className="tq-text-sm tq-text-text-primary">Create a visualization</span>
                </button>
                
                <button 
                  className="tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-p-4 tq-text-left tq-transition-all hover:tq-bg-bg-hover hover:tq-border-border-subtle tq-cursor-pointer tq-flex tq-flex-col tq-gap-2"
                  onClick={() => {
                    const prompt = "Explain what this code does";
                    onSendMessage(prompt, executionSettings);
                  }}
                >
                  <span className="tq-text-2xl">💡</span>
                  <span className="tq-text-sm tq-text-text-primary">Explain my code</span>
                </button>
                
                <button 
                  className="tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-p-4 tq-text-left tq-transition-all hover:tq-bg-bg-hover hover:tq-border-border-subtle tq-cursor-pointer tq-flex tq-flex-col tq-gap-2"
                  onClick={() => {
                    const prompt = "Help me debug this error";
                    onSendMessage(prompt, executionSettings);
                  }}
                >
                  <span className="tq-text-2xl">🐛</span>
                  <span className="tq-text-sm tq-text-text-primary">Debug an error</span>
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
                onSendMessage(messages[i].content, executionSettings);
                break;
              }
            }
          };

          // User messages
          if (message.role === 'user') {
            return (
              <div key={index} className="tq-message-user tq-group">
                <div className="tq-w-8 tq-h-8 tq-rounded-full tq-bg-accent-blue tq-flex tq-items-center tq-justify-center tq-text-white tq-text-sm tq-font-semibold tq-flex-shrink-0">
                  U
                </div>
                <div className="tq-flex tq-flex-col tq-gap-1">
                  <div className="tq-message-text-user">
                    <MessageContent content={message.content} role={message.role} />
                  </div>
                  <MessageActions
                    content={message.content}
                    role={message.role}
                    onEdit={handleEdit}
                  />
                  {message.timestamp && (
                    <div className="tq-text-xs tq-text-text-muted tq-mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Assistant messages with linear tool execution flow
          if (message.role === 'assistant') {
            console.log('[TQRAR-DEBUG] [ChatInterface] Rendering assistant message:', {
              index,
              hasToolCalls: !!message.toolCalls,
              toolCallsCount: message.toolCalls?.length || 0,
              hasFinalContent: !!message.finalContent,
              content: message.content.substring(0, 50)
            });
            
            return (
              <div key={index} className="tq-message-assistant tq-group">
                <div className="tq-w-8 tq-h-8 tq-rounded-full tq-bg-bg-secondary tq-flex tq-items-center tq-justify-center tq-text-text-primary tq-text-sm tq-font-semibold tq-flex-shrink-0 tq-border tq-border-border-default">
                  A
                </div>
                <div className="tq-flex tq-flex-col tq-gap-1 tq-flex-1">
                  {/* Initial content before tool calls */}
                  {message.content && (() => {
                    // Always filter out progress messages from assistant messages
                    // Remove progress messages like "_Executing 1 tool..._", "Tool 1/1:", "_[Iteration 2/20]_"
                    let filteredContent = message.content
                      .replace(/_Executing \d+ tools?\.{3}_\s*/g, '')
                      .replace(/\*\*Tool \d+\/\d+:\*\*\s*`[^`]+`[^\n]*\n\s*✓ Success\s*/g, '')
                      .replace(/\*\*Tool \d+\/\d+:\*\*\s*`[^`]+`[^\n]*/g, '')
                      .replace(/_\[Iteration \d+\/\d+\]_\s*/g, '')
                      .replace(/Now let me execute it:\s*/g, '')
                      .replace(/\s*❌ Error:[^\n]*/g, '')
                      .replace(/\s*✓ Success\s*/g, '')
                      .trim();
                    
                    // Only render if there's content left after filtering
                    if (filteredContent) {
                      return (
                        <div className="tq-message-text-assistant">
                          <MessageContent content={filteredContent} role={message.role} />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Tool execution cards inline */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="tq-flex tq-flex-col tq-gap-2 tq-my-2">
                      {message.toolCalls.map(toolCall => {
                        console.log('[TQRAR-DEBUG] [ChatInterface] Rendering tool call:', {
                          id: toolCall.id,
                          name: toolCall.function.name,
                          hasExecution: toolExecutions.has(toolCall.id),
                          messageIndex: index
                        });
                        
                        // First check the toolExecutions Map (for live executions)
                        let execution = toolExecutions.get(toolCall.id);
                        
                        // If not in Map, try to get from tracker directly (for executions that completed before component mounted)
                        if (!execution && toolExecutionTracker) {
                          execution = toolExecutionTracker.getExecutionByToolCallId(toolCall.id);
                          console.log('[TQRAR-DEBUG] [ChatInterface] Queried tracker for execution:', {
                            id: toolCall.id,
                            found: !!execution
                          });
                        }
                        
                        // Show tool card if execution found
                        if (execution) {
                          return (
                            <ToolCallCard key={toolCall.id} execution={execution} />
                          );
                        } else {
                          // For historical tool calls (from loaded sessions), check if there's a corresponding tool result message
                          // Look for the next message with role='tool' and matching toolCallId
                          const toolResultMessage = messages.find((m, i) => 
                            i > index && m.role === 'tool' && m.toolCallId === toolCall.id
                          );
                          
                          if (toolResultMessage) {
                            // Create a completed execution for historical tool calls
                            try {
                              const result = JSON.parse(toolResultMessage.content);
                              const historicalExecution: IToolExecutionEvent = {
                                id: toolCall.id,
                                toolCall: toolCall,
                                status: result.success ? 'success' : 'error',
                                startTime: message.timestamp,
                                endTime: toolResultMessage.timestamp,
                                duration: new Date(toolResultMessage.timestamp).getTime() - new Date(message.timestamp).getTime(),
                                result: result.success ? result : undefined,
                                error: !result.success && result.error ? {
                                  message: result.error.message,
                                  type: result.error.type || 'Error',
                                  stack: result.error.stack
                                } : undefined
                              };
                              console.log('[TQRAR-DEBUG] [ChatInterface] Created historical execution:', {
                                id: toolCall.id,
                                status: historicalExecution.status
                              });
                              return (
                                <ToolCallCard key={toolCall.id} execution={historicalExecution} />
                              );
                            } catch (e) {
                              console.error('[TQRAR-DEBUG] [ChatInterface] Failed to parse tool result:', e);
                            }
                          }
                          
                          // Fallback: Create a pending execution for display
                          const pendingExecution: IToolExecutionEvent = {
                            id: toolCall.id,
                            toolCall: toolCall,
                            status: 'pending',
                            startTime: message.timestamp
                          };
                          return (
                            <ToolCallCard key={toolCall.id} execution={pendingExecution} />
                          );
                        }
                      })}
                    </div>
                  )}
                  
                  {/* Final content after tool execution */}
                  {message.finalContent && (() => {
                    // Filter out progress messages
                    let filteredContent = message.finalContent
                      .replace(/_Executing \d+ tools?\.{3}_\s*/g, '')
                      .replace(/\*\*Tool \d+\/\d+:\*\*\s*`[^`]+`[^\n]*\n\s*✓ Success\s*/g, '')
                      .replace(/\*\*Tool \d+\/\d+:\*\*\s*`[^`]+`[^\n]*/g, '')
                      .replace(/_\[Iteration \d+\/\d+\]_\s*/g, '')
                      .replace(/\s*❌ Error:[^\n]*/g, '')
                      .replace(/\s*✓ Success\s*/g, '')
                      .trim();
                    
                    // Only render if there's content left after filtering
                    if (filteredContent) {
                      return (
                        <div className="tq-message-text-assistant">
                          <MessageContent content={filteredContent} role={message.role} />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <MessageActions
                    content={message.content}
                    role={message.role}
                    onRegenerate={handleRegenerate}
                  />
                  {message.timestamp && (
                    <div className="tq-text-xs tq-text-text-muted tq-mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Skip tool messages (they're now part of assistant messages)
          return null;
        })}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="tq-message-assistant">
            <div className="tq-w-8 tq-h-8 tq-rounded-full tq-bg-bg-secondary tq-flex tq-items-center tq-justify-center tq-text-text-primary tq-text-sm tq-font-semibold tq-flex-shrink-0 tq-border tq-border-border-default">
              A
            </div>
            <div className="tq-flex tq-flex-col tq-gap-1 tq-flex-1">
              <div className="tq-flex tq-gap-1 tq-items-center tq-py-2">
                <span className="tq-w-2 tq-h-2 tq-bg-text-secondary tq-rounded-full tq-animate-pulse-dot"></span>
                <span className="tq-w-2 tq-h-2 tq-bg-text-secondary tq-rounded-full tq-animate-pulse-dot" style={{ animationDelay: '0.2s' }}></span>
                <span className="tq-w-2 tq-h-2 tq-bg-text-secondary tq-rounded-full tq-animate-pulse-dot" style={{ animationDelay: '0.4s' }}></span>
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
            onSendMessage(inputValue.trim(), executionSettings);
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
        executionSettings={executionSettings}
        onExecutionSettingsChange={onExecutionSettingsChange}
      />
    </div>
  );
};
