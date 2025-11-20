/**
 * Tool Registry for managing and executing AI Assistant tools
 */

import { JupyterFrontEnd } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ITool, IToolResult, IToolSchema, ExecutionMode } from '../types';

/**
 * Tool Registry class for managing available tools
 */
export class ToolRegistry {
  private _tools: Map<string, ITool>;
  // These will be used when implementing specific tools in future tasks
  private _app: JupyterFrontEnd;
  private _notebookTracker: INotebookTracker | null;

  /**
   * Create a new ToolRegistry
   * 
   * @param app - The JupyterLab application instance
   * @param notebookTracker - The notebook tracker (optional)
   */
  constructor(
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker | null = null
  ) {
    this._tools = new Map<string, ITool>();
    this._app = app;
    this._notebookTracker = notebookTracker;
    
    // Prevent unused variable warnings - these will be used in future tasks
    void this._app;
    void this._notebookTracker;
  }

  /**
   * Register a tool with the registry
   * 
   * @param tool - The tool to register
   * @throws Error if a tool with the same name already exists
   */
  register(tool: ITool): void {
    if (this._tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    // Validate tool schema
    this._validateToolSchema(tool.schema);

    // Validate tool category
    if (!['read', 'write'].includes(tool.category)) {
      throw new Error(`Invalid tool category: ${tool.category}. Must be 'read' or 'write'.`);
    }

    this._tools.set(tool.name, tool);
    console.log(`Tool registered: ${tool.name} (category: ${tool.category})`);
  }

  /**
   * Unregister a tool from the registry
   * 
   * @param name - The name of the tool to unregister
   * @returns true if the tool was unregistered, false if it didn't exist
   */
  unregister(name: string): boolean {
    const result = this._tools.delete(name);
    if (result) {
      console.log(`Tool unregistered: ${name}`);
    }
    return result;
  }

  /**
   * Execute a tool by name with the provided arguments
   * 
   * @param name - The name of the tool to execute
   * @param args - The arguments to pass to the tool
   * @returns A promise that resolves to the tool result
   * @throws Error if the tool is not found
   */
  async execute(name: string, args: Record<string, any>): Promise<IToolResult> {
    const tool = this._tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: {
          message: `Tool not found: ${name}`,
          type: 'ToolNotFoundError'
        }
      };
    }

    try {
      // Validate parameters against schema
      const validationError = this._validateParameters(tool.schema, args);
      if (validationError) {
        return {
          success: false,
          error: {
            message: validationError,
            type: 'ValidationError'
          }
        };
      }

      // Execute the tool
      console.log(`Executing tool: ${name}`, args);
      const result = await tool.execute(args);
      
      return result;
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: error instanceof Error ? error.name : 'UnknownError'
        }
      };
    }
  }

  /**
   * Get all registered tool schemas for LLM function calling
   * 
   * @param mode - Optional execution mode to filter tools ('act' or 'plan')
   * @returns Array of tool schemas based on mode
   */
  getSchemas(mode: ExecutionMode = 'act'): IToolSchema[] {
    const tools = Array.from(this._tools.values());
    
    if (mode === 'plan') {
      // Filter to only read tools in Plan mode
      const readTools = tools.filter(tool => tool.category === 'read');
      console.log(`[ToolRegistry] Plan mode: ${readTools.length} read tools available (${tools.length - readTools.length} write tools filtered out)`);
      return readTools.map(tool => tool.schema);
    }
    
    // Act mode: return all tools
    console.log(`[ToolRegistry] Act mode: ${tools.length} tools available (read + write)`);
    return tools.map(tool => tool.schema);
  }

  /**
   * Get tools by category
   * 
   * @param category - The category to filter by ('read' or 'write')
   * @returns Array of tools in the specified category
   */
  getToolsByCategory(category: 'read' | 'write'): ITool[] {
    return Array.from(this._tools.values())
      .filter(tool => tool.category === category);
  }

  /**
   * Get a tool by name
   * 
   * @param name - The name of the tool
   * @returns The tool if found, undefined otherwise
   */
  getTool(name: string): ITool | undefined {
    return this._tools.get(name);
  }

  /**
   * Check if a tool is registered
   * 
   * @param name - The name of the tool
   * @returns true if the tool is registered, false otherwise
   */
  hasTool(name: string): boolean {
    return this._tools.has(name);
  }

  /**
   * Get all registered tool names
   * 
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this._tools.keys());
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this._tools.clear();
    console.log('All tools cleared from registry');
  }

  /**
   * Get the number of registered tools
   * 
   * @returns The number of registered tools
   */
  get size(): number {
    return this._tools.size;
  }

  /**
   * Validate a tool schema
   * 
   * @param schema - The tool schema to validate
   * @throws Error if the schema is invalid
   */
  private _validateToolSchema(schema: IToolSchema): void {
    if (!schema.type || schema.type !== 'function') {
      throw new Error('Tool schema must have type "function"');
    }

    if (!schema.function) {
      throw new Error('Tool schema must have a function property');
    }

    if (!schema.function.name || typeof schema.function.name !== 'string') {
      throw new Error('Tool schema function must have a name');
    }

    if (!schema.function.description || typeof schema.function.description !== 'string') {
      throw new Error('Tool schema function must have a description');
    }

    if (!schema.function.parameters) {
      throw new Error('Tool schema function must have parameters');
    }

    if (schema.function.parameters.type !== 'object') {
      throw new Error('Tool schema parameters must be of type "object"');
    }
  }

  /**
   * Validate parameters against a tool schema
   * 
   * @param schema - The tool schema
   * @param args - The arguments to validate
   * @returns Error message if validation fails, null otherwise
   */
  private _validateParameters(
    schema: IToolSchema,
    args: Record<string, any>
  ): string | null {
    const { parameters } = schema.function;
    const { required = [], properties = {} } = parameters;

    // Check required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in args)) {
        return `Missing required parameter: ${requiredParam}`;
      }
    }

    // Check parameter types (basic validation)
    for (const [key, value] of Object.entries(args)) {
      if (!(key in properties)) {
        // Allow extra parameters (LLM might send additional context)
        continue;
      }

      const propSchema = properties[key];
      if (propSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        const expectedType = propSchema.type;

        // Basic type checking
        if (expectedType === 'string' && actualType !== 'string') {
          return `Parameter ${key} must be a string, got ${actualType}`;
        }
        if (expectedType === 'number' && actualType !== 'number') {
          return `Parameter ${key} must be a number, got ${actualType}`;
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          return `Parameter ${key} must be a boolean, got ${actualType}`;
        }
        if (expectedType === 'array' && actualType !== 'array') {
          return `Parameter ${key} must be an array, got ${actualType}`;
        }
        if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
          return `Parameter ${key} must be an object, got ${actualType}`;
        }
      }
    }

    return null;
  }
}

