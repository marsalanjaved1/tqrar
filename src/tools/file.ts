/**
 * File system tools for reading and manipulating files
 */

import { JupyterFrontEnd } from '@jupyterlab/application';
import { Contents } from '@jupyterlab/services';
import { ITool, IToolResult, IToolSchema } from '../types';
// import { PathExt } from '@jupyterlab/coreutils';
import { PathValidator, SecurityLogger, SecurityEventType } from '../utils/security';

/**
 * Base class for file system tools
 */
abstract class BaseFileTool implements ITool {
  abstract name: string;
  abstract category: 'read' | 'write';
  abstract schema: IToolSchema;

  constructor(
    protected app: JupyterFrontEnd,
    protected contentsManager: Contents.IManager
  ) {}

  abstract execute(args: Record<string, any>): Promise<IToolResult>;

  /**
   * Validate that a path is within the workspace directory
   * Prevents directory traversal attacks
   */
  protected validatePath(path: string): { valid: boolean; error?: string } {
    // Use centralized path validation with security logging
    return PathValidator.validatePath(path);
  }

  /**
   * Handle Contents API errors with user-friendly messages
   */
  protected handleContentsError(error: any, operation: string, path: string): IToolResult {
    console.error(`File ${operation} error for ${path}:`, error);

    let message = `Failed to ${operation} ${path}`;
    let type = 'FileSystemError';

    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        message = `File or directory not found: ${path}`;
        type = 'NotFoundError';
      } else if (status === 403) {
        message = `Permission denied: ${path}`;
        type = 'PermissionError';
        
        // Log unauthorized access attempt
        SecurityLogger.logEvent(
          SecurityEventType.UNAUTHORIZED_FILE_ACCESS,
          `Permission denied for ${operation} operation on: ${path}`,
          'high',
          { path }
        );
      } else if (status === 409) {
        message = `File already exists: ${path}`;
        type = 'FileExistsError';
      }
    } else if (error.message) {
      message = `${message}: ${error.message}`;
    }

    return {
      success: false,
      error: {
        message,
        type
      }
    };
  }
}

/**
 * Tool to list files and directories
 */
export class ListFilesTool extends BaseFileTool {
  name = 'listFiles';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'listFiles',
      description: 'List files and directories in a specified path within the workspace. Returns information about each item including name, type, and path.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path to list. Use empty string or "." for the workspace root. Must be relative to workspace root.'
          }
        },
        required: []
      }
    }
  };

  async execute(args: { path?: string }): Promise<IToolResult> {
    try {
      const path = args.path || '';

      // Validate path
      const validation = this.validatePath(path);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      // Get directory contents
      const contents = await this.contentsManager.get(path);

      if (contents.type !== 'directory') {
        return {
          success: false,
          error: {
            message: `Path ${path} is not a directory. Use readFile to read file contents.`,
            type: 'InvalidTypeError'
          }
        };
      }

      // Format the results
      const items = contents.content.map((item: Contents.IModel) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        created: item.created,
        lastModified: item.last_modified,
        mimetype: item.mimetype
      }));

      return {
        success: true,
        data: {
          path: contents.path,
          itemCount: items.length,
          items
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'list', args.path || '');
    }
  }
}

/**
 * Tool to read file contents
 */
export class ReadFileTool extends BaseFileTool {
  name = 'readFile';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'readFile',
      description: 'Read the contents of a file as text. Only works with text files. Path must be relative to workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to read, relative to workspace root.'
          }
        },
        required: ['path']
      }
    }
  };

  async execute(args: { path: string }): Promise<IToolResult> {
    try {
      // Validate path
      const validation = this.validatePath(args.path);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      // Read file contents
      const contents = await this.contentsManager.get(args.path, { content: true });

      if (contents.type === 'directory') {
        return {
          success: false,
          error: {
            message: `Path ${args.path} is a directory. Use listFiles to list directory contents.`,
            type: 'InvalidTypeError'
          }
        };
      }

      // Check if content is text
      if (contents.format !== 'text' && contents.format !== 'json') {
        return {
          success: false,
          error: {
            message: `File ${args.path} is not a text file (format: ${contents.format}). Only text files can be read.`,
            type: 'InvalidFormatError'
          }
        };
      }

      return {
        success: true,
        data: {
          path: contents.path,
          name: contents.name,
          type: contents.type,
          format: contents.format,
          mimetype: contents.mimetype,
          content: contents.content,
          size: contents.size,
          lastModified: contents.last_modified
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'read', args.path);
    }
  }
}

/**
 * Tool to write file contents
 */
export class WriteFileTool extends BaseFileTool {
  name = 'writeFile';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'writeFile',
      description: 'Create a new file or overwrite an existing file with the provided content. Path must be relative to workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path to write, relative to workspace root.'
          },
          content: {
            type: 'string',
            description: 'The text content to write to the file.'
          },
          format: {
            type: 'string',
            enum: ['text', 'json'],
            description: 'The file format. Default is "text". Use "json" for JSON files.'
          }
        },
        required: ['path', 'content']
      }
    }
  };

  async execute(args: { path: string; content: string; format?: 'text' | 'json' }): Promise<IToolResult> {
    try {
      // Validate path
      const validation = this.validatePath(args.path);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      const format = args.format || 'text';

      // Validate JSON content if format is json
      if (format === 'json') {
        try {
          JSON.parse(args.content);
        } catch (e) {
          return {
            success: false,
            error: {
              message: 'Invalid JSON content. Please provide valid JSON when using format "json".',
              type: 'ValidationError'
            }
          };
        }
      }

      // Check if file exists
      let fileExists = false;
      try {
        await this.contentsManager.get(args.path, { content: false });
        fileExists = true;
      } catch (e) {
        // File doesn't exist, which is fine
      }

      // Save the file
      const model: Partial<Contents.IModel> = {
        type: 'file',
        format: format,
        content: args.content
      };

      const result = await this.contentsManager.save(args.path, model);

      return {
        success: true,
        data: {
          path: result.path,
          name: result.name,
          created: !fileExists,
          overwritten: fileExists,
          size: result.size,
          lastModified: result.last_modified,
          message: fileExists 
            ? `File ${args.path} has been overwritten`
            : `File ${args.path} has been created`
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'write', args.path);
    }
  }
}

/**
 * Tool to delete a file or directory
 */
export class DeleteFileTool extends BaseFileTool {
  name = 'deleteFile';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'deleteFile',
      description: 'Delete a file or empty directory. Path must be relative to workspace root. Cannot delete non-empty directories.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file or directory path to delete, relative to workspace root.'
          }
        },
        required: ['path']
      }
    }
  };

  async execute(args: { path: string }): Promise<IToolResult> {
    try {
      // Validate path
      const validation = this.validatePath(args.path);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      // Get file info before deletion
      const contents = await this.contentsManager.get(args.path, { content: false });
      const itemType = contents.type;

      // Delete the file/directory
      await this.contentsManager.delete(args.path);

      return {
        success: true,
        data: {
          path: args.path,
          type: itemType,
          message: `${itemType === 'directory' ? 'Directory' : 'File'} ${args.path} has been deleted`
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'delete', args.path);
    }
  }
}

/**
 * Tool to rename or move a file or directory
 */
export class RenameFileTool extends BaseFileTool {
  name = 'renameFile';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'renameFile',
      description: 'Rename or move a file or directory to a new path. Both paths must be relative to workspace root.',
      parameters: {
        type: 'object',
        properties: {
          oldPath: {
            type: 'string',
            description: 'The current path of the file or directory, relative to workspace root.'
          },
          newPath: {
            type: 'string',
            description: 'The new path for the file or directory, relative to workspace root.'
          }
        },
        required: ['oldPath', 'newPath']
      }
    }
  };

  async execute(args: { oldPath: string; newPath: string }): Promise<IToolResult> {
    try {
      // Validate both paths
      const oldValidation = this.validatePath(args.oldPath);
      if (!oldValidation.valid) {
        return {
          success: false,
          error: {
            message: `Old path: ${oldValidation.error}`,
            type: 'SecurityError'
          }
        };
      }

      const newValidation = this.validatePath(args.newPath);
      if (!newValidation.valid) {
        return {
          success: false,
          error: {
            message: `New path: ${newValidation.error}`,
            type: 'SecurityError'
          }
        };
      }

      // Check if source exists
      const contents = await this.contentsManager.get(args.oldPath, { content: false });
      const itemType = contents.type;

      // Rename/move the file
      const result = await this.contentsManager.rename(args.oldPath, args.newPath);

      return {
        success: true,
        data: {
          oldPath: args.oldPath,
          newPath: result.path,
          type: itemType,
          message: `${itemType === 'directory' ? 'Directory' : 'File'} moved from ${args.oldPath} to ${result.path}`
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'rename', args.oldPath);
    }
  }
}

/**
 * Tool to create a new directory
 */
export class CreateDirectoryTool extends BaseFileTool {
  name = 'createDirectory';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'createDirectory',
      description: 'Create a new directory at the specified path. Path must be relative to workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path to create, relative to workspace root.'
          }
        },
        required: ['path']
      }
    }
  };

  async execute(args: { path: string }): Promise<IToolResult> {
    try {
      // Validate path
      const validation = this.validatePath(args.path);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      // Check if directory already exists
      try {
        const existing = await this.contentsManager.get(args.path, { content: false });
        if (existing.type === 'directory') {
          return {
            success: false,
            error: {
              message: `Directory already exists: ${args.path}`,
              type: 'FileExistsError'
            }
          };
        } else {
          return {
            success: false,
            error: {
              message: `A file already exists at path: ${args.path}`,
              type: 'FileExistsError'
            }
          };
        }
      } catch (e) {
        // Directory doesn't exist, which is what we want
      }

      // Create the directory
      const model: Partial<Contents.IModel> = {
        type: 'directory'
      };

      const result = await this.contentsManager.save(args.path, model);

      return {
        success: true,
        data: {
          path: result.path,
          name: result.name,
          created: result.created,
          message: `Directory ${args.path} has been created`
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'create directory', args.path);
    }
  }
}

/**
 * Tool to create a new Jupyter notebook
 */
export class CreateNotebookTool extends BaseFileTool {
  name = 'createNotebook';
  category: 'read' | 'write' = 'write';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'createNotebook',
      description: 'Create a new Jupyter notebook (.ipynb file) at the specified path. If the path does not include .ipynb extension, it will be added automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The notebook path to create, relative to workspace root. Example: "notebooks/analysis.ipynb" or "my_notebook" (extension will be added).'
          },
          initialContent: {
            type: 'string',
            description: 'Optional initial markdown content to add to the first cell. If not provided, creates an empty notebook.'
          }
        },
        required: ['path']
      }
    }
  };

  async execute(args: { path: string; initialContent?: string }): Promise<IToolResult> {
    try {
      let notebookPath = args.path;

      // Add .ipynb extension if not present
      if (!notebookPath.endsWith('.ipynb')) {
        notebookPath = `${notebookPath}.ipynb`;
      }

      // Validate path
      const validation = this.validatePath(notebookPath);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            message: validation.error!,
            type: 'SecurityError'
          }
        };
      }

      // Check if notebook already exists
      try {
        await this.contentsManager.get(notebookPath, { content: false });
        return {
          success: false,
          error: {
            message: `Notebook already exists: ${notebookPath}`,
            type: 'FileExistsError'
          }
        };
      } catch (e) {
        // Notebook doesn't exist, which is what we want
      }

      // Create empty notebook structure
      const notebookContent = {
        cells: args.initialContent ? [
          {
            cell_type: 'markdown',
            metadata: {},
            source: [args.initialContent]
          }
        ] : [],
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3'
          },
          language_info: {
            name: 'python',
            version: '3.x'
          }
        },
        nbformat: 4,
        nbformat_minor: 5
      };

      // Save the notebook
      const model: Partial<Contents.IModel> = {
        type: 'notebook',
        format: 'json',
        content: notebookContent
      };

      const result = await this.contentsManager.save(notebookPath, model);

      return {
        success: true,
        data: {
          path: result.path,
          name: result.name,
          created: result.created,
          message: `Notebook ${result.path} has been created successfully. You can now open it in JupyterLab.`
        }
      };
    } catch (error) {
      return this.handleContentsError(error, 'create notebook', args.path);
    }
  }
}
