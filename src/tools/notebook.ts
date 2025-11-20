/**
 * Notebook tools for reading and manipulating cells
 */

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ICodeCellModel } from '@jupyterlab/cells';
import { ITool, IToolResult, IToolSchema, ICellInfo } from '../types';
import { ErrorHandler } from '../utils/errors';

/**
 * Base class for notebook tools
 */
abstract class BaseNotebookTool implements ITool {
  abstract name: string;
  abstract category: 'read' | 'write';
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

    // Search through all open notebooks using filter
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
 * Tool to retrieve all cells from a notebook
 */
export class GetCellsTool extends BaseNotebookTool {
  name = 'getCells';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCells',
      description: 'Get all cells from a notebook. Returns cell type, content, index, and execution count for each cell.',
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

      const cells: ICellInfo[] = [];
      const cellWidgets = notebook.content.widgets;

      for (let i = 0; i < cellWidgets.length; i++) {
        const cell = cellWidgets[i];
        const cellModel = cell.model;

        const cellInfo: ICellInfo = {
          index: i,
          type: cellModel.type as 'code' | 'markdown' | 'raw',
          content: cellModel.sharedModel.getSource()
        };

        // Add execution count for code cells
        if (cellModel.type === 'code') {
          const codeModel = cellModel as ICodeCellModel;
          cellInfo.executionCount = codeModel.executionCount || undefined;
        }

        cells.push(cellInfo);
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          notebookName: notebook.title.label,
          cellCount: cells.length,
          cells
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
 * Tool to retrieve a single cell by index
 */
export class GetCellTool extends BaseNotebookTool {
  name = 'getCell';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCell',
      description: 'Get a single cell from a notebook by its index (0-based). Returns cell type, content, and execution count if applicable.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to retrieve.'
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
      const cellModel = cell.model;

      const cellInfo: ICellInfo = {
        index: args.cellIndex,
        type: cellModel.type as 'code' | 'markdown' | 'raw',
        content: cellModel.sharedModel.getSource()
      };

      // Add execution count for code cells
      if (cellModel.type === 'code') {
        const codeModel = cellModel as ICodeCellModel;
        cellInfo.executionCount = codeModel.executionCount || undefined;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          cell: cellInfo
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
 * Tool to create a new cell in a notebook
 */
export class CreateCellTool extends BaseNotebookTool {
  name = 'createCell';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'createCell',
      description: 'Create a new cell in a notebook at the specified index. If no index is provided, appends the cell at the end.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellType: {
            type: 'string',
            enum: ['code', 'markdown', 'raw'],
            description: 'The type of cell to create: code, markdown, or raw.'
          },
          content: {
            type: 'string',
            description: 'The content to put in the new cell.'
          },
          index: {
            type: 'number',
            description: 'The 0-based index where to insert the cell. If not provided, appends at the end.'
          }
        },
        required: ['cellType', 'content']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    cellType: 'code' | 'markdown' | 'raw';
    content: string;
    index?: number;
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;

      // Determine insertion index
      let insertIndex = args.index !== undefined ? args.index : cellCount;

      // Validate index
      if (insertIndex < 0 || insertIndex > cellCount) {
        return {
          success: false,
          error: {
            message: `Invalid index ${insertIndex}. Must be between 0 and ${cellCount} (inclusive).`,
            type: 'IndexError'
          }
        };
      }

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // Insert the cell using sharedModel
      notebookModel.sharedModel.insertCell(insertIndex, {
        cell_type: args.cellType,
        source: args.content
      });

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          cellIndex: insertIndex,
          cellType: args.cellType,
          message: `Created ${args.cellType} cell at index ${insertIndex}`
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
 * Tool to update an existing cell's content
 */
export class UpdateCellTool extends BaseNotebookTool {
  name = 'updateCell';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'updateCell',
      description: 'Update the content of an existing cell in a notebook. Preserves the cell type unless explicitly changed.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to update.'
          },
          content: {
            type: 'string',
            description: 'The new content for the cell.'
          },
          cellType: {
            type: 'string',
            enum: ['code', 'markdown', 'raw'],
            description: 'Optional: Change the cell type. If not provided, preserves the current type.'
          }
        },
        required: ['cellIndex', 'content']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    cellIndex: number;
    content: string;
    cellType?: 'code' | 'markdown' | 'raw';
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;

      // Validate cell index
      if (args.cellIndex < 0 || args.cellIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      const cell = notebookModel?.cells.get(args.cellIndex);
      
      if (!cell) {
        return {
          success: false,
          error: {
            message: `Failed to get cell at index ${args.cellIndex}`,
            type: 'NotFoundError'
          }
        };
      }

      const oldType = cell.type;

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // If cell type is changing, we need to replace the cell
      if (args.cellType && args.cellType !== oldType) {
        // Delete old cell and insert new one
        notebookModel.sharedModel.deleteCell(args.cellIndex);
        notebookModel.sharedModel.insertCell(args.cellIndex, {
          cell_type: args.cellType,
          source: args.content
        });
      } else {
        // Just update the content
        cell.sharedModel.setSource(args.content);
      }

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          cellIndex: args.cellIndex,
          cellType: args.cellType || oldType,
          message: args.cellType && args.cellType !== oldType
            ? `Updated cell at index ${args.cellIndex} and changed type from ${oldType} to ${args.cellType}`
            : `Updated cell at index ${args.cellIndex}`
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
 * Tool to delete a cell from a notebook
 */
export class DeleteCellTool extends BaseNotebookTool {
  name = 'deleteCell';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'deleteCell',
      description: 'Delete a cell from a notebook by its index.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to delete.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    cellIndex: number;
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;

      // Validate cell index
      if (args.cellIndex < 0 || args.cellIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      // Prevent deleting the last cell if it's the only one
      if (cellCount === 1) {
        return {
          success: false,
          error: {
            message: 'Cannot delete the last remaining cell in the notebook.',
            type: 'ValidationError'
          }
        };
      }

      // Get cell info before deletion for the response
      const cell = notebookModel?.cells.get(args.cellIndex);
      const cellType = cell?.type;

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // Delete the cell using sharedModel
      notebookModel.sharedModel.deleteCell(args.cellIndex);

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          deletedIndex: args.cellIndex,
          deletedCellType: cellType,
          remainingCells: cellCount - 1,
          message: `Deleted ${cellType} cell at index ${args.cellIndex}`
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
 * Tool to move a cell to a different position in the notebook
 */
export class MoveCellsTool extends BaseNotebookTool {
  name = 'moveCells';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'moveCells',
      description: 'Move one or more cells to a different position in the notebook. Can move a single cell or a range of cells.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          fromIndex: {
            type: 'number',
            description: 'The starting index of cells to move (0-based).'
          },
          toIndex: {
            type: 'number',
            description: 'The destination index where cells should be moved to (0-based).'
          },
          count: {
            type: 'number',
            description: 'The number of cells to move. Default is 1.'
          }
        },
        required: ['fromIndex', 'toIndex']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    fromIndex: number;
    toIndex: number;
    count?: number;
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;
      const count = args.count || 1;

      // Validate indices
      if (args.fromIndex < 0 || args.fromIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Source index ${args.fromIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.toIndex < 0 || args.toIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Destination index ${args.toIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.fromIndex + count > cellCount) {
        return {
          success: false,
          error: {
            message: `Cannot move ${count} cells from index ${args.fromIndex}. Not enough cells (only ${cellCount - args.fromIndex} available).`,
            type: 'IndexError'
          }
        };
      }

      // No-op if moving to the same position
      if (args.fromIndex === args.toIndex) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            message: 'Cells are already at the destination index. No move needed.'
          }
        };
      }

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // Move cells by removing and reinserting
      const cellsToMove = [];
      for (let i = 0; i < count; i++) {
        const cell = notebookModel.cells.get(args.fromIndex + i);
        if (cell) {
          // Store cell data
          cellsToMove.push({
            cell_type: cell.type as 'code' | 'markdown' | 'raw',
            source: cell.sharedModel.getSource(),
            metadata: cell.metadata
          });
        }
      }

      // Remove cells from original position (in reverse to maintain indices)
      for (let i = count - 1; i >= 0; i--) {
        notebookModel.sharedModel.deleteCell(args.fromIndex + i);
      }

      // Calculate adjusted destination index
      // If moving down, the index shifts because we removed cells
      const adjustedToIndex = args.toIndex > args.fromIndex 
        ? args.toIndex - count 
        : args.toIndex;

      // Insert cells at new position
      for (let i = 0; i < cellsToMove.length; i++) {
        notebookModel.sharedModel.insertCell(adjustedToIndex + i, cellsToMove[i]);
      }

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          movedCount: count,
          fromIndex: args.fromIndex,
          toIndex: args.toIndex,
          message: `Moved ${count} cell(s) from index ${args.fromIndex} to ${args.toIndex}`
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
 * Tool to merge multiple cells into one
 */
export class MergeCellsTool extends BaseNotebookTool {
  name = 'mergeCells';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'mergeCells',
      description: 'Merge multiple consecutive cells into a single cell. The merged cell will have the type of the first cell.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          startIndex: {
            type: 'number',
            description: 'The starting index of cells to merge (0-based).'
          },
          endIndex: {
            type: 'number',
            description: 'The ending index of cells to merge (0-based, inclusive).'
          },
          separator: {
            type: 'string',
            description: 'Optional separator to insert between merged cell contents. Default is a newline.'
          }
        },
        required: ['startIndex', 'endIndex']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    startIndex: number;
    endIndex: number;
    separator?: string;
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;
      const separator = args.separator !== undefined ? args.separator : '\n';

      // Validate indices
      if (args.startIndex < 0 || args.startIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Start index ${args.startIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.endIndex < 0 || args.endIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `End index ${args.endIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.startIndex > args.endIndex) {
        return {
          success: false,
          error: {
            message: `Start index ${args.startIndex} must be less than or equal to end index ${args.endIndex}.`,
            type: 'ValidationError'
          }
        };
      }

      if (args.startIndex === args.endIndex) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            message: 'Only one cell specified. No merge needed.'
          }
        };
      }

      // Get the first cell to determine the type
      const firstCell = notebookModel?.cells.get(args.startIndex);
      const cellType = firstCell?.type as 'code' | 'markdown' | 'raw';

      // Collect content from all cells
      const contents: string[] = [];
      for (let i = args.startIndex; i <= args.endIndex; i++) {
        const cell = notebookModel?.cells.get(i);
        if (cell) {
          contents.push(cell.sharedModel.getSource());
        }
      }

      // Merge contents
      const mergedContent = contents.join(separator);

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // Update the first cell with merged content
      firstCell?.sharedModel.setSource(mergedContent);

      // Delete the remaining cells (in reverse order to maintain indices)
      for (let i = args.endIndex; i > args.startIndex; i--) {
        notebookModel.sharedModel.deleteCell(i);
      }

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      const mergedCount = args.endIndex - args.startIndex + 1;

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          resultIndex: args.startIndex,
          mergedCount,
          cellType,
          message: `Merged ${mergedCount} cells into a single ${cellType} cell at index ${args.startIndex}`
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
 * Tool to list all open notebooks
 */
export class ListNotebooksTool extends BaseNotebookTool {
  name = 'listNotebooks';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'listNotebooks',
      description: 'List all currently open notebooks in JupyterLab. Returns notebook IDs, paths, names, and kernel status for each notebook.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  };

  async execute(args: Record<string, any>): Promise<IToolResult> {
    try {
      // Get all open notebooks
      const notebooks = this.notebookTracker.filter(() => true);
      
      if (notebooks.length === 0) {
        return {
          success: true,
          data: {
            count: 0,
            notebooks: [],
            message: 'No notebooks are currently open.'
          }
        };
      }

      // Get the current active notebook ID
      const activeNotebookId = this.getCurrentNotebook()?.id || null;

      // Collect information about each notebook
      const notebookInfos = notebooks.map(notebook => {
        const kernelSession = notebook.sessionContext?.session?.kernel;
        
        return {
          id: notebook.id,
          path: notebook.context.path,
          name: notebook.title.label,
          isActive: notebook.id === activeNotebookId,
          kernelInfo: kernelSession ? {
            name: kernelSession.name,
            status: kernelSession.status,
            language: notebook.sessionContext?.kernelDisplayName || 'unknown'
          } : null,
          isDirty: notebook.context.model?.dirty || false
        };
      });

      return {
        success: true,
        data: {
          count: notebooks.length,
          activeNotebookId,
          notebooks: notebookInfos
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
 * Tool to split a cell at a specific position
 */
export class SplitCellTool extends BaseNotebookTool {
  name = 'splitCell';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'splitCell',
      description: 'Split a cell into two cells at a specific line number. Both resulting cells will have the same type as the original.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The 0-based index of the cell to split.'
          },
          splitAtLine: {
            type: 'number',
            description: 'The line number (0-based) where to split the cell. Content from this line onwards goes to the new cell.'
          }
        },
        required: ['cellIndex', 'splitAtLine']
      }
    }
  };

  async execute(args: { 
    notebookId?: string; 
    cellIndex: number;
    splitAtLine: number;
  }): Promise<IToolResult> {
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

      const notebookModel = notebook.content.model;
      const cellCount = notebookModel?.cells.length || 0;

      // Validate cell index
      if (args.cellIndex < 0 || args.cellIndex >= cellCount) {
        return {
          success: false,
          error: {
            message: `Cell index ${args.cellIndex} is out of range. Notebook has ${cellCount} cells (indices 0-${cellCount - 1}).`,
            type: 'IndexError'
          }
        };
      }

      const cell = notebookModel?.cells.get(args.cellIndex);
      
      if (!cell) {
        return {
          success: false,
          error: {
            message: `Failed to get cell at index ${args.cellIndex}`,
            type: 'NotFoundError'
          }
        };
      }

      const cellType = cell.type as 'code' | 'markdown' | 'raw';
      const content = cell.sharedModel.getSource();
      const lines = content.split('\n');

      // Validate split line
      if (args.splitAtLine < 0 || args.splitAtLine > lines.length) {
        return {
          success: false,
          error: {
            message: `Split line ${args.splitAtLine} is out of range. Cell has ${lines.length} lines (indices 0-${lines.length}).`,
            type: 'IndexError'
          }
        };
      }

      if (args.splitAtLine === 0 || args.splitAtLine === lines.length) {
        return {
          success: false,
          error: {
            message: `Cannot split at line ${args.splitAtLine}. This would create an empty cell. Use line 1 to ${lines.length - 1}.`,
            type: 'ValidationError'
          }
        };
      }

      // Split the content
      const firstPart = lines.slice(0, args.splitAtLine).join('\n');
      const secondPart = lines.slice(args.splitAtLine).join('\n');

      if (!notebookModel) {
        return {
          success: false,
          error: {
            message: 'Notebook model is not available.',
            type: 'ModelError'
          }
        };
      }

      // Update the original cell with the first part
      cell.sharedModel.setSource(firstPart);

      // Insert a new cell with the second part right after the original
      notebookModel.sharedModel.insertCell(args.cellIndex + 1, {
        cell_type: cellType,
        source: secondPart
      });

      // Mark notebook as modified
      if (notebook.context.model) {
        notebook.context.model.dirty = true;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          originalIndex: args.cellIndex,
          newIndex: args.cellIndex + 1,
          splitAtLine: args.splitAtLine,
          cellType,
          message: `Split ${cellType} cell at index ${args.cellIndex} into two cells at line ${args.splitAtLine}`
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
