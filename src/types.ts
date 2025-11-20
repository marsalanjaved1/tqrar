/**
 * Core type definitions for the JupyterLab AI Assistant
 */

/**
 * Message interface for conversation history
 */
export interface IMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: IToolCall[];
  toolCallId?: string;
  timestamp: Date;
  metadata?: {
    notebookId?: string;
    cellIndex?: number;
  };
  /**
   * Content that comes after tool execution (for linear flow)
   * Only present on assistant messages with toolCalls
   */
  finalContent?: string;
}

/**
 * Tool call interface for LLM function calling
 */
export interface IToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
  /**
   * Index of this tool call in a multi-tool-call response
   * Used during streaming to properly accumulate deltas
   */
  index?: number;
}

/**
 * Tool schema interface for defining available tools
 */
export interface IToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Tool result interface for tool execution results
 */
export interface IToolResult {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Settings interface for LLM provider configuration
 */
export interface ISettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model?: string; // For OpenRouter
  baseUrl?: string; // For local models
  temperature?: number;
  maxTokens?: number;
}

/**
 * Context interface for notebook and workspace state
 */
export interface IContext {
  activeNotebookId: string | null;
  openNotebooks: Array<{
    id: string;
    path: string;
    name: string;
  }>;
  kernelStatus?: string;
}

/**
 * Notebook context interface with detailed information
 */
export interface INotebookContext {
  id: string;
  path: string;
  name: string;
  cells: ICellInfo[];
  kernelInfo: IKernelInfo;
}

/**
 * Cell information interface
 */
export interface ICellInfo {
  index: number;
  type: 'code' | 'markdown' | 'raw';
  content: string;
  executionCount?: number;
  outputs?: any[];
}

/**
 * Kernel information interface
 */
export interface IKernelInfo {
  name: string;
  status: string;
  language: string;
}

/**
 * Chat completion chunk interface for streaming responses
 */
export interface IChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: {
      role?: string;
      content?: string;
      tool_calls?: IToolCall[];
    };
    finish_reason?: string;
  }>;
}

/**
 * Tool interface for implementing tools
 */
export interface ITool {
  name: string;
  schema: IToolSchema;
  execute(args: Record<string, any>): Promise<IToolResult>;
  category: 'read' | 'write';
}

/**
 * Tool execution status
 */
export type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error';

/**
 * Execution mode for controlling tool availability
 */
export type ExecutionMode = 'act' | 'plan';

/**
 * Execution settings interface for controlling agent behavior
 */
export interface IExecutionSettings {
  /**
   * Execution mode - determines which tools are available
   * - 'act': All tools available (read + write)
   * - 'plan': Only read tools available
   */
  mode: ExecutionMode;
  
  /**
   * Auto mode - controls automatic execution in Act mode
   * When true, agent executes tools automatically without approval
   * Only relevant when mode is 'act'
   */
  autoMode: boolean;
}

/**
 * Tool execution event interface
 * Contains all information about a tool execution
 */
export interface IToolExecutionEvent {
  /**
   * Unique execution ID
   */
  id: string;

  /**
   * Original tool call from LLM
   */
  toolCall: IToolCall;

  /**
   * Current execution status
   */
  status: ToolExecutionStatus;

  /**
   * When execution started
   */
  startTime: Date;

  /**
   * When execution completed (if finished)
   */
  endTime?: Date;

  /**
   * Execution duration in milliseconds (if finished)
   */
  duration?: number;

  /**
   * Result if successful
   */
  result?: IToolResult;

  /**
   * Error if failed
   */
  error?: {
    message: string;
    type: string;
    stack?: string;
  };
}

/**
 * Tool metadata interface for display and categorization
 */
export interface IToolMetadata {
  /**
   * Internal tool name (e.g., 'createCell')
   */
  name: string;

  /**
   * Human-readable display name (e.g., 'Create Cell')
   */
  displayName: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Icon identifier for the tool
   */
  icon: string;

  /**
   * Tool category for grouping and styling
   */
  category: 'notebook' | 'file' | 'inspection' | 'other';

  /**
   * Theme color for the tool (CSS variable or hex)
   */
  color: string;
}
