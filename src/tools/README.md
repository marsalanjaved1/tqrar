# Tool Registry

This directory contains the tool registry system for the JupyterLab AI Assistant.

## Overview

The tool registry manages all available tools that the AI Assistant can use to interact with JupyterLab. It provides:

- **Tool Registration**: Register tools with validation
- **Tool Execution**: Execute tools by name with parameter validation
- **Schema Management**: Provide tool schemas to the LLM for function calling
- **Error Handling**: Comprehensive error handling with timeouts

## Usage

### Creating a Tool

Implement the `ITool` interface:

```typescript
import { ITool, IToolResult, IToolSchema } from '../types';

export class MyTool implements ITool {
  name = 'myTool';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'myTool',
      description: 'Description of what this tool does',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1'
          }
        },
        required: ['param1']
      }
    }
  };

  async execute(args: Record<string, any>): Promise<IToolResult> {
    try {
      // Tool implementation
      return {
        success: true,
        data: { result: 'success' }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.name
        }
      };
    }
  }
}
```

### Using the Tool Registry

```typescript
import { ToolRegistry } from './registry';
import { MyTool } from './myTool';

// Create registry
const registry = new ToolRegistry(app, notebookTracker);

// Register tools
registry.register(new MyTool());

// Get schemas for LLM
const schemas = registry.getSchemas();

// Execute a tool
const result = await registry.execute('myTool', { param1: 'value' });

if (result.success) {
  console.log('Tool result:', result.data);
} else {
  console.error('Tool error:', result.error);
}
```

### Error Handling

The `ErrorHandler` utility provides comprehensive error handling:

```typescript
import { ErrorHandler } from '../utils/errors';

// Execute with timeout (default 10 seconds)
const result = await ErrorHandler.executeWithTimeout(
  'myTool',
  async () => {
    return await tool.execute(args);
  },
  10000 // timeout in ms
);

// Retry with exponential backoff
const data = await ErrorHandler.withRetry(
  async () => {
    return await fetchData();
  },
  3, // max retries
  1000 // initial delay ms
);

// Handle API errors
try {
  await llmClient.call();
} catch (error) {
  const message = await ErrorHandler.handleApiError(error);
  console.error(message);
}
```

## Features

### Tool Registry

- ✅ Register/unregister tools
- ✅ Execute tools by name
- ✅ Parameter validation
- ✅ Schema validation
- ✅ Get all tool schemas
- ✅ Check tool existence

### Error Handler

- ✅ Tool error handling
- ✅ API error handling
- ✅ Kernel error handling
- ✅ Timeout handling (10 second default)
- ✅ Retry with exponential backoff
- ✅ Error message sanitization
- ✅ Structured error results

## Next Steps

Future tasks will implement specific tools:
- Notebook tools (get/create/update/delete cells)
- Execution tools (execute cells, get outputs)
- Kernel tools (restart, interrupt, get status)
- File system tools (read/write files)
- Code inspection tools (completions, documentation)

