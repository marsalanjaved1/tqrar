/**
 * Agent Controller for Tqrar
 * 
 * Clean implementation of the agentic loop with:
 * - Smart stopping conditions
 * - Human-readable output
 * - Autopilot/manual mode support
 * - Checkpoint management
 */

import { IMessage, IToolCall, IToolResult, IExecutionSettings } from '../types';
import { LLMClient } from '../llm/client';
import { ToolRegistry } from '../tools/registry';
import { ContextManager } from '../context';
import { ToolExecutionTracker } from '../tools/ToolExecutionTracker';
import { SYSTEM_PROMPT, generateNotebookContext, isCompletionResponse } from './prompts';
import { formatToolResult, isBlockingError } from './formatter';

/**
 * Agent state for tracking loop progress
 */
export interface IAgentState {
  iteration: number;
  maxIterations: number;
  toolCallsExecuted: number;
  lastToolCalls: string[];  // Track to detect loops
  isComplete: boolean;
  error?: string;
}

/**
 * Options for creating an AgentController
 */
export interface IAgentControllerOptions {
  llmClient: LLMClient;
  toolRegistry: ToolRegistry;
  contextManager: ContextManager;
  toolExecutionTracker?: ToolExecutionTracker;
  onHistoryChange?: (messages: IMessage[]) => void;
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
 * AgentController - manages the agentic conversation loop
 */
export class AgentController {
  private _messages: IMessage[];
  private _llmClient: LLMClient;
  private _toolRegistry: ToolRegistry;
  private _contextManager: ContextManager;
  private _toolExecutionTracker: ToolExecutionTracker;
  private _onHistoryChange?: (messages: IMessage[]) => void;
  
  // Pending approval for manual mode
  private _pendingApproval: IPendingToolApproval | null = null;

  constructor(options: IAgentControllerOptions) {
    this._llmClient = options.llmClient;
    this._toolRegistry = options.toolRegistry;
    this._contextManager = options.contextManager;
    this._toolExecutionTracker = options.toolExecutionTracker || new ToolExecutionTracker();
    this._onHistoryChange = options.onHistoryChange;

    // Initialize with system prompt or restore history
    if (options.initialHistory?.length) {
      this._messages = options.initialHistory.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } else {
      this._messages = [{
        role: 'system',
        content: SYSTEM_PROMPT,
        timestamp: new Date()
      }];
    }
  }

  /**
   * Send a message and get a streaming response
   * This is the main entry point for the agentic loop
   */
  async *sendMessage(
    content: string, 
    settings: IExecutionSettings
  ): AsyncGenerator<string> {
    // Add user message
    const userMessage: IMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    this._messages.push(userMessage);
    this._notifyHistoryChange();

    // Initialize agent state
    const state: IAgentState = {
      iteration: 0,
      maxIterations: 5,  // Reduced from 20!
      toolCallsExecuted: 0,
      lastToolCalls: [],
      isComplete: false
    };

    try {
      // Main agentic loop
      while (!state.isComplete && state.iteration < state.maxIterations) {
        state.iteration++;
        
        console.log(`[AgentController] Iteration ${state.iteration}/${state.maxIterations}`);

        // Get LLM response
        const { content: responseContent, toolCalls } = await this._getLLMResponse(settings);

        // If there's text content, yield it
        if (responseContent) {
          yield responseContent;
        }

        // No tool calls = task complete
        if (!toolCalls || toolCalls.length === 0) {
          state.isComplete = true;
          break;
        }

        // Check for repetitive tool calls (stuck in loop)
        const currentToolNames = toolCalls.map(tc => tc.function.name).sort().join(',');
        if (state.lastToolCalls.includes(currentToolNames)) {
          console.log('[AgentController] Detected repetitive tool calls, stopping');
          yield '\n\n_Stopping to avoid repetition. Let me know if you need anything else._';
          state.isComplete = true;
          break;
        }
        state.lastToolCalls.push(currentToolNames);
        if (state.lastToolCalls.length > 3) {
          state.lastToolCalls.shift();
        }

        // Handle tool calls based on mode
        if (!settings.autoMode) {
          // Manual mode - wait for approval
          yield '\n\n⏸️ **Waiting for approval...**\n';
          const approved = await this._waitForApproval(toolCalls);
          
          if (!approved) {
            yield '\n❌ Tools rejected. Let me know what you\'d like to do instead.\n';
            state.isComplete = true;
            break;
          }
        }

        // Execute tools and yield formatted results
        yield '\n';
        for (const toolCall of toolCalls) {
          const result = await this._executeTool(toolCall);
          state.toolCallsExecuted++;
          
          // Format and yield result
          const formatted = formatToolResult(toolCall, result);
          yield formatted + '\n';

          // Check for blocking errors
          if (isBlockingError(result)) {
            yield '\n_Stopping due to error. Please fix the issue and try again._\n';
            state.isComplete = true;
            break;
          }
        }

        // Check if response indicates completion
        if (responseContent && isCompletionResponse(responseContent)) {
          state.isComplete = true;
        }
      }

      // Handle max iterations reached
      if (state.iteration >= state.maxIterations && !state.isComplete) {
        yield '\n\n---\n⚠️ Reached maximum iterations. Task may be incomplete.\n';
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      yield `\n\n❌ **Error:** ${errorMsg}\n`;
      
      // Add error to history
      this._messages.push({
        role: 'assistant',
        content: `[Error: ${errorMsg}]`,
        timestamp: new Date()
      });
      this._notifyHistoryChange();
    }
  }

  /**
   * Get LLM response with tool calls
   */
  private async _getLLMResponse(settings: IExecutionSettings): Promise<{
    content: string;
    toolCalls: IToolCall[];
  }> {
    // Prepare messages with context
    const messagesWithContext = [...this._messages];
    
    // Inject notebook context
    const notebookContext = this._getNotebookContext();
    if (notebookContext) {
      messagesWithContext.push({
        role: 'system',
        content: notebookContext,
        timestamp: new Date()
      });
    }

    // Get available tools
    const tools = this._toolRegistry.getSchemas(settings.mode);

    // Stream LLM response
    let content = '';
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

    for await (const chunk of this._llmClient.streamCompletion(messagesWithContext, tools)) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      // Accumulate content
      if (choice.delta.content) {
        content += choice.delta.content;
      }

      // Accumulate tool calls
      if (choice.delta.tool_calls) {
        for (const tc of choice.delta.tool_calls) {
          const index = (tc as any).index ?? 0;
          
          if (!toolCallsMap.has(index)) {
            toolCallsMap.set(index, { id: '', name: '', arguments: '' });
          }
          
          const toolCall = toolCallsMap.get(index)!;
          if (tc.id) toolCall.id = tc.id;
          if (tc.function?.name) toolCall.name = tc.function.name;
          if (tc.function?.arguments) toolCall.arguments += tc.function.arguments;
        }
      }
    }

    // Convert to IToolCall array
    const toolCalls: IToolCall[] = Array.from(toolCallsMap.values())
      .filter(tc => tc.id && tc.name)
      .map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: tc.arguments
        }
      }));

    // Add assistant message to history
    const assistantMessage: IMessage = {
      role: 'assistant',
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      timestamp: new Date()
    };
    this._messages.push(assistantMessage);
    this._notifyHistoryChange();

    return { content, toolCalls };
  }

  /**
   * Execute a single tool call
   */
  private async _executeTool(toolCall: IToolCall): Promise<IToolResult> {
    const executionId = this._toolExecutionTracker.startExecution(toolCall);

    try {
      // Parse arguments
      const argsString = toolCall.function.arguments.trim();
      const args = argsString === '' ? {} : JSON.parse(argsString);

      // Execute
      const result = await this._toolRegistry.execute(toolCall.function.name, args);

      // Track completion
      this._toolExecutionTracker.completeExecution(executionId, result);

      // Add tool result to history
      this._messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.id,
        timestamp: new Date()
      });
      this._notifyHistoryChange();

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this._toolExecutionTracker.failExecution(executionId, errorObj);

      const result: IToolResult = {
        success: false,
        error: {
          message: errorObj.message,
          type: errorObj.name
        }
      };

      // Add error to history
      this._messages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.id,
        timestamp: new Date()
      });
      this._notifyHistoryChange();

      return result;
    }
  }

  /**
   * Wait for user approval in manual mode
   */
  private _waitForApproval(toolCalls: IToolCall[]): Promise<boolean> {
    return new Promise(resolve => {
      this._pendingApproval = { toolCalls, resolve };
    });
  }

  /**
   * Approve pending tool calls (called from UI)
   */
  approvePendingTools(): void {
    if (this._pendingApproval) {
      this._pendingApproval.resolve(true);
      this._pendingApproval = null;
    }
  }

  /**
   * Reject pending tool calls (called from UI)
   */
  rejectPendingTools(): void {
    if (this._pendingApproval) {
      this._pendingApproval.resolve(false);
      this._pendingApproval = null;
    }
  }

  /**
   * Get pending tool calls for UI display
   */
  getPendingToolCalls(): IToolCall[] | null {
    return this._pendingApproval?.toolCalls || null;
  }

  /**
   * Get notebook context for injection
   */
  private _getNotebookContext(): string | null {
    const context = this._contextManager.getContext();
    
    if (!context.activeNotebookId) {
      return null;
    }

    const activeNotebook = this._contextManager.getActiveNotebook();
    if (!activeNotebook) {
      return null;
    }

    const notebookInfo = context.openNotebooks.find(
      nb => nb.id === context.activeNotebookId
    );
    if (!notebookInfo) {
      return null;
    }

    const cellCount = activeNotebook.content.model?.cells.length || 0;

    return generateNotebookContext({
      name: notebookInfo.name,
      path: notebookInfo.path,
      cellCount,
      kernelStatus: context.kernelStatus || 'unknown'
    });
  }

  /**
   * Notify listeners of history changes
   */
  private _notifyHistoryChange(): void {
    if (this._onHistoryChange) {
      this._onHistoryChange([...this._messages]);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): IMessage[] {
    return [...this._messages];
  }

  /**
   * Clear conversation
   */
  clear(): void {
    this._messages = [{
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date()
    }];
    this._notifyHistoryChange();
  }

  /**
   * Load history from saved state
   */
  loadHistory(messages: IMessage[]): void {
    this._messages = messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    this._notifyHistoryChange();
  }

  /**
   * Get tool execution tracker
   */
  getToolExecutionTracker(): ToolExecutionTracker {
    return this._toolExecutionTracker;
  }
}
