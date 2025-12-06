/**
 * Conversation Manager for AI Assistant
 * 
 * Manages conversation history, coordinates LLM interactions, and orchestrates tool calls
 */

import { IMessage, IToolCall, IToolResult, IExecutionSettings } from './types';
import { LLMClient } from './llm/client';
import { ToolRegistry } from './tools/registry';
import { ContextManager } from './context';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { getPhoenixClient } from './observability/phoenix';
import { formatToolResult } from './agent/formatter';

/**
 * System prompt for the AI Assistant
 * Concise and focused to prevent context dilution
 */
const SYSTEM_PROMPT = `You are Tqrar, an AI assistant for JupyterLab notebooks.

## Capabilities
- Create, edit, execute, and delete notebook cells
- Read and write files in the workspace
- Inspect variables and debug errors
- Analyze data and create visualizations

## How to Work
1. **Act directly** - When asked to do something, use tools immediately
2. **Show results** - After tools execute, explain what happened with actual output
3. **Be concise** - No lengthy explanations unless asked
4. **Handle errors** - If something fails, try ONE fix, then explain the issue
5. **Know when to stop** - Once the task is done, summarize briefly and stop

## Critical Rules
- A notebook is ALREADY OPEN - never say you can't access it
- Use the active notebook (don't specify notebookId unless asked)
- After creating a cell, EXECUTE it to show results
- After executing, check the output with getCellOutput if needed
- NEVER repeat the same tool call twice in a row
- If stuck after 2 attempts, explain the problem and ask for guidance
- Don't browse the internet - you can only work with local files and notebooks

## Response Format
- Start with action, not explanation
- Show actual outputs, not just "success"
- End with a brief summary when task is complete

## Good Example
"✓ Created cell with pandas import
✓ Executed - DataFrame loaded (150 rows × 5 columns)

First 5 rows:
\`\`\`
   col1  col2
0   1.0   2.0
\`\`\`

The data is ready for analysis."

## Bad Example (Don't do this)
"I'll help you with that. Let me create a cell. Now I'll execute it. Let me check the output. The output shows... Let me verify..."
(Too verbose, repetitive, doesn't show actual data)`;

/**
 * State tracking for the agentic loop
 * Manages iteration count and loop continuation logic
 */
interface AgenticLoopState {
  /**
   * Current iteration number (0-based)
   */
  iteration: number;

  /**
   * Maximum allowed iterations to prevent infinite loops
   */
  maxIterations: number;

  /**
   * Whether to continue the loop
   */
  continueLoop: boolean;

  /**
   * Total number of tool calls executed across all iterations
   */
  toolCallsExecuted: number;
}

/**
 * Options for creating a ConversationManager
 */
export interface IConversationManagerOptions {
  /**
   * LLM client for API communication
   */
  llmClient: LLMClient;

  /**
   * Tool registry for executing tools
   */
  toolRegistry: ToolRegistry;

  /**
   * Context manager for notebook state
   */
  contextManager: ContextManager;

  /**
   * Optional tool execution tracker for UI updates
   */
  toolExecutionTracker?: ToolExecutionTracker;

  /**
   * Optional custom system prompt (defaults to built-in prompt)
   */
  systemPrompt?: string;

  /**
   * Optional callback to save conversation history
   */
  onHistoryChange?: (messages: IMessage[]) => void;

  /**
   * Optional initial conversation history to restore
   */
  initialHistory?: IMessage[];
}

/**
 * Pending tool approval (for manual mode)
 */
export interface IPendingToolApproval {
  toolCalls: IToolCall[];
  resolve: (approved: boolean) => void;
}

/**
 * Conversation Manager class
 * Manages conversation history and coordinates LLM interactions with tool execution
 */
export class ConversationManager {
  private _messages: IMessage[];
  private _llmClient: LLMClient;
  private _toolRegistry: ToolRegistry;
  private _contextManager: ContextManager;
  private _toolExecutionTracker: ToolExecutionTracker;
  private _systemPrompt: string;
  private _onHistoryChange?: (messages: IMessage[]) => void;
  private _phoenixClient = getPhoenixClient();
  
  // Pending approval for manual mode
  private _pendingApproval: IPendingToolApproval | null = null;
  
  // Callback for when pending tools change (for UI updates)
  private _onPendingToolsChange?: (toolCalls: IToolCall[] | null) => void;

  /**
   * Create a new ConversationManager
   * 
   * @param options - Configuration options
   */
  constructor(options: IConversationManagerOptions) {
    this._llmClient = options.llmClient;
    this._toolRegistry = options.toolRegistry;
    this._contextManager = options.contextManager;
    this._toolExecutionTracker = options.toolExecutionTracker || new ToolExecutionTracker();
    this._systemPrompt = options.systemPrompt || SYSTEM_PROMPT;
    this._onHistoryChange = options.onHistoryChange;

    // Start Phoenix session for this conversation
    this._phoenixClient.startSession('chat_session');

    // Initialize conversation with system prompt or restore from initial history
    if (options.initialHistory && options.initialHistory.length > 0) {
      // Restore from saved history
      this._messages = options.initialHistory.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp) // Ensure timestamp is a Date object
      }));
      console.log('[ConversationManager] Restored conversation history with', this._messages.length, 'messages');
    } else {
      // Start fresh with system prompt
      this._messages = [
        {
          role: 'system',
          content: this._systemPrompt,
          timestamp: new Date()
        }
      ];
      console.log('[ConversationManager] Initialized with system prompt');
    }
  }

  /**
   * Send a message and get a streaming response
   * Coordinates LLM calls and tool execution with agentic loop
   * 
   * @param content - The user's message content
   * @param executionSettings - Execution settings controlling tool availability and behavior
   * @returns Async generator yielding response chunks
   */
  async *sendMessage(content: string, executionSettings: IExecutionSettings): AsyncGenerator<string> {
    // Start Phoenix trace for the entire agent turn (child of session)
    const sessionSpanId = this._phoenixClient.getSessionSpanId();
    const agentSpanId = this._phoenixClient.startTrace(
      'agent_turn',
      'agent',
      { 
        user_message: content,
        message_length: content.length 
      },
      sessionSpanId  // Parent is the session span
    );

    // Add user message to history
    const userMessage: IMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    this._messages.push(userMessage);

    console.log('[ConversationManager] User message:', content);

    // Initialize agentic loop state
    const loopState: AgenticLoopState = {
      iteration: 0,
      maxIterations: 5,  // Reduced from 20 to prevent runaway loops
      continueLoop: true,
      toolCallsExecuted: 0
    };

    try {
      // Get available tools filtered by execution mode
      const tools = this._toolRegistry.getSchemas(executionSettings.mode);
      console.log(`[ConversationManager] Available tools in ${executionSettings.mode} mode:`, tools.length);
      
      // In Plan mode, inform user about read-only limitations
      if (executionSettings.mode === 'plan') {
        yield `\n_ℹ️ Plan Mode: Read-only operations. Switch to Act mode for write operations._\n\n`;
      }

      // Main agentic loop - continues until no more tool calls or max iterations reached
      while (loopState.continueLoop && loopState.iteration < loopState.maxIterations) {
        console.log(`[ConversationManager] Agentic loop iteration ${loopState.iteration + 1}/${loopState.maxIterations}`);

        // Skip verbose iteration messages - they clutter the output

        // Inject notebook context before LLM call
        const messagesWithContext = [...this._messages];
        const notebookContext = this._getNotebookContext();
        
        if (notebookContext) {
          console.log('[ConversationManager] Injecting notebook context');
          const contextMessage: IMessage = {
            role: 'system',
            content: notebookContext,
            timestamp: new Date()
          };
          messagesWithContext.push(contextMessage);
        } else {
          console.log('[ConversationManager] No active notebook, skipping context injection');
        }

        // Start Phoenix trace for LLM call (child of agent turn)
        const llmSpanId = this._phoenixClient.startTrace(
          `llm_completion_iter_${loopState.iteration}`,
          'llm',
          {
            model: this._llmClient.getSettings().model,
            temperature: this._llmClient.getSettings().temperature,
            message_count: messagesWithContext.length,
            tools_count: tools.length,
            iteration: loopState.iteration
          },
          agentSpanId  // Parent span ID
        );

        // Stream completion from LLM with error handling
        let assistantMessage = '';
        let toolCalls: IToolCall[] = [];
        let finishReason: string | undefined;
        let llmError: Error | null = null;

        // Accumulate tool call data from streaming chunks
        const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

        try {
          for await (const chunk of this._llmClient.streamCompletion(messagesWithContext, tools)) {
            const choice = chunk.choices[0];
            
            if (!choice) {
              continue;
            }

            // Handle content delta
            if (choice.delta.content) {
              assistantMessage += choice.delta.content;
              yield choice.delta.content;
            }

            // Handle tool calls delta
            if (choice.delta.tool_calls) {
              for (const toolCallDelta of choice.delta.tool_calls) {
                // CRITICAL: OpenAI streaming API includes an 'index' property on each tool_call delta
                // This index identifies which tool call this delta belongs to (0, 1, 2, etc.)
                // We must use this index, not indexOf(), to properly accumulate multiple tool calls
                const index = (toolCallDelta as any).index ?? 0;
                
                if (!toolCallsMap.has(index)) {
                  toolCallsMap.set(index, {
                    id: toolCallDelta.id || '',
                    name: toolCallDelta.function?.name || '',
                    arguments: ''
                  });
                }

                const toolCall = toolCallsMap.get(index)!;
                
                if (toolCallDelta.id) {
                  toolCall.id = toolCallDelta.id;
                }
                if (toolCallDelta.function?.name) {
                  toolCall.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  toolCall.arguments += toolCallDelta.function.arguments;
                }
              }
            }

            // Capture finish reason
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }
          }
        } catch (error) {
          // Handle LLM API failures
          console.error('[ConversationManager] LLM API error:', error);
          llmError = error instanceof Error ? error : new Error(String(error));
          
          // End LLM trace with error
          this._phoenixClient.endTraceWithError(llmSpanId, llmError);
          
          // Yield error message to user
          yield `\n\n❌ **LLM API Error:** ${llmError.message}\n\n`;
          
          // Add partial response to history if any content was generated
          if (assistantMessage) {
            this._messages.push({
              role: 'assistant',
              content: assistantMessage + `\n\n[Error: ${llmError.message}]`,
              timestamp: new Date()
            });
          } else {
            this._messages.push({
              role: 'assistant',
              content: `[LLM API Error: ${llmError.message}]`,
              timestamp: new Date()
            });
          }
          this._notifyHistoryChange();
          
          // Exit loop on LLM failure
          loopState.continueLoop = false;
          break;
        }

        // Skip further processing if LLM error occurred
        if (llmError) {
          break;
        }

        // Convert accumulated tool calls to IToolCall format
        if (toolCallsMap.size > 0) {
          toolCalls = Array.from(toolCallsMap.values()).map(tc => {
            // Validate that we have complete tool call data
            if (!tc.id || !tc.name) {
              console.warn('[ConversationManager] Incomplete tool call data:', tc);
            }
            
            // Validate that arguments is valid JSON (or empty)
            if (tc.arguments) {
              try {
                JSON.parse(tc.arguments);
              } catch (e) {
                console.error('[ConversationManager] Invalid JSON in tool call arguments:', {
                  name: tc.name,
                  arguments: tc.arguments,
                  error: e
                });
                // Log first 200 chars to help debug
                console.error('[ConversationManager] Arguments preview:', tc.arguments.substring(0, 200));
              }
            }
            
            return {
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: tc.arguments
              }
            };
          });
          
          console.log('[ConversationManager] Accumulated tool calls:', {
            count: toolCalls.length,
            tools: toolCalls.map(tc => tc.function.name)
          });
        }

        // End LLM trace
        this._phoenixClient.addAttributes(llmSpanId, {
          response_length: assistantMessage.length,
          tool_calls_count: toolCalls.length,
          finish_reason: finishReason
        });
        this._phoenixClient.endTrace(llmSpanId, {
          content: assistantMessage.substring(0, 500),
          tool_calls: toolCalls.length
        });

        // Add assistant message to history
        const assistantMsg: IMessage = {
          role: 'assistant',
          content: assistantMessage,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: new Date()
        };
        this._messages.push(assistantMsg);
        this._notifyHistoryChange();

        console.log('[TQRAR-DEBUG] [ConversationManager] Assistant response:', {
          content: assistantMessage.substring(0, 100),
          toolCalls: toolCalls.length,
          toolCallsData: toolCalls,
          finishReason
        });

        // Check loop continuation conditions
        if (finishReason === 'tool_calls' && toolCalls.length > 0) {
          console.log('[ConversationManager] Executing tool calls:', toolCalls.length);
          
          // Check if we need user approval (manual mode / autopilot OFF)
          if (!executionSettings.autoMode) {
            console.log('[ConversationManager] Manual mode - waiting for user approval');
            yield '\n\n⏸️ **Waiting for approval...**\n';
            
            const approved = await this._waitForApproval(toolCalls);
            
            if (!approved) {
              console.log('[ConversationManager] Tools rejected by user');
              yield '\n❌ Tools rejected. Let me know what you\'d like to do instead.\n';
              
              // Add rejection to history
              this._messages.push({
                role: 'assistant',
                content: '[User rejected tool execution]',
                timestamp: new Date()
              });
              this._notifyHistoryChange();
              
              loopState.continueLoop = false;
              break;
            }
            
            console.log('[ConversationManager] Tools approved by user');
            yield '\n✅ **Approved** - executing...\n';
          }
          
          // Skip verbose "Executing N tools" message - results speak for themselves
          yield '\n';
          
          // Execute tool calls and get results with progress streaming (pass parent span ID)
          // Tool execution failures are handled within handleToolCallsWithProgress
          // and added to conversation history, allowing the LLM to see errors and continue
          const toolResults: IMessage[] = [];
          let toolExecutionError = false;
          
          try {
            for await (const result of this.handleToolCallsWithProgress(toolCalls, agentSpanId)) {
              if (typeof result === 'string') {
                // Progress message - yield to user
                yield result;
              } else {
                // Tool result message - add to results
                toolResults.push(result);
                
                // Check if this tool execution failed
                try {
                  const resultData = JSON.parse(result.content);
                  if (!resultData.success) {
                    toolExecutionError = true;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          } catch (error) {
            // Handle unexpected errors during tool execution
            console.error('[ConversationManager] Unexpected error during tool execution:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            yield `\n\n⚠️ **Tool Execution Error:** ${errorMsg}\n\n`;
            
            // Add error message to history so LLM can see it
            this._messages.push({
              role: 'assistant',
              content: `[Tool execution error: ${errorMsg}]`,
              timestamp: new Date()
            });
            this._notifyHistoryChange();
            
            // Continue loop - LLM may be able to recover
          }
          
          // Update tool calls executed counter
          loopState.toolCallsExecuted += toolCalls.length;
          
          // Add tool result messages to history
          // This allows the LLM to see errors and decide how to proceed
          for (const result of toolResults) {
            this._messages.push(result);
          }
          this._notifyHistoryChange();

          // Increment iteration counter
          loopState.iteration++;

          // Continue loop - will check conditions at top of while loop
          loopState.continueLoop = true;

        } else {
          // No tool calls - exit loop
          console.log('[ConversationManager] No tool calls, exiting agentic loop');
          loopState.continueLoop = false;
        }
      }

      // Yield final summary when loop completes
      if (loopState.iteration >= loopState.maxIterations) {
        // Max iterations reached - handle iteration limit exceeded
        console.log('[ConversationManager] Max iterations reached, exiting agentic loop');
        
        // Brief warning about iteration limit
        yield `\n\n⚠️ Stopped after ${loopState.toolCallsExecuted} actions. Let me know if you need more help.`;
        
        // Add summary to history for context
        this._messages.push({
          role: 'assistant',
          content: `[Workflow stopped: Maximum iteration limit (${loopState.maxIterations}) reached after ${loopState.toolCallsExecuted} tool calls]`,
          timestamp: new Date()
        });
        this._notifyHistoryChange();
        
      }
      // Skip verbose completion summary - the results speak for themselves

      // End agent trace successfully
      this._phoenixClient.addAttributes(agentSpanId, {
        total_iterations: loopState.iteration,
        tool_calls_executed: loopState.toolCallsExecuted,
        max_iterations_reached: loopState.iteration >= loopState.maxIterations
      });
      this._phoenixClient.endTrace(agentSpanId, {
        iterations: loopState.iteration,
        tool_calls: loopState.toolCallsExecuted
      });

    } catch (error) {
      // Handle unexpected errors in the agentic loop
      console.error('[ConversationManager] Error in sendMessage:', error);
      
      // End agent trace with error
      this._phoenixClient.endTraceWithError(agentSpanId, error as Error);
      
      // Yield error message to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
      
      yield `\n\n❌ **Unexpected Error:** ${errorMessage}\n\n`;
      
      // Provide graceful degradation message
      if (loopState.toolCallsExecuted > 0) {
        yield `_Partial workflow completion: ${loopState.toolCallsExecuted} tool call${loopState.toolCallsExecuted > 1 ? 's' : ''} executed successfully before error._\n\n`;
      }
      
      // Add error to conversation history
      this._messages.push({
        role: 'assistant',
        content: `[Error: ${errorMessage}]`,
        timestamp: new Date()
      });
      this._notifyHistoryChange();
    }
  }

  /**
   * Execute multiple tool calls in sequence
   * 
   * @param toolCalls - Array of tool calls to execute
   * @param parentSpanId - Optional parent span ID for tracing
   * @returns Array of tool result messages
   */
  async handleToolCalls(toolCalls: IToolCall[], parentSpanId?: string): Promise<IMessage[]> {
    const results: IMessage[] = [];

    for (const toolCall of toolCalls) {
      console.log('[ConversationManager] Executing tool:', toolCall.function.name);

      // Start Phoenix trace for tool execution (child of agent turn)
      const toolSpanId = this._phoenixClient.startTrace(
        `tool.${toolCall.function.name}`,
        'tool',
        {
          tool_name: toolCall.function.name,
          arguments: toolCall.function.arguments,
          call_id: toolCall.id
        },
        parentSpanId  // Parent span ID
      );

      // Start tracking execution
      const executionId = this._toolExecutionTracker.startExecution(toolCall);

      try {
        // Parse tool arguments
        let args: Record<string, any>;
        try {
          // Handle empty string as empty object (for tools with no required parameters)
          const argsString = toolCall.function.arguments.trim();
          args = argsString === '' ? {} : JSON.parse(argsString);
        } catch (parseError) {
          console.error('[ConversationManager] Failed to parse tool arguments:', parseError);
          
          const parseErrorObj = parseError instanceof Error 
            ? parseError 
            : new Error('Invalid tool arguments: Unknown error');
          
          // Mark execution as failed
          this._toolExecutionTracker.failExecution(executionId, parseErrorObj);
          
          results.push({
            role: 'tool',
            content: JSON.stringify({
              success: false,
              error: {
                message: 'Invalid tool arguments: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'),
                type: 'ParseError'
              }
            }),
            toolCallId: toolCall.id,
            timestamp: new Date()
          });
          continue;
        }

        // Execute the tool
        const result: IToolResult = await this._toolRegistry.execute(
          toolCall.function.name,
          args
        );

        console.log('[ConversationManager] Tool result:', {
          tool: toolCall.function.name,
          success: result.success
        });

        // End Phoenix trace for tool
        this._phoenixClient.addAttributes(toolSpanId, {
          success: result.success
        });
        this._phoenixClient.endTrace(toolSpanId, result);

        // Mark execution as complete
        this._toolExecutionTracker.completeExecution(executionId, result);

        // Format result as message
        results.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('[ConversationManager] Tool execution error:', error);
        
        const errorObj = error instanceof Error 
          ? error 
          : new Error(String(error));
        
        // End Phoenix trace with error
        this._phoenixClient.endTraceWithError(toolSpanId, errorObj);
        
        // Mark execution as failed
        this._toolExecutionTracker.failExecution(executionId, errorObj);
        
        // Add error result
        results.push({
          role: 'tool',
          content: JSON.stringify({
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              type: error instanceof Error ? error.name : 'UnknownError'
            }
          }),
          toolCallId: toolCall.id,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Execute multiple tool calls in sequence with progress streaming
   * Yields progress messages and tool results for user feedback
   * 
   * @param toolCalls - Array of tool calls to execute
   * @param parentSpanId - Optional parent span ID for tracing
   * @returns Async generator yielding progress strings and tool result messages
   */
  async *handleToolCallsWithProgress(
    toolCalls: IToolCall[], 
    parentSpanId?: string
  ): AsyncGenerator<string | IMessage> {
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      console.log('[ConversationManager] Executing tool:', toolCall.function.name);

      // Skip verbose "Tool X/Y" messages - the formatted result is enough

      // Start Phoenix trace for tool execution (child of agent turn)
      const toolSpanId = this._phoenixClient.startTrace(
        `tool.${toolCall.function.name}`,
        'tool',
        {
          tool_name: toolCall.function.name,
          arguments: toolCall.function.arguments,
          call_id: toolCall.id
        },
        parentSpanId  // Parent span ID
      );

      // Start tracking execution
      console.log('[TQRAR-DEBUG] [ConversationManager] About to call startExecution, tracker exists:', !!this._toolExecutionTracker, 'toolCall:', toolCall.function.name);
      const executionId = this._toolExecutionTracker.startExecution(toolCall);
      console.log('[TQRAR-DEBUG] [ConversationManager] startExecution returned:', executionId);

      try {
        // Parse tool arguments
        let args: Record<string, any>;
        try {
          // Handle empty string as empty object (for tools with no required parameters)
          const argsString = toolCall.function.arguments.trim();
          args = argsString === '' ? {} : JSON.parse(argsString);
        } catch (parseError) {
          console.error('[ConversationManager] Failed to parse tool arguments:', parseError);
          
          const parseErrorObj = parseError instanceof Error 
            ? parseError 
            : new Error('Invalid tool arguments: Unknown error');
          
          // Mark execution as failed
          this._toolExecutionTracker.failExecution(executionId, parseErrorObj);
          
          // Yield error message
          yield `  ❌ Error: Invalid arguments\n\n`;
          
          // Yield tool result message
          yield {
            role: 'tool',
            content: JSON.stringify({
              success: false,
              error: {
                message: 'Invalid tool arguments: ' + (parseError instanceof Error ? parseError.message : 'Unknown error'),
                type: 'ParseError'
              }
            }),
            toolCallId: toolCall.id,
            timestamp: new Date()
          };
          continue;
        }

        // Execute the tool
        const result: IToolResult = await this._toolRegistry.execute(
          toolCall.function.name,
          args
        );

        console.log('[ConversationManager] Tool result:', {
          tool: toolCall.function.name,
          success: result.success
        });

        // End Phoenix trace for tool
        this._phoenixClient.addAttributes(toolSpanId, {
          success: result.success
        });
        this._phoenixClient.endTrace(toolSpanId, result);

        // Mark execution as complete
        this._toolExecutionTracker.completeExecution(executionId, result);

        // Yield human-readable result using formatter
        const formattedResult = formatToolResult(toolCall, result);
        yield `${formattedResult}\n\n`;

        // Yield tool result message
        yield {
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id,
          timestamp: new Date()
        };

      } catch (error) {
        console.error('[ConversationManager] Tool execution error:', error);
        
        const errorObj = error instanceof Error 
          ? error 
          : new Error(String(error));
        
        // End Phoenix trace with error
        this._phoenixClient.endTraceWithError(toolSpanId, errorObj);
        
        // Mark execution as failed
        this._toolExecutionTracker.failExecution(executionId, errorObj);
        
        // Yield error message
        const errorMsg = error instanceof Error ? error.message : String(error);
        yield `  ❌ Error: ${errorMsg}\n\n`;
        
        // Yield tool result message
        yield {
          role: 'tool',
          content: JSON.stringify({
            success: false,
            error: {
              message: errorMsg,
              type: error instanceof Error ? error.name : 'UnknownError'
            }
          }),
          toolCallId: toolCall.id,
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Get the conversation history
   * 
   * @returns Array of messages in the conversation
   */
  getHistory(): IMessage[] {
    return [...this._messages];
  }

  /**
   * Clear the conversation history
   * Resets to initial state with system prompt
   */
  clear(): void {
    console.log('[ConversationManager] Clearing conversation history');
    
    // End current Phoenix session
    this._phoenixClient.endSession({
      total_messages: this._messages.length - 1, // Exclude system prompt
      session_duration: 'completed'
    });
    
    // Start new session
    this._phoenixClient.startSession('chat_session');
    
    this._messages = [
      {
        role: 'system',
        content: this._systemPrompt,
        timestamp: new Date()
      }
    ];
    
    this._notifyHistoryChange();
  }

  /**
   * Get the number of messages in the conversation
   * 
   * @returns Number of messages (excluding system prompt)
   */
  get messageCount(): number {
    // Exclude system prompt from count
    return this._messages.length - 1;
  }

  /**
   * Update the system prompt
   * Clears conversation history and reinitializes with new prompt
   * 
   * @param prompt - New system prompt
   */
  updateSystemPrompt(prompt: string): void {
    console.log('[ConversationManager] Updating system prompt');
    this._systemPrompt = prompt;
    this.clear();
  }

  /**
   * Get the current system prompt
   * 
   * @returns The system prompt
   */
  getSystemPrompt(): string {
    return this._systemPrompt;
  }

  /**
   * Get the tool execution tracker
   * Exposes tracker to widget for UI integration
   * 
   * @returns The tool execution tracker
   */
  getToolExecutionTracker(): ToolExecutionTracker {
    return this._toolExecutionTracker;
  }

  /**
   * Get detailed notebook context for injection into LLM prompts
   * Provides comprehensive information about the current notebook state
   * 
   * @returns Formatted context string or null if no active notebook
   */
  private _getNotebookContext(): string | null {
    const context = this._contextManager.getContext();
    
    // Return null if no active notebook
    if (!context.activeNotebookId) {
      return null;
    }

    // Get active notebook details
    const activeNotebook = this._contextManager.getActiveNotebook();
    if (!activeNotebook) {
      return null;
    }

    // Get notebook information
    const notebookInfo = context.openNotebooks.find(nb => nb.id === context.activeNotebookId);
    if (!notebookInfo) {
      return null;
    }

    // Get cell count
    const notebookModel = activeNotebook.content.model;
    const cellCount = notebookModel?.cells.length || 0;

    // Get last executed cell information
    let lastExecutedCell: number | null = null;
    if (notebookModel?.cells) {
      // Find the last cell with an execution count
      for (let i = cellCount - 1; i >= 0; i--) {
        const cell = notebookModel.cells.get(i);
        if (cell.type === 'code') {
          const codeCell = cell as any; // Cast to access executionCount
          if (codeCell.executionCount !== null && codeCell.executionCount !== undefined) {
            lastExecutedCell = i;
            break;
          }
        }
      }
    }

    // Build context message
    const contextParts = [
      '## Current Notebook Context',
      '',
      `**Active Notebook:** ${notebookInfo.name}`,
      `- ID: ${context.activeNotebookId}`,
      `- Path: ${notebookInfo.path}`,
      `- Kernel Status: ${context.kernelStatus || 'unknown'}`,
      `- Cell Count: ${cellCount}`,
    ];

    if (lastExecutedCell !== null) {
      contextParts.push(`- Last Executed Cell: ${lastExecutedCell}`);
    }

    contextParts.push(
      '',
      '**CRITICAL INSTRUCTIONS:**',
      '1. A notebook is ALREADY OPEN - you do NOT need to create a new notebook',
      '2. When the user asks to "create a cell", use the createCell tool',
      '3. The notebookId parameter is OPTIONAL - omit it to use the active notebook',
      '4. Example: createCell({ cellType: "code", content: "import pandas as pd" })',
      '',
      '**Available Tools for Notebooks:**',
      '- createCell - Add a new cell to the active notebook',
      '- updateCell - Modify an existing cell',
      '- getCells - View all cells in the notebook',
      '- deleteCell - Remove a cell',
      '- executeCell - Run a code cell and capture its output',
      '- getCellOutput - Retrieve the output from a previously executed cell',
      '- saveNotebook - Save the notebook to disk',
      '',
      'There is NO createNotebook tool. Work with the notebook that is already open.'
    );

    return contextParts.join('\n');
  }

  /**
   * Notify listeners that the conversation history has changed
   * This triggers persistence callbacks
   */
  private _notifyHistoryChange(): void {
    if (this._onHistoryChange) {
      this._onHistoryChange(this.getHistory());
    }
  }

  /**
   * Load conversation history from a saved state
   * Replaces the current conversation with the loaded history
   * 
   * @param messages - Array of messages to restore
   */
  loadHistory(messages: IMessage[]): void {
    console.log('[ConversationManager] Loading conversation history with', messages.length, 'messages');
    
    this._messages = messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp) // Ensure timestamp is a Date object
    }));
    
    this._notifyHistoryChange();
  }

  /**
   * Export conversation history as a serializable object
   * Useful for saving to storage
   * 
   * @returns Serializable conversation history
   */
  exportHistory(): any[] {
    return this._messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      toolCalls: msg.toolCalls,
      toolCallId: msg.toolCallId,
      timestamp: msg.timestamp.toISOString(),
      metadata: msg.metadata
    }));
  }

  /**
   * Set callback for pending tools changes (for UI updates)
   */
  setOnPendingToolsChange(callback: (toolCalls: IToolCall[] | null) => void): void {
    this._onPendingToolsChange = callback;
  }

  /**
   * Get pending tool calls for UI display
   */
  getPendingToolCalls(): IToolCall[] | null {
    return this._pendingApproval?.toolCalls || null;
  }

  /**
   * Approve pending tool calls (called from UI)
   */
  approvePendingTools(): void {
    if (this._pendingApproval) {
      console.log('[ConversationManager] Tools approved by user');
      this._pendingApproval.resolve(true);
      this._pendingApproval = null;
      this._onPendingToolsChange?.(null);
    }
  }

  /**
   * Reject pending tool calls (called from UI)
   */
  rejectPendingTools(): void {
    if (this._pendingApproval) {
      console.log('[ConversationManager] Tools rejected by user');
      this._pendingApproval.resolve(false);
      this._pendingApproval = null;
      this._onPendingToolsChange?.(null);
    }
  }

  /**
   * Wait for user approval in manual mode
   */
  private _waitForApproval(toolCalls: IToolCall[]): Promise<boolean> {
    return new Promise(resolve => {
      this._pendingApproval = { toolCalls, resolve };
      this._onPendingToolsChange?.(toolCalls);
    });
  }

  /**
   * Update LLM client settings (for model changes)
   */
  updateLLMSettings(settings: Partial<{ provider: string; model: string }>): void {
    const currentSettings = this._llmClient.getSettings();
    this._llmClient.updateSettings({
      ...currentSettings,
      provider: (settings.provider as any) || currentSettings.provider,
      model: settings.model || currentSettings.model
    });
    console.log('[ConversationManager] LLM settings updated:', settings);
  }

  /**
   * Get current LLM settings
   */
  getLLMSettings(): { provider: string; model: string } {
    const settings = this._llmClient.getSettings();
    return {
      provider: settings.provider,
      model: settings.model || ''
    };
  }
}
