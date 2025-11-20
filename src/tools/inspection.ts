/**
 * Code inspection tools for code completion and documentation
 */

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ITool, IToolResult, IToolSchema } from '../types';
import { ErrorHandler } from '../utils/errors';
import { KernelMessage } from '@jupyterlab/services';

/**
 * Base class for inspection tools
 */
abstract class BaseInspectionTool implements ITool {
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
   * Check if kernel supports inspection
   */
  protected async checkKernelSupport(
    kernel: any,
    operation: string
  ): Promise<{ supported: boolean; message?: string }> {
    try {
      // Get kernel info to check capabilities
      const info = await kernel.info;
      
      // Most kernels support inspection, but we can check the protocol version
      if (!info) {
        return {
          supported: false,
          message: `Kernel does not provide info for ${operation}`
        };
      }

      return { supported: true };
    } catch (error) {
      return {
        supported: false,
        message: `Unable to verify kernel support for ${operation}: ${error}`
      };
    }
  }
}

/**
 * Tool to get code completions from the kernel
 */
export class GetCompletionsTool extends BaseInspectionTool {
  name = 'getCompletions';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCompletions',
      description: 'Get code completion suggestions from the kernel at a specific position in code. Useful for suggesting variable names, function names, or methods.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          code: {
            type: 'string',
            description: 'The code text to get completions for.'
          },
          cursorPos: {
            type: 'number',
            description: 'The cursor position in the code (0-based character index). If not provided, uses the end of the code.'
          }
        },
        required: ['code']
      }
    }
  };

  async execute(args: {
    notebookId?: string;
    code: string;
    cursorPos?: number;
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Check if kernel supports completion
      const support = await this.checkKernelSupport(kernel, 'completion');
      if (!support.supported) {
        return {
          success: false,
          error: {
            message: support.message || 'Kernel does not support code completion',
            type: 'UnsupportedOperationError'
          }
        };
      }

      const code = args.code;
      const cursorPos = args.cursorPos ?? code.length;

      // Send completion request to kernel
      const content: KernelMessage.ICompleteRequestMsg['content'] = {
        code,
        cursor_pos: cursorPos
      };

      const reply = await kernel.requestComplete(content);
      const replyContent = reply.content as KernelMessage.ICompleteReplyMsg['content'];

      if (replyContent.status !== 'ok') {
        return {
          success: false,
          error: {
            message: 'Completion request failed',
            type: 'CompletionError'
          }
        };
      }

      // Extract matches and metadata
      const matches = replyContent.matches || [];
      const cursorStart = replyContent.cursor_start;
      const cursorEnd = replyContent.cursor_end;
      const metadata = replyContent.metadata || {};

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          matches,
          matchCount: matches.length,
          cursorStart,
          cursorEnd,
          metadata,
          message:
            matches.length > 0
              ? `Found ${matches.length} completion suggestion(s)`
              : 'No completions available at this position'
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
 * Tool to get documentation for code from the kernel
 */
export class GetDocumentationTool extends BaseInspectionTool {
  name = 'getDocumentation';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getDocumentation',
      description: 'Get documentation and help information for code from the kernel. Retrieves docstrings, function signatures, and other help text.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          code: {
            type: 'string',
            description: 'The code to get documentation for (e.g., "pandas.DataFrame", "numpy.array").'
          },
          cursorPos: {
            type: 'number',
            description: 'The cursor position in the code (0-based character index). If not provided, uses the end of the code.'
          },
          detailLevel: {
            type: 'number',
            description: 'Level of detail for documentation (0 = basic, 1 = detailed). Default is 0.'
          }
        },
        required: ['code']
      }
    }
  };

  async execute(args: {
    notebookId?: string;
    code: string;
    cursorPos?: number;
    detailLevel?: number;
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Check if kernel supports inspection
      const support = await this.checkKernelSupport(kernel, 'inspection');
      if (!support.supported) {
        return {
          success: false,
          error: {
            message: support.message || 'Kernel does not support code inspection',
            type: 'UnsupportedOperationError'
          }
        };
      }

      const code = args.code;
      const cursorPos = args.cursorPos ?? code.length;
      const detailLevel = (args.detailLevel ?? 0) as 0 | 1;

      // Send inspect request to kernel
      const content: KernelMessage.IInspectRequestMsg['content'] = {
        code,
        cursor_pos: cursorPos,
        detail_level: detailLevel
      };

      const reply = await kernel.requestInspect(content);
      const replyContent = reply.content as KernelMessage.IInspectReplyMsg['content'];

      if (replyContent.status !== 'ok') {
        return {
          success: false,
          error: {
            message: 'Inspection request failed',
            type: 'InspectionError'
          }
        };
      }

      if (!replyContent.found) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            notebookPath: notebook.context.path,
            found: false,
            message: `No documentation found for: ${code}`
          }
        };
      }

      // Extract and format documentation
      const data = replyContent.data || {};
      const formattedDoc = this.formatDocumentation(data);

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          found: true,
          code,
          documentation: formattedDoc,
          rawData: data,
          message: 'Documentation retrieved successfully'
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
   * Format documentation data for display
   */
  private formatDocumentation(data: Record<string, any>): {
    text?: string;
    html?: string;
    markdown?: string;
  } {
    const formatted: {
      text?: string;
      html?: string;
      markdown?: string;
    } = {};

    // Extract text/plain documentation
    if (data['text/plain']) {
      formatted.text = Array.isArray(data['text/plain'])
        ? data['text/plain'].join('\n')
        : data['text/plain'];
    }

    // Extract HTML documentation
    if (data['text/html']) {
      formatted.html = Array.isArray(data['text/html'])
        ? data['text/html'].join('\n')
        : data['text/html'];
    }

    // Extract markdown documentation
    if (data['text/markdown']) {
      formatted.markdown = Array.isArray(data['text/markdown'])
        ? data['text/markdown'].join('\n')
        : data['text/markdown'];
    }

    return formatted;
  }
}

/**
 * Tool to inspect code at a specific position in a cell
 */
export class InspectCodeTool extends BaseInspectionTool {
  name = 'inspectCode';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'inspectCode',
      description: 'Inspect code at a specific position in a notebook cell. Retrieves documentation, type information, and help text for the code at the cursor position.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          cellIndex: {
            type: 'number',
            description: 'The index of the cell to inspect (0-based).'
          },
          cursorPos: {
            type: 'number',
            description: 'The cursor position in the cell (0-based character index). If not provided, uses the end of the cell content.'
          },
          detailLevel: {
            type: 'number',
            description: 'Level of detail for inspection (0 = basic, 1 = detailed). Default is 0.'
          }
        },
        required: ['cellIndex']
      }
    }
  };

  async execute(args: {
    notebookId?: string;
    cellIndex: number;
    cursorPos?: number;
    detailLevel?: number;
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Get the cell
      const cell = notebook.content.widgets[args.cellIndex];
      if (!cell) {
        return {
          success: false,
          error: {
            message: `Cell not found at index: ${args.cellIndex}`,
            type: 'NotFoundError'
          }
        };
      }

      // Get cell content
      const code = cell.model.sharedModel.getSource();
      const cursorPos = args.cursorPos ?? code.length;
      const detailLevel = (args.detailLevel ?? 0) as 0 | 1;

      // Check if kernel supports inspection
      const support = await this.checkKernelSupport(kernel, 'inspection');
      if (!support.supported) {
        return {
          success: false,
          error: {
            message: support.message || 'Kernel does not support code inspection',
            type: 'UnsupportedOperationError'
          }
        };
      }

      // Send inspect request to kernel
      const content: KernelMessage.IInspectRequestMsg['content'] = {
        code,
        cursor_pos: cursorPos,
        detail_level: detailLevel
      };

      const reply = await kernel.requestInspect(content);
      const replyContent = reply.content as KernelMessage.IInspectReplyMsg['content'];

      if (replyContent.status !== 'ok') {
        return {
          success: false,
          error: {
            message: 'Inspection request failed',
            type: 'InspectionError'
          }
        };
      }

      if (!replyContent.found) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            notebookPath: notebook.context.path,
            cellIndex: args.cellIndex,
            cellType: cell.model.type,
            found: false,
            message: 'No inspection information found at this position'
          }
        };
      }

      // Extract and format documentation
      const data = replyContent.data || {};
      const formattedDoc = this.formatDocumentation(data);

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          cellIndex: args.cellIndex,
          cellType: cell.model.type,
          cursorPos,
          found: true,
          documentation: formattedDoc,
          rawData: data,
          message: 'Code inspection completed successfully'
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
   * Format documentation data for display
   */
  private formatDocumentation(data: Record<string, any>): {
    text?: string;
    html?: string;
    markdown?: string;
  } {
    const formatted: {
      text?: string;
      html?: string;
      markdown?: string;
    } = {};

    // Extract text/plain documentation
    if (data['text/plain']) {
      formatted.text = Array.isArray(data['text/plain'])
        ? data['text/plain'].join('\n')
        : data['text/plain'];
    }

    // Extract HTML documentation
    if (data['text/html']) {
      formatted.html = Array.isArray(data['text/html'])
        ? data['text/html'].join('\n')
        : data['text/html'];
    }

    // Extract markdown documentation
    if (data['text/markdown']) {
      formatted.markdown = Array.isArray(data['text/markdown'])
        ? data['text/markdown'].join('\n')
        : data['text/markdown'];
    }

    return formatted;
  }
}
