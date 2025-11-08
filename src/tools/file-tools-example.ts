/**
 * Example: How to register and use file system tools
 * 
 * This file demonstrates the integration of file system tools
 * with the JupyterLab AI Assistant.
 */

import { JupyterFrontEnd } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ToolRegistry } from './registry';
import {
  ListFilesTool,
  ReadFileTool,
  WriteFileTool,
  DeleteFileTool,
  RenameFileTool,
  CreateDirectoryTool
} from './file';

/**
 * Register all file system tools with the tool registry
 * 
 * @param app - JupyterLab application instance
 * @param notebookTracker - Notebook tracker instance
 * @returns Configured tool registry with file tools
 */
export function registerFileTools(
  app: JupyterFrontEnd,
  notebookTracker: INotebookTracker | null
): ToolRegistry {
  // Create tool registry
  const toolRegistry = new ToolRegistry(app, notebookTracker);

  // Get contents manager from app services
  const contentsManager = app.serviceManager.contents;

  // Register file system tools
  toolRegistry.register(new ListFilesTool(app, contentsManager));
  toolRegistry.register(new ReadFileTool(app, contentsManager));
  toolRegistry.register(new WriteFileTool(app, contentsManager));
  toolRegistry.register(new DeleteFileTool(app, contentsManager));
  toolRegistry.register(new RenameFileTool(app, contentsManager));
  toolRegistry.register(new CreateDirectoryTool(app, contentsManager));

  console.log('[File Tools] Registered 6 file system tools');

  return toolRegistry;
}

/**
 * Example usage scenarios
 */
export namespace FileToolsExamples {
  /**
   * Example 1: List files in workspace root
   */
  export async function listWorkspaceFiles(toolRegistry: ToolRegistry) {
    const result = await toolRegistry.execute('listFiles', { path: '' });
    
    if (result.success) {
      console.log('Files in workspace:', result.data.items);
      return result.data.items;
    } else {
      console.error('Failed to list files:', result.error);
      return [];
    }
  }

  /**
   * Example 2: Read a configuration file
   */
  export async function readConfigFile(toolRegistry: ToolRegistry, configPath: string) {
    const result = await toolRegistry.execute('readFile', { path: configPath });
    
    if (result.success) {
      console.log('File content:', result.data.content);
      return result.data.content;
    } else {
      console.error('Failed to read file:', result.error);
      return null;
    }
  }

  /**
   * Example 3: Create a Python utility script
   */
  export async function createUtilityScript(toolRegistry: ToolRegistry) {
    const pythonCode = `"""
Utility functions for data analysis
"""

import pandas as pd
import numpy as np

def load_data(filepath):
    """Load data from CSV file"""
    return pd.read_csv(filepath)

def clean_data(df):
    """Remove missing values and duplicates"""
    return df.dropna().drop_duplicates()

def summarize_data(df):
    """Generate summary statistics"""
    return df.describe()
`;

    const result = await toolRegistry.execute('writeFile', {
      path: 'utils.py',
      content: pythonCode
    });

    if (result.success) {
      console.log('Created utility script:', result.data.message);
      return true;
    } else {
      console.error('Failed to create script:', result.error);
      return false;
    }
  }

  /**
   * Example 4: Organize files into directories
   */
  export async function organizeDataFiles(toolRegistry: ToolRegistry) {
    // Step 1: Create data directory
    let result = await toolRegistry.execute('createDirectory', { path: 'data' });
    
    if (!result.success) {
      console.error('Failed to create directory:', result.error);
      return false;
    }

    // Step 2: List files in workspace
    result = await toolRegistry.execute('listFiles', { path: '' });
    
    if (!result.success) {
      console.error('Failed to list files:', result.error);
      return false;
    }

    // Step 3: Move CSV files to data directory
    const files = result.data.items;
    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.csv')) {
        const moveResult = await toolRegistry.execute('renameFile', {
          oldPath: file.name,
          newPath: `data/${file.name}`
        });

        if (moveResult.success) {
          console.log(`Moved ${file.name} to data directory`);
        } else {
          console.error(`Failed to move ${file.name}:`, moveResult.error);
        }
      }
    }

    return true;
  }

  /**
   * Example 5: Clean up temporary files
   */
  export async function cleanupTempFiles(toolRegistry: ToolRegistry) {
    // List files
    const result = await toolRegistry.execute('listFiles', { path: '' });
    
    if (!result.success) {
      console.error('Failed to list files:', result.error);
      return false;
    }

    // Delete files starting with 'temp_' or ending with '.tmp'
    const files = result.data.items;
    let deletedCount = 0;

    for (const file of files) {
      if (file.type === 'file' && 
          (file.name.startsWith('temp_') || file.name.endsWith('.tmp'))) {
        const deleteResult = await toolRegistry.execute('deleteFile', {
          path: file.path
        });

        if (deleteResult.success) {
          console.log(`Deleted ${file.name}`);
          deletedCount++;
        } else {
          console.error(`Failed to delete ${file.name}:`, deleteResult.error);
        }
      }
    }

    console.log(`Cleaned up ${deletedCount} temporary files`);
    return true;
  }

  /**
   * Example 6: Create project structure
   */
  export async function createProjectStructure(toolRegistry: ToolRegistry) {
    const directories = ['data', 'notebooks', 'scripts', 'output'];

    for (const dir of directories) {
      const result = await toolRegistry.execute('createDirectory', { path: dir });
      
      if (result.success) {
        console.log(`Created directory: ${dir}`);
      } else if (result.error?.type === 'FileExistsError') {
        console.log(`Directory already exists: ${dir}`);
      } else {
        console.error(`Failed to create directory ${dir}:`, result.error);
        return false;
      }
    }

    // Create a README file
    const readmeContent = `# Project Structure

- \`data/\`: Raw and processed data files
- \`notebooks/\`: Jupyter notebooks for analysis
- \`scripts/\`: Python utility scripts
- \`output/\`: Generated outputs (plots, reports, etc.)
`;

    const result = await toolRegistry.execute('writeFile', {
      path: 'README.md',
      content: readmeContent
    });

    if (result.success) {
      console.log('Created README.md');
      return true;
    } else {
      console.error('Failed to create README:', result.error);
      return false;
    }
  }
}

/**
 * Example: AI Assistant conversation using file tools
 */
export namespace ConversationExamples {
  /**
   * Example conversation: User asks to list Python files
   */
  export const listPythonFiles = {
    userMessage: "What Python files do I have in my workspace?",
    toolCalls: [
      {
        tool: 'listFiles',
        args: { path: '' }
      }
    ],
    assistantResponse: "You have 3 Python files in your workspace:\n\n1. `analysis.py` (2.3 KB)\n2. `utils.py` (1.5 KB)\n3. `data_loader.py` (3.1 KB)\n\nWould you like me to show you the contents of any of these files?"
  };

  /**
   * Example conversation: User asks to create a data processing script
   */
  export const createDataScript = {
    userMessage: "Create a script that loads and cleans a CSV file",
    toolCalls: [
      {
        tool: 'writeFile',
        args: {
          path: 'clean_data.py',
          content: 'import pandas as pd\n\ndef clean_csv(filepath):\n    df = pd.read_csv(filepath)\n    df = df.dropna()\n    df = df.drop_duplicates()\n    return df'
        }
      }
    ],
    assistantResponse: "I've created `clean_data.py` with a function that loads a CSV file and removes missing values and duplicates. You can use it like this:\n\n```python\nfrom clean_data import clean_csv\ndf = clean_csv('data.csv')\n```"
  };

  /**
   * Example conversation: User asks to organize files
   */
  export const organizeFiles = {
    userMessage: "Move all my CSV files to a data folder",
    toolCalls: [
      {
        tool: 'createDirectory',
        args: { path: 'data' }
      },
      {
        tool: 'listFiles',
        args: { path: '' }
      },
      {
        tool: 'renameFile',
        args: { oldPath: 'sales.csv', newPath: 'data/sales.csv' }
      },
      {
        tool: 'renameFile',
        args: { oldPath: 'customers.csv', newPath: 'data/customers.csv' }
      }
    ],
    assistantResponse: "I've organized your CSV files:\n\n- Created `data/` directory\n- Moved `sales.csv` → `data/sales.csv`\n- Moved `customers.csv` → `data/customers.csv`\n\nYour data files are now organized in the data folder."
  };
}
