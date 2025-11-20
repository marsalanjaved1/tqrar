/**
 * Execution tools for cell execution, notebook saving, and output retrieval
 */

import { INotebookTracker, NotebookPanel, NotebookActions } from '@jupyterlab/notebook';
import { ICodeCellModel } from '@jupyterlab/cells';
import { ITool, IToolResult, IToolSchema } from '../types';
import { ErrorHandler } from '../utils/errors';

/**
 * Cell output interface
 */
export interface ICellOutput {
  outputType: 'stream' | 'display_data' | 'execute_result' | 'error';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Arguments for ExecuteCellTool
 */
export interface IExecuteCellArgs {
  cellIndex: number;
  notebookId?: string;
}

/**
 * Result from ExecuteCellTool
 */
export interface IExecuteCellResult {
  success: boolean;
  data?: {
    executionCount: number;
    outputs: ICellOutput[];
    hasError: boolean;
    error?: {
      name: string;
      message: string;
      traceback: string[];
    };
    executionTime: number;
  };
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Arguments for SaveNotebookTool
 */
export interface ISaveNotebookArgs {
  notebookId?: string;
}

/**
 * Result from SaveNotebookTool
 */
export interface ISaveNotebookResult {
  success: boolean;
  data?: {
    path: string;
    name: string;
    savedAt: string;
    hasUnsavedChanges: boolean;
  };
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Arguments for GetCellOutputTool
 */
export interface IGetCellOutputArgs {
  cellIndex: number;
  notebookId?: string;
}

/**
 * Result from GetCellOutputTool
 */
export interface IGetCellOutputResult {
  success: boolean;
  data?: {
    cellIndex: number;
    executionCount: number | null;
    hasOutput: boolean;
    outputs: ICellOutput[];
    hasError: boolean;
    error?: {
      name: string;
      message: string;
      traceback: string[];
    };
  };
  error?: {
    message: string;
    type: string;
  };
}

/**
 * Base class for execution tools
 */
abstract class BaseExecutionTool implements ITool {
  abstract name: string;
  abstract category: 'read' | 'write';
  abstract schema: IToolSchema;

  constructor(protected notebookTracker: INotebookTracker) {}

  abstract execute(args: Record<string, any>): Promise<IToolResult>;

  /**
   * Find a notebook by ID
   */
  protected findNotebook(notebookId: string): NotebookPanel | null {
    if (!notebookId) {
      return this.notebookTracker.currentWidget;
    }

    const notebooks = this.notebookTracker.filter(() => true);
    return notebooks.find(nb => nb.id === notebookId) || null;
  }

  /**
   * Get the current active notebook
   */
  protected getCurrentNotebook(): NotebookPanel | null {
    return this.notebookTracker.currentWidget;
  }
}

/**
 * Tool to execute a notebook cell and capture its output
 */
export class ExecuteCellTool extends BaseExecutionTool {
  name = 'executeCell';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeCell',
      description: 'Execute a notebook cell and capture its output, including stdout, stderr, display data, and errors. Returns execution count, outputs, and error information if the cell fails.',
      parameters: {
        type: 'object',
        properties: {
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to execute.'
          },
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: IExecuteCellArgs): Promise<IExecuteCellResult> {
    try {
      const notebook = args.notebookId
        ? this.findNotebook(args.notebookId)
        : this.getCurrentNotebook();

      if (!notebook) {
        return {
          success: false,
          error: {
            message: args.notebookId
              ? `Notebook not found: ${args.notebookId}`
              : 'No active notebook found. Please open a notebook first.',
            type: 'NotFoundError'
          }
        };
      }

      // Validate cell index
      const cellWidgets = notebook.content.widgets;
      if (args.cellIndex < 0 || args.cellIndex >= cellWidgets.length) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellWidgets.length} cells (indices 0-${cellWidgets.length - 1}).`,
            type: 'IndexError'
          }
        };
      }

      const cell = cellWidgets[args.cellIndex];
      const cellModel = cell.model;

      // Check if it's a code cell
      if (cellModel.type !== 'code') {
        return {
          success: false,
          error: {
            message: `Cell at index ${args.cellIndex} is not a code cell (type: ${cellModel.type}). Only code cells can be executed.`,
            type: 'ValidationError'
          }
        };
      }

      // Check kernel status
      const kernel = notebook.sessionContext?.session?.kernel;
      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelError'
          }
        };
      }

      if (kernel.status !== 'idle' && kernel.status !== 'busy') {
        return {
          success: false,
          error: {
            message: `Kernel is not ready (status: ${kernel.status}). Please wait for the kernel to be ready.`,
            type: 'KernelError'
          }
        };
      }

      // Execute the cell with 30-second timeout
      const startTime = Date.now();
      
      try {
        // Wrap execution in timeout
        await ErrorHandler.withTimeout(
          async () => {
            // Set the active cell to the one we want to execute
            notebook.content.activeCellIndex = args.cellIndex;
            
            // Execute using NotebookActions
            await NotebookActions.run(notebook.content, notebook.sessionContext);
          },
          30000, // 30 seconds timeout
          `Cell execution timed out after 30 seconds. The cell may contain long-running code or an infinite loop.`
        );
      } catch (error) {
        // Check if it's a timeout error
        if (error instanceof Error && error.name === 'TimeoutError') {
          const executionTime = Date.now() - startTime;
          
          // Get the code cell model to check for partial outputs
          const codeModel = cellModel as ICodeCellModel;
          const outputs: ICellOutput[] = [];
          
          // Try to capture any partial outputs that were generated before timeout
          const outputsList = codeModel.outputs;
          for (let i = 0; i < outputsList.length; i++) {
            const output = outputsList.get(i);
            const outputType = output.type as 'stream' | 'display_data' | 'execute_result' | 'error';

            if (outputType === 'stream') {
              const streamOutput = output as any;
              outputs.push({
                outputType: 'stream',
                content: streamOutput.text || '',
                metadata: output.metadata
              });
            } else if (outputType === 'execute_result' || outputType === 'display_data') {
              const dataOutput = output as any;
              let content = '';
              if (dataOutput.data) {
                if (dataOutput.data['text/plain']) {
                  content = dataOutput.data['text/plain'];
                } else if (dataOutput.data['text/html']) {
                  content = dataOutput.data['text/html'];
                } else {
                  content = JSON.stringify(dataOutput.data);
                }
              }
              outputs.push({
                outputType,
                content,
                metadata: output.metadata
              });
            }
          }
          
          return {
            success: false,
            data: {
              executionCount: codeModel.executionCount || 0,
              outputs,
              hasError: true,
              error: {
                name: 'TimeoutError',
                message: error.message,
                traceback: [
                  'Cell execution exceeded the 30-second timeout limit.',
                  'This may indicate:',
                  '  - Long-running computation',
                  '  - Infinite loop',
                  '  - Blocking I/O operation',
                  '  - Large data processing',
                  '',
                  'Suggestions:',
                  '  - Break down the computation into smaller steps',
                  '  - Add progress indicators to monitor execution',
                  '  - Check for infinite loops',
                  '  - Consider using async operations for I/O'
                ]
              },
              executionTime
            },
            error: {
              message: error.message,
              type: 'TimeoutError'
            }
          };
        }
        
        // Re-throw other errors to be caught by outer try-catch
        throw error;
      }
      
      const executionTime = Date.now() - startTime;

      // Get the code cell model to access outputs
      const codeModel = cellModel as ICodeCellModel;
      const executionCount = codeModel.executionCount || 0;

      // Parse outputs
      const outputs: ICellOutput[] = [];
      let hasError = false;
      let errorInfo: { name: string; message: string; traceback: string[] } | undefined;

      const outputsList = codeModel.outputs;
      for (let i = 0; i < outputsList.length; i++) {
        const output = outputsList.get(i);
        const outputType = output.type as 'stream' | 'display_data' | 'execute_result' | 'error';

        if (outputType === 'error') {
          hasError = true;
          const errorOutput = output as any;
          errorInfo = {
            name: errorOutput.ename || 'Error',
            message: errorOutput.evalue || 'Unknown error',
            traceback: errorOutput.traceback || []
          };
          outputs.push({
            outputType: 'error',
            content: errorInfo.traceback.join('\n'),
            metadata: output.metadata
          });
        } else if (outputType === 'stream') {
          const streamOutput = output as any;
          outputs.push({
            outputType: 'stream',
            content: streamOutput.text || '',
            metadata: output.metadata
          });
        } else if (outputType === 'execute_result' || outputType === 'display_data') {
          const dataOutput = output as any;
          // Try to get text representation
          let content = '';
          if (dataOutput.data) {
            if (dataOutput.data['text/plain']) {
              content = dataOutput.data['text/plain'];
            } else if (dataOutput.data['text/html']) {
              content = dataOutput.data['text/html'];
            } else {
              content = JSON.stringify(dataOutput.data);
            }
          }
          outputs.push({
            outputType,
            content,
            metadata: output.metadata
          });
        }
      }

      return {
        success: true,
        data: {
          executionCount,
          outputs,
          hasError,
          error: errorInfo,
          executionTime
        }
      };
    } catch (error) {
      return ErrorHandler.handleToolError(
        error instanceof Error ? error : new Error(String(error)),
        this.name
      );
    }
  }
}

/**
 * Tool to save a notebook to disk
 */
export class SaveNotebookTool extends BaseExecutionTool {
  name = 'saveNotebook';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'saveNotebook',
      description: 'Save a notebook to disk. Persists all changes including cell content, outputs, and metadata.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, saves the currently active notebook.'
          }
        },
        required: []
      }
    }
  };

  async execute(args: ISaveNotebookArgs): Promise<ISaveNotebookResult> {
    try {
      const notebook = args.notebookId
        ? this.findNotebook(args.notebookId)
        : this.getCurrentNotebook();

      if (!notebook) {
        return {
          success: false,
          error: {
            message: args.notebookId
              ? `Notebook not found: ${args.notebookId}`
              : 'No active notebook found. Please open a notebook first.',
            type: 'NotFoundError'
          }
        };
      }

      const context = notebook.context;
      const hadUnsavedChanges = context.model?.dirty || false;

      // Check if the notebook has a valid path
      if (!context.path) {
        return {
          success: false,
          error: {
            message: 'Notebook does not have a valid path. Please save the notebook manually first to set a file path.',
            type: 'PathNotFoundError'
          }
        };
      }

      // Save the notebook
      try {
        await context.save();
      } catch (saveError) {
        // Handle specific save errors
        const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
        
        // Check for common error patterns
        if (errorMessage.toLowerCase().includes('permission') || 
            errorMessage.toLowerCase().includes('eacces')) {
          return {
            success: false,
            error: {
              message: `Permission denied: Cannot save notebook to ${context.path}. Please check file permissions or try saving to a different location.`,
              type: 'PermissionError'
            }
          };
        }
        
        if (errorMessage.toLowerCase().includes('enospc') || 
            errorMessage.toLowerCase().includes('disk') ||
            errorMessage.toLowerCase().includes('space')) {
          return {
            success: false,
            error: {
              message: `Insufficient disk space: Cannot save notebook to ${context.path}. Please free up disk space and try again.`,
              type: 'DiskFullError'
            }
          };
        }
        
        if (errorMessage.toLowerCase().includes('enoent') || 
            errorMessage.toLowerCase().includes('not found')) {
          return {
            success: false,
            error: {
              message: `Path not found: The directory for ${context.path} does not exist. Please ensure the parent directory exists.`,
              type: 'PathNotFoundError'
            }
          };
        }
        
        // Generic save error
        return {
          success: false,
          error: {
            message: `Failed to save notebook: ${errorMessage}`,
            type: 'SaveError'
          }
        };
      }

      return {
        success: true,
        data: {
          path: context.path,
          name: notebook.title.label,
          savedAt: new Date().toISOString(),
          hasUnsavedChanges: context.model?.dirty || false
        }
      };
    } catch (error) {
      return ErrorHandler.handleToolError(
        error instanceof Error ? error : new Error(String(error)),
        this.name
      );
    }
  }
}

/**
 * Tool to retrieve cell output without executing
 */
export class GetCellOutputTool extends BaseExecutionTool {
  name = 'getCellOutput';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCellOutput',
      description: 'Retrieve the output of a previously executed cell without re-executing it. Returns execution count, outputs, and error information if present.',
      parameters: {
        type: 'object',
        properties: {
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to get output from.'
          },
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: IGetCellOutputArgs): Promise<IGetCellOutputResult> {
    try {
      const notebook = args.notebookId
        ? this.findNotebook(args.notebookId)
        : this.getCurrentNotebook();

      if (!notebook) {
        return {
          success: false,
          error: {
            message: args.notebookId
              ? `Notebook not found: ${args.notebookId}`
              : 'No active notebook found. Please open a notebook first.',
            type: 'NotFoundError'
          }
        };
      }

      // Validate cell index
      const cellWidgets = notebook.content.widgets;
      if (args.cellIndex < 0 || args.cellIndex >= cellWidgets.length) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellWidgets.length} cells (indices 0-${cellWidgets.length - 1}).`,
            type: 'IndexError'
          }
        };
      }

      const cell = cellWidgets[args.cellIndex];
      const cellModel = cell.model;

      // Check if it's a code cell
      if (cellModel.type !== 'code') {
        return {
          success: false,
          error: {
            message: `Cell at index ${args.cellIndex} is not a code cell (type: ${cellModel.type}). Only code cells have outputs.`,
            type: 'ValidationError'
          }
        };
      }

      const codeModel = cellModel as ICodeCellModel;
      const executionCount = codeModel.executionCount;
      const hasOutput = codeModel.outputs.length > 0;

      // Parse outputs
      const outputs: ICellOutput[] = [];
      let hasError = false;
      let errorInfo: { name: string; message: string; traceback: string[] } | undefined;

      const outputsList = codeModel.outputs;
      for (let i = 0; i < outputsList.length; i++) {
        const output = outputsList.get(i);
        const outputType = output.type as 'stream' | 'display_data' | 'execute_result' | 'error';

        if (outputType === 'error') {
          hasError = true;
          const errorOutput = output as any;
          errorInfo = {
            name: errorOutput.ename || 'Error',
            message: errorOutput.evalue || 'Unknown error',
            traceback: errorOutput.traceback || []
          };
          outputs.push({
            outputType: 'error',
            content: errorInfo.traceback.join('\n'),
            metadata: output.metadata
          });
        } else if (outputType === 'stream') {
          const streamOutput = output as any;
          outputs.push({
            outputType: 'stream',
            content: streamOutput.text || '',
            metadata: output.metadata
          });
        } else if (outputType === 'execute_result' || outputType === 'display_data') {
          const dataOutput = output as any;
          let content = '';
          if (dataOutput.data) {
            if (dataOutput.data['text/plain']) {
              content = dataOutput.data['text/plain'];
            } else if (dataOutput.data['text/html']) {
              content = dataOutput.data['text/html'];
            } else {
              content = JSON.stringify(dataOutput.data);
            }
          }
          outputs.push({
            outputType,
            content,
            metadata: output.metadata
          });
        }
      }

      return {
        success: true,
        data: {
          cellIndex: args.cellIndex,
          executionCount: executionCount || null,
          hasOutput,
          outputs,
          hasError,
          error: errorInfo
        }
      };
    } catch (error) {
      return ErrorHandler.handleToolError(
        error instanceof Error ? error : new Error(String(error)),
        this.name
      );
    }
  }
}
