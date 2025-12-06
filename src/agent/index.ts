/**
 * Agent Module - Clean agentic architecture for Tqrar
 * 
 * This module provides:
 * - AgentController: Clean agentic loop with smart stopping
 * - Prompts: Concise system prompts
 * - Formatter: Human-readable tool result formatting
 */

// Core controller
export { AgentController } from './controller';
export type { IAgentControllerOptions, IAgentState, IPendingToolApproval } from './controller';

// Prompts
export { 
  SYSTEM_PROMPT, 
  generateNotebookContext, 
  isCompletionResponse,
  COMPLETION_INDICATORS 
} from './prompts';

// Formatters
export { 
  formatToolResult, 
  formatToolResults, 
  isBlockingError 
} from './formatter';
