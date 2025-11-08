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
}
