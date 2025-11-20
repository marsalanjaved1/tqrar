/**
 * Kernel management tools for interacting with notebook kernels
 */

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { KernelSpec, ServiceManager } from '@jupyterlab/services';
import { ITool, IToolResult, IToolSchema } from '../types';
import { ErrorHandler } from '../utils/errors';

/**
 * Base class for kernel tools
 */
abstract class BaseKernelTool implements ITool {
  abstract name: string;
  abstract category: 'read' | 'write';
  abstract schema: IToolSchema;

  constructor(
    protected notebookTracker: INotebookTracker,
    protected serviceManager: ServiceManager.IManager
  ) {}

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
}

/**
 * Tool to retrieve kernel information
 */
export class GetKernelInfoTool extends BaseKernelTool {
  name = 'getKernelInfo';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getKernelInfo',
      description: 'Get information about the kernel for a notebook, including kernel name, language, and version.',
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available for this notebook. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      // Get kernel spec for additional information
      const kernelSpecName = sessionContext.kernelPreference.name || kernel.name;
      const kernelSpecsManager = this.serviceManager.kernelspecs;
      const kernelSpec = kernelSpecsManager?.specs?.kernelspecs?.[kernelSpecName];

      const kernelInfo: any = {
        name: kernel.name,
        id: kernel.id,
        status: kernel.status,
        connectionStatus: kernel.connectionStatus
      };

      // Add kernel spec information if available
      if (kernelSpec) {
        kernelInfo.displayName = kernelSpec.display_name;
        kernelInfo.language = kernelSpec.language;
        kernelInfo.metadata = kernelSpec.metadata;
      }

      // Try to get kernel info from the kernel itself
      try {
        const info = await kernel.info;
        if (info) {
          kernelInfo.languageInfo = info.language_info;
          kernelInfo.implementation = info.implementation;
          kernelInfo.implementationVersion = info.implementation_version;
          kernelInfo.banner = info.banner;
        }
      } catch (error) {
        // Kernel info might not be available yet, continue without it
        console.warn('Could not retrieve kernel info:', error);
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          kernel: kernelInfo
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
 * Tool to check kernel status
 */
export class GetKernelStatusTool extends BaseKernelTool {
  name = 'getKernelStatus';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getKernelStatus',
      description: 'Check the current status of a notebook kernel. Returns status: idle, busy, starting, restarting, or dead.',
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: true,
          data: {
            notebookId: notebook.id,
            notebookPath: notebook.context.path,
            status: 'no_kernel',
            message: 'No kernel is currently running for this notebook.'
          }
        };
      }

      const status = kernel.status;
      const connectionStatus = kernel.connectionStatus;

      // Provide human-readable status description
      let statusDescription = '';
      switch (status) {
        case 'idle':
          statusDescription = 'Kernel is idle and ready to execute code.';
          break;
        case 'busy':
          statusDescription = 'Kernel is currently executing code.';
          break;
        case 'starting':
          statusDescription = 'Kernel is starting up.';
          break;
        case 'restarting':
          statusDescription = 'Kernel is restarting.';
          break;
        case 'dead':
          statusDescription = 'Kernel has died and needs to be restarted.';
          break;
        default:
          statusDescription = `Kernel status: ${status}`;
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          status,
          connectionStatus,
          kernelName: kernel.name,
          kernelId: kernel.id,
          description: statusDescription,
          isReady: status === 'idle',
          isBusy: status === 'busy',
          isDead: status === 'dead'
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
 * Tool to list available kernel specs
 */
export class ListAvailableKernelsTool extends BaseKernelTool {
  name = 'listAvailableKernels';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'listAvailableKernels',
      description: 'List all available kernel specifications that can be used with notebooks.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  };

  async execute(args: Record<string, any>): Promise<IToolResult> {
    try {
      // Get kernel specs from service manager
      const kernelSpecsManager = this.serviceManager.kernelspecs;
      
      // Wait for specs to be ready
      await kernelSpecsManager.ready;
      
      const specs = kernelSpecsManager.specs;

      if (!specs || !specs.kernelspecs) {
        return {
          success: false,
          error: {
            message: 'Kernel specifications not available.',
            type: 'KernelSpecsError'
          }
        };
      }

      const kernelSpecs = specs.kernelspecs;
      const defaultKernel = specs.default;

      // Format kernel specs for output
      const availableKernels = Object.entries(kernelSpecs).map(([name, spec]) => ({
        name,
        displayName: (spec as KernelSpec.ISpecModel).display_name,
        language: (spec as KernelSpec.ISpecModel).language,
        isDefault: name === defaultKernel,
        metadata: (spec as KernelSpec.ISpecModel).metadata
      }));

      return {
        success: true,
        data: {
          defaultKernel,
          kernelCount: availableKernels.length,
          kernels: availableKernels
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
 * Tool to restart a notebook kernel
 */
export class RestartKernelTool extends BaseKernelTool {
  name = 'restartKernel';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'restartKernel',
      description: 'Restart the kernel for a notebook. Optionally re-execute all cells after restart.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          executeAll: {
            type: 'boolean',
            description: 'If true, re-execute all cells after kernel restart. Default is false.'
          }
        },
        required: []
      }
    }
  };

  async execute(args: { notebookId?: string; executeAll?: boolean }): Promise<IToolResult> {
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
            message: 'No kernel available to restart. Please start a kernel first.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      const kernelName = kernel.name;
      const kernelId = kernel.id;

      // Restart the kernel
      await sessionContext.restartKernel();

      // Wait for kernel to be ready
      await sessionContext.ready;

      const executeAll = args.executeAll || false;
      let executionResult = null;

      // Execute all cells if requested
      if (executeAll) {
        const { NotebookActions } = await import('@jupyterlab/notebook');
        const success = await NotebookActions.runAll(
          notebook.content,
          sessionContext
        );

        executionResult = {
          executed: success,
          message: success 
            ? 'All cells executed successfully after restart'
            : 'Some cells failed to execute after restart'
        };
      }

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          previousKernelId: kernelId,
          previousKernelName: kernelName,
          newKernelId: sessionContext.session?.kernel?.id,
          executeAll,
          executionResult,
          message: executeAll 
            ? 'Kernel restarted and all cells executed'
            : 'Kernel restarted successfully'
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
 * Tool to interrupt kernel execution
 */
export class InterruptKernelTool extends BaseKernelTool {
  name = 'interruptKernel';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'interruptKernel',
      description: 'Interrupt the currently running kernel execution. Useful for stopping long-running or stuck code.',
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

      const sessionContext = notebook.sessionContext;
      const kernel = sessionContext.session?.kernel;

      if (!kernel) {
        return {
          success: false,
          error: {
            message: 'No kernel available to interrupt.',
            type: 'KernelNotAvailableError'
          }
        };
      }

      const wasBusy = kernel.status === 'busy';

      // Interrupt the kernel
      await kernel.interrupt();

      // Wait a moment for the interrupt to take effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const newStatus = kernel.status;

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          kernelName: kernel.name,
          kernelId: kernel.id,
          wasBusy,
          currentStatus: newStatus,
          message: wasBusy 
            ? 'Kernel execution interrupted successfully'
            : 'Kernel was not busy, interrupt signal sent anyway'
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
 * Tool to change the kernel for a notebook
 */
export class ChangeKernelTool extends BaseKernelTool {
  name = 'changeKernel';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'changeKernel',
      description: 'Change the kernel for a notebook to a different kernel specification.',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID. If not provided, uses the currently active notebook.'
          },
          kernelName: {
            type: 'string',
            description: 'The name of the kernel spec to switch to (e.g., "python3", "ir", "julia-1.6").'
          }
        },
        required: ['kernelName']
      }
    }
  };

  async execute(args: { notebookId?: string; kernelName: string }): Promise<IToolResult> {
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

      // Check if the requested kernel spec exists
      const kernelSpecsManager = this.serviceManager.kernelspecs;
      
      // Wait for specs to be ready
      await kernelSpecsManager.ready;
      
      const specs = kernelSpecsManager.specs;
      
      if (!specs || !specs.kernelspecs || !specs.kernelspecs[args.kernelName]) {
        const availableKernels = specs?.kernelspecs 
          ? Object.keys(specs.kernelspecs).join(', ')
          : 'none';
        
        return {
          success: false,
          error: {
            message: `Kernel spec "${args.kernelName}" not found. Available kernels: ${availableKernels}`,
            type: 'KernelSpecNotFoundError'
          }
        };
      }

      const oldKernelName = sessionContext.session?.kernel?.name;
      const oldKernelId = sessionContext.session?.kernel?.id;

      // Change the kernel
      await sessionContext.changeKernel({ name: args.kernelName });

      // Wait for the new kernel to be ready
      await sessionContext.ready;

      const newKernel = sessionContext.session?.kernel;
      const kernelSpec = specs.kernelspecs[args.kernelName] as KernelSpec.ISpecModel;

      return {
        success: true,
        data: {
          notebookId: notebook.id,
          notebookPath: notebook.context.path,
          oldKernel: {
            name: oldKernelName,
            id: oldKernelId
          },
          newKernel: {
            name: newKernel?.name,
            id: newKernel?.id,
            displayName: kernelSpec.display_name,
            language: kernelSpec.language
          },
          message: `Successfully changed kernel from "${oldKernelName}" to "${args.kernelName}"`
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

