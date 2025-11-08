/**
 * Code execution tools for running cells and managing outputs
 */

import { INotebookTracker, NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell, ICodeCellModel } from '@jupyterlab/cells';
import { ITool, IToolResult, IToolSchema } from '../types';
import { ErrorHandler } from '../utils/errors';

/**
 * Base class for execution tools
 */
abstract class BaseExecutionTool implements ITool {
  abstract name: string;
  abstract schema: IToolSchema;

  constructor(protected notebookTracker: INotebookTracker) {}

  abstract execute(args: Record<string, any>): Promise<IToolResult>;

  /**
   * Find a notebook by ID
   */
  protected findNotebook(notebookId: string): NotebookPanel | null {
    // If no ID provided, use current notebook
    if (!notebookId) {
      return this.notebookTracker.currentWidget;
    }

    // Search through all open notebooks
    const notebooks = this.notebookTracker.filter(() => true);
    return notebooks.find(nb => nb.id === notebookId) || null;
  }

  /**
   * Get the current active notebook
   */
  protected getCurrentNotebook(): NotebookPanel | null {
    return this.notebookTracker.currentWidget;
  }

  /**
   * Wait for cell execution to complete
   */
  protected async waitForExecution(
    notebook: NotebookPanel,
    cellIndex: number,
    timeoutMs: number = 30000
  ): Promise<void> {
    const cell = notebook.content.widgets[cellIndex];
    if (!cell || cell.model.type !== 'code') {
      return;
    }

    const codeCell = cell as CodeCell;
    const model = codeCell.model as ICodeCellModel;

    // If cell is not executing, return immediately
    if (!model.executionCount || model.executionCount > 0) {
      return;
    }

    // Wait for execution to complete or timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Cell execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Listen for execution completion
      const checkExecution = () => {
        if (model.executionCount && model.executionCount > 0) {
          clearTimeout(timeout);
          resolve();
        } else {
          // Check again in 100ms
          setTimeout(checkExecution, 100);
        }
      };

      checkExecution();
    });
  }

  /**
   * Get cell outputs
   */
  protected getCellOutputs(notebook: NotebookPanel, cellIndex: number): any[] {
    const cell = notebook.content.widgets[cellIndex];
    if (!cell || cell.model.type !== 'code') {
      return [];
    }

    const codeCell = cell as CodeCell;
    const model = codeCell.model as ICodeCellModel;
    return model.outputs.toJSON();
  }
}

/**
 * Tool to execute a single cell
 */
export class ExecuteCellTool extends BaseExecutionTool {
  name = 'executeCell';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeCell',
      description: 'Execute a code cell in a notebook and return its output. Waits for execution to complete before returning.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to execute.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { notebookId?: string; cellIndex: number }): Promise<IToolResult> {
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

      const cellWidgets = notebook.content.widgets;
      
      // Validate cell index
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
      
      // Check if it's a code cell
      if (cell.model.type !== 'code') {
        return {
          success: false,
          error: {
            message: `Cell at index ${args.cellIndex} is a ${cell.model.type} cell. Only code cells can be executed.`,
            type: 'InvalidCellTypeError'
          }
        };
      }

      // Check if kernel is available
      const sessionContext = notebook.sessionContext;
      if (!sessionContext.session?.kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Select the cell and execute it
      notebook.content.activeCellIndex = args.cellIndex;
      notebook.content.deselectAll();
      notebook.content.select(cell);

      // Execute the cell using NotebookActions
      const success = await NotebookActions.run(
        notebook.content,
        sessionContext
      );

      if (!success) {
        return {
          success: false,
          error: {
            message: 'Cell execution failed.',
            type: 'ExecutionError'
          }
        };
      }

      // Get the outputs
      const codeCell = cell as CodeCell;
      const model = codeCell.model as ICodeCellModel;
      const outputs = model.outputs.toJSON();
      const executionCount = model.executionCount;

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          cellIndex: args.cellIndex,
          executionCount,
          outputs,
          message: `Executed cell ${args.cellIndex} successfully`
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
 * Tool to execute all cells in a notebook
 */
export class ExecuteAllCellsTool extends BaseExecutionTool {
  name = 'executeAllCells';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeAllCells',
      description: 'Execute all cells in a notebook from top to bottom. Returns execution status and outputs.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          }
        },
        required: []
      }
    }
  };

  async execute(args: { notebookId?: string }): Promise<IToolResult> {
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

      // Check if kernel is available
      const sessionContext = notebook.sessionContext;
      if (!sessionContext.session?.kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      const cellCount = notebook.content.widgets.length;

      // Execute all cells using NotebookActions
      const success = await NotebookActions.runAll(
        notebook.content,
        sessionContext
      );

      if (!success) {
        return {
          success: false,
          error: {
            message: 'Execution of all cells failed.',
            type: 'ExecutionError'
          }
        };
      }

      // Collect execution counts and outputs from code cells
      const results = [];
      for (let i = 0; i < cellCount; i++) {
        const cell = notebook.content.widgets[i];
        if (cell.model.type === 'code') {
          const codeCell = cell as CodeCell;
          const model = codeCell.model as ICodeCellModel;
          results.push({
            cellIndex: i,
            executionCount: model.executionCount,
            outputs: model.outputs.toJSON()
          });
        }
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          totalCells: cellCount,
          executedCells: results.length,
          results,
          message: `Executed all ${results.length} code cells successfully`
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
 * Tool to execute all cells above a specific index
 */
export class ExecuteCellsAboveTool extends BaseExecutionTool {
  name = 'executeCellsAbove';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeCellsAbove',
      description: 'Execute all cells above (before) a specific cell index. Does not execute the cell at the specified index.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index. All cells before this index will be executed.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { notebookId?: string; cellIndex: number }): Promise<IToolResult> {
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

      const cellWidgets = notebook.content.widgets;
      
      // Validate cell index
      if (args.cellIndex < 0 || args.cellIndex >= cellWidgets.length) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellWidgets.length} cells (indices 0-${cellWidgets.length - 1}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.cellIndex === 0) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            message: 'No cells above index 0 to execute.'
          }
        };
      }

      // Check if kernel is available
      const sessionContext = notebook.sessionContext;
      if (!sessionContext.session?.kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Set active cell to the specified index
      notebook.content.activeCellIndex = args.cellIndex;

      // Execute all cells above using NotebookActions
      const success = await NotebookActions.runAllAbove(
        notebook.content,
        sessionContext
      );

      if (!success) {
        return {
          success: false,
          error: {
            message: 'Execution of cells above failed.',
            type: 'ExecutionError'
          }
        };
      }

      // Collect results from executed cells
      const results = [];
      for (let i = 0; i < args.cellIndex; i++) {
        const cell = cellWidgets[i];
        if (cell.model.type === 'code') {
          const codeCell = cell as CodeCell;
          const model = codeCell.model as ICodeCellModel;
          results.push({
            cellIndex: i,
            executionCount: model.executionCount,
            outputs: model.outputs.toJSON()
          });
        }
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          executedCells: results.length,
          results,
          message: `Executed ${results.length} code cells above index ${args.cellIndex}`
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
 * Tool to execute all cells below and including a specific index
 */
export class ExecuteCellsBelowTool extends BaseExecutionTool {
  name = 'executeCellsBelow';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeCellsBelow',
      description: 'Execute all cells at and below (after) a specific cell index. Includes the cell at the specified index.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index. This cell and all cells after it will be executed.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { notebookId?: string; cellIndex: number }): Promise<IToolResult> {
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

      const cellWidgets = notebook.content.widgets;
      
      // Validate cell index
      if (args.cellIndex < 0 || args.cellIndex >= cellWidgets.length) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellWidgets.length} cells (indices 0-${cellWidgets.length - 1}).`,
            type: 'IndexError'
          }
        };
      }

      // Check if kernel is available
      const sessionContext = notebook.sessionContext;
      if (!sessionContext.session?.kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Set active cell to the specified index
      notebook.content.activeCellIndex = args.cellIndex;

      // Execute all cells below (including current) using NotebookActions
      const success = await NotebookActions.runAllBelow(
        notebook.content,
        sessionContext
      );

      if (!success) {
        return {
          success: false,
          error: {
            message: 'Execution of cells below failed.',
            type: 'ExecutionError'
          }
        };
      }

      // Collect results from executed cells
      const results = [];
      for (let i = args.cellIndex; i < cellWidgets.length; i++) {
        const cell = cellWidgets[i];
        if (cell.model.type === 'code') {
          const codeCell = cell as CodeCell;
          const model = codeCell.model as ICodeCellModel;
          results.push({
            cellIndex: i,
            executionCount: model.executionCount,
            outputs: model.outputs.toJSON()
          });
        }
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          executedCells: results.length,
          results,
          message: `Executed ${results.length} code cells from index ${args.cellIndex} onwards`
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
 * Tool to retrieve and interpret cell outputs
 */
export class GetCellOutputTool extends BaseExecutionTool {
  name = 'getCellOutput';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCellOutput',
      description: 'Retrieve the output from a code cell. Returns text output, error messages, display data (plots, tables, HTML), and execution count.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to get output from.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { notebookId?: string; cellIndex: number }): Promise<IToolResult> {
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

      const cellWidgets = notebook.content.widgets;
      
      // Validate cell index
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
      
      // Check if it's a code cell
      if (cell.model.type !== 'code') {
        return {
          success: false,
          error: {
            message: `Cell at index ${args.cellIndex} is a ${cell.model.type} cell. Only code cells have outputs.`,
            type: 'InvalidCellTypeError'
          }
        };
      }

      const codeCell = cell as CodeCell;
      const model = codeCell.model as ICodeCellModel;
      const outputs = model.outputs.toJSON();
      const executionCount = model.executionCount;

      // Interpret outputs
      const interpretedOutputs = this.interpretOutputs(outputs);

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          cellIndex: args.cellIndex,
          executionCount,
          hasOutput: outputs.length > 0,
          outputCount: outputs.length,
          outputs: interpretedOutputs,
          rawOutputs: outputs
        }
      };
    } catch (error) {
      return ErrorHandler.handleToolError(
        error instanceof Error ? error : new Error(String(error)),
        this.name
      );
    }
  }

  /**
   * Interpret cell outputs and categorize them
   */
  private interpretOutputs(outputs: any[]): any[] {
    return outputs.map((output, index) => {
      const interpreted: any = {
        index,
        outputType: output.output_type
      };

      switch (output.output_type) {
        case 'stream':
          // Text output (stdout/stderr)
          interpreted.streamName = output.name;
          interpreted.text = Array.isArray(output.text) 
            ? output.text.join('') 
            : output.text;
          interpreted.category = 'text';
          break;

        case 'error':
          // Error output
          interpreted.errorName = output.ename;
          interpreted.errorValue = output.evalue;
          interpreted.traceback = output.traceback;
          interpreted.category = 'error';
          
          // Extract root cause from traceback
          if (output.traceback && output.traceback.length > 0) {
            const lastLine = output.traceback[output.traceback.length - 1];
            interpreted.errorMessage = lastLine;
          }
          break;

        case 'execute_result':
        case 'display_data':
          // Display data (plots, tables, HTML, etc.)
          interpreted.category = 'display';
          interpreted.mimeTypes = Object.keys(output.data || {});
          interpreted.data = output.data;

          // Identify specific data types
          if (output.data) {
            if (output.data['text/plain']) {
              interpreted.textRepresentation = Array.isArray(output.data['text/plain'])
                ? output.data['text/plain'].join('')
                : output.data['text/plain'];
              
              // Check if it's a DataFrame representation
              if (this.isDataFrameRepresentation(interpreted.textRepresentation)) {
                interpreted.dataType = 'dataframe';
              }
            }

            if (output.data['text/html']) {
              interpreted.dataType = interpreted.dataType || 'html';
              interpreted.htmlContent = Array.isArray(output.data['text/html'])
                ? output.data['text/html'].join('')
                : output.data['text/html'];
            }

            if (output.data['image/png']) {
              interpreted.dataType = 'image';
              interpreted.imageFormat = 'png';
              interpreted.imageData = output.data['image/png'];
            }

            if (output.data['image/jpeg']) {
              interpreted.dataType = 'image';
              interpreted.imageFormat = 'jpeg';
              interpreted.imageData = output.data['image/jpeg'];
            }

            if (output.data['image/svg+xml']) {
              interpreted.dataType = 'image';
              interpreted.imageFormat = 'svg';
              interpreted.imageData = Array.isArray(output.data['image/svg+xml'])
                ? output.data['image/svg+xml'].join('')
                : output.data['image/svg+xml'];
            }

            if (output.data['application/json']) {
              interpreted.dataType = 'json';
              interpreted.jsonData = output.data['application/json'];
            }

            if (output.data['application/vnd.plotly.v1+json']) {
              interpreted.dataType = 'plotly';
            }

            if (output.data['application/vnd.vegalite.v4+json'] || 
                output.data['application/vnd.vega.v5+json']) {
              interpreted.dataType = 'vega';
            }
          }

          if (output.output_type === 'execute_result') {
            interpreted.executionCount = output.execution_count;
          }
          break;

        default:
          interpreted.category = 'unknown';
          interpreted.rawOutput = output;
      }

      return interpreted;
    });
  }

  /**
   * Check if text representation is a DataFrame
   */
  private isDataFrameRepresentation(text: string): boolean {
    // Check for common DataFrame patterns
    const patterns = [
      /^\s+\w+\s+\w+/m,  // Column headers with whitespace
      /\d+\s+rows\s+×\s+\d+\s+columns/,  // "X rows × Y columns"
      /DataFrame/,  // Explicit DataFrame mention
      /\[.*rows\s+x\s+.*columns\]/  // [X rows x Y columns]
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}

/**
 * Tool to clear output from a single cell
 */
export class ClearCellOutputTool extends BaseExecutionTool {
  name = 'clearCellOutput';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'clearCellOutput',
      description: 'Clear the output from a single code cell. The cell content is preserved, only the output is removed.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to clear output from.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { notebookId?: string; cellIndex: number }): Promise<IToolResult> {
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

      const cellWidgets = notebook.content.widgets;
      
      // Validate cell index
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
      
      // Check if it's a code cell
      if (cell.model.type !== 'code') {
        return {
          success: false,
          error: {
            message: `Cell at index ${args.cellIndex} is a ${cell.model.type} cell. Only code cells have outputs to clear.`,
            type: 'InvalidCellTypeError'
          }
        };
      }

      const codeCell = cell as CodeCell;
      const model = codeCell.model as ICodeCellModel;

      // Check if there's any output to clear
      const hadOutput = model.outputs.length > 0;

      // Clear the output
      model.sharedModel.transact(() => {
        model.clearExecution();
        codeCell.outputHidden = false;
      }, false);

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          cellIndex: args.cellIndex,
          hadOutput,
          message: hadOutput 
            ? `Cleared output from cell ${args.cellIndex}`
            : `Cell ${args.cellIndex} had no output to clear`
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
 * Tool to clear all outputs in a notebook
 */
export class ClearAllOutputsTool extends BaseExecutionTool {
  name = 'clearAllOutputs';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'clearAllOutputs',
      description: 'Clear all outputs from all code cells in a notebook. Cell contents are preserved, only outputs are removed.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          }
        },
        required: []
      }
    }
  };

  async execute(args: { notebookId?: string }): Promise<IToolResult> {
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

      // Use NotebookActions to clear all outputs
      NotebookActions.clearAllOutputs(notebook.content);

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      // Count how many code cells were cleared
      let clearedCount = 0;
      for (const cell of notebook.content.widgets) {
        if (cell.model.type === 'code') {
          clearedCount++;
        }
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          clearedCells: clearedCount,
          message: `Cleared outputs from all ${clearedCount} code cells`
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
