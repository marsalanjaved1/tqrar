/**
 * Result Formatter for Tqrar Agent
 * 
 * Converts tool results into human-readable summaries
 * that are displayed inline in the chat.
 */

import { IToolCall, IToolResult } from '../types';

/**
 * Format a tool result for display to the user
 */
export function formatToolResult(
  toolCall: IToolCall,
  result: IToolResult
): string {
  const name = toolCall.function.name;
  let args: Record<string, any> = {};
  
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
  } catch {
    // Ignore parse errors
  }

  // Handle errors
  if (!result.success) {
    const errorMsg = result.error?.message || 'Unknown error';
    return `❌ **${formatToolName(name)}** failed: ${errorMsg}`;
  }

  // Format based on tool type
  switch (name) {
    // Notebook tools
    case 'createCell':
      return formatCreateCell(args, result);
    case 'updateCell':
      return formatUpdateCell(args, result);
    case 'deleteCell':
      return formatDeleteCell(args, result);
    case 'executeCell':
      return formatExecuteCell(args, result);
    case 'getCellOutput':
      return formatGetCellOutput(args, result);
    case 'getCells':
      return formatGetCells(args, result);
    case 'getCell':
      return formatGetCell(args, result);
    case 'saveNotebook':
      return formatSaveNotebook(args, result);
    
    // File tools
    case 'readFile':
      return formatReadFile(args, result);
    case 'writeFile':
      return formatWriteFile(args, result);
    case 'listFiles':
      return formatListFiles(args, result);
    case 'deleteFile':
      return formatDeleteFile(args, result);
    
    // Inspection tools
    case 'getCompletions':
      return formatGetCompletions(args, result);
    case 'getDocumentation':
      return formatGetDocumentation(args, result);
    case 'inspectCode':
      return formatInspectCode(args, result);
    
    default:
      return formatGenericResult(name, result);
  }
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Truncate long strings
 */
function truncate(str: string, maxLength: number = 500): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// ============ Notebook Tool Formatters ============

function formatCreateCell(args: any, result: IToolResult): string {
  const cellType = args.cellType || 'code';
  const index = result.data?.cellIndex ?? 'end';
  const content = args.content || '';
  const preview = truncate(content, 100);
  
  return `✓ Created **${cellType}** cell at index ${index}\n\`\`\`\n${preview}\n\`\`\``;
}

function formatUpdateCell(args: any, result: IToolResult): string {
  const index = args.cellIndex;
  return `✓ Updated cell ${index}`;
}

function formatDeleteCell(args: any, result: IToolResult): string {
  const index = args.cellIndex;
  return `✓ Deleted cell ${index}`;
}

function formatExecuteCell(args: any, result: IToolResult): string {
  const index = args.cellIndex;
  const data = result.data;
  
  if (!data) {
    return `✓ Executed cell ${index}`;
  }
  
  // Check for errors
  if (data.hasError && data.error) {
    const errorName = data.error.name || 'Error';
    const errorMsg = data.error.message || 'Unknown error';
    return `⚠️ Cell ${index} executed with **${errorName}**:\n\`\`\`\n${truncate(errorMsg, 300)}\n\`\`\``;
  }
  
  // Format outputs
  const outputs = data.outputs || [];
  if (outputs.length === 0) {
    return `✓ Executed cell ${index} (no output)`;
  }
  
  // Get the most relevant output
  const output = outputs.find((o: any) => 
    o.outputType === 'execute_result' || 
    o.outputType === 'display_data' ||
    o.outputType === 'stream'
  );
  
  if (output) {
    const content = truncate(output.content || '', 500);
    const time = data.executionTime ? ` (${data.executionTime}ms)` : '';
    return `✓ Executed cell ${index}${time}:\n\`\`\`\n${content}\n\`\`\``;
  }
  
  return `✓ Executed cell ${index}`;
}

function formatGetCellOutput(args: any, result: IToolResult): string {
  const index = args.cellIndex;
  const data = result.data;
  
  if (!data || !data.hasOutput) {
    return `📋 Cell ${index} has no output`;
  }
  
  // Check for errors
  if (data.hasError && data.error) {
    return `⚠️ Cell ${index} has error:\n\`\`\`\n${truncate(data.error.message, 300)}\n\`\`\``;
  }
  
  // Get output content
  const outputs = data.outputs || [];
  const output = outputs.find((o: any) => o.content);
  
  if (output) {
    return `📋 Cell ${index} output:\n\`\`\`\n${truncate(output.content, 500)}\n\`\`\``;
  }
  
  return `📋 Cell ${index} output retrieved`;
}

function formatGetCells(args: any, result: IToolResult): string {
  const data = result.data;
  if (!data) return '✓ Retrieved cells';
  
  const count = data.cellCount || 0;
  const cells = data.cells || [];
  
  // Create a brief summary
  const summary = cells.slice(0, 5).map((c: any) => 
    `  ${c.index}: ${c.type} - ${truncate(c.content, 50)}`
  ).join('\n');
  
  const more = count > 5 ? `\n  ... and ${count - 5} more` : '';
  
  return `📓 Notebook has ${count} cells:\n${summary}${more}`;
}

function formatGetCell(args: any, result: IToolResult): string {
  const index = args.cellIndex;
  const cell = result.data?.cell;
  
  if (!cell) return `✓ Retrieved cell ${index}`;
  
  return `📋 Cell ${index} (${cell.type}):\n\`\`\`\n${truncate(cell.content, 300)}\n\`\`\``;
}

function formatSaveNotebook(args: any, result: IToolResult): string {
  const path = result.data?.path || 'notebook';
  return `💾 Saved notebook: ${path}`;
}

// ============ File Tool Formatters ============

function formatReadFile(args: any, result: IToolResult): string {
  const path = args.path || 'file';
  const content = result.data?.content;
  
  if (!content) return `✓ Read file: ${path}`;
  
  return `📄 **${path}**:\n\`\`\`\n${truncate(content, 500)}\n\`\`\``;
}

function formatWriteFile(args: any, result: IToolResult): string {
  const path = args.path || 'file';
  return `💾 Wrote file: ${path}`;
}

function formatListFiles(args: any, result: IToolResult): string {
  const path = args.path || '/';
  const items = result.data?.items || [];
  
  if (items.length === 0) {
    return `📁 ${path} is empty`;
  }
  
  const list = items.slice(0, 10).map((item: any) => 
    `  ${item.type === 'directory' ? '📁' : '📄'} ${item.name}`
  ).join('\n');
  
  const more = items.length > 10 ? `\n  ... and ${items.length - 10} more` : '';
  
  return `📁 **${path}**:\n${list}${more}`;
}

function formatDeleteFile(args: any, result: IToolResult): string {
  const path = args.path || 'file';
  return `🗑️ Deleted: ${path}`;
}

// ============ Inspection Tool Formatters ============

function formatGetCompletions(args: any, result: IToolResult): string {
  const completions = result.data?.completions || [];
  if (completions.length === 0) {
    return '💡 No completions found';
  }
  
  const list = completions.slice(0, 5).map((c: any) => `  • ${c}`).join('\n');
  return `💡 Completions:\n${list}`;
}

function formatGetDocumentation(args: any, result: IToolResult): string {
  const doc = result.data?.documentation;
  if (!doc) return '📖 No documentation found';
  
  return `📖 Documentation:\n${truncate(doc, 500)}`;
}

function formatInspectCode(args: any, result: IToolResult): string {
  const info = result.data;
  if (!info) return '🔍 No inspection data';
  
  return `🔍 Inspection result:\n\`\`\`\n${truncate(JSON.stringify(info, null, 2), 500)}\n\`\`\``;
}

// ============ Generic Formatter ============

function formatGenericResult(name: string, result: IToolResult): string {
  if (result.data) {
    const preview = truncate(JSON.stringify(result.data), 200);
    return `✓ **${formatToolName(name)}**: ${preview}`;
  }
  return `✓ **${formatToolName(name)}** completed`;
}

/**
 * Format multiple tool results
 */
export function formatToolResults(
  toolCalls: IToolCall[],
  results: IToolResult[]
): string {
  return toolCalls.map((tc, i) => 
    formatToolResult(tc, results[i])
  ).join('\n\n');
}

/**
 * Check if a result indicates an error that should stop the loop
 */
export function isBlockingError(result: IToolResult): boolean {
  if (result.success) return false;
  
  const errorType = result.error?.type || '';
  const blockingTypes = [
    'NotFoundError',
    'PermissionError',
    'AuthenticationError',
    'KernelError'
  ];
  
  return blockingTypes.includes(errorType);
}
