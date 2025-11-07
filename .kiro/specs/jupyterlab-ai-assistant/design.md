# Design Document

## Overview

The JupyterLab AI Assistant is a JupyterLab extension that integrates an AI-powered conversational interface into the JupyterLab environment. The system uses modern LLM function calling APIs to enable natural language interaction with notebooks, cells, kernels, and the file system. The architecture follows JupyterLab's plugin-based design and leverages existing JupyterLab APIs for notebook manipulation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     JupyterLab Frontend                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Chat UI    │  │   Settings   │  │   Notebook   │      │
│  │   Widget     │  │   Dialog     │  │   Panel      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────┴──────────────────┴──────────────────┴───────┐    │
│  │         AI Assistant Extension Plugin               │    │
│  │                                                      │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │    │
│  │  │ Conversation│  │   Tool     │  │  Context   │   │    │
│  │  │  Manager   │  │  Registry  │  │  Manager   │   │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘   │    │
│  │        │                │                │          │    │
│  │  ┌─────┴────────────────┴────────────────┴──────┐  │    │
│  │  │           LLM Client Manager                  │  │    │
│  │  │  (OpenRouter/OpenAI/Anthropic/Local)         │  │    │
│  │  └───────────────────┬───────────────────────────┘  │    │
│  └────────────────────────┼──────────────────────────────┘    │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │   LLM API      │
                    │  (OpenRouter)  │
                    └────────────────┘
```

### Component Breakdown

#### 1. Chat UI Widget
- **Purpose**: Provides the user interface for chat interactions using Assistant UI library
- **Location**: Left sidebar panel
- **Technology**: React-based using @assistant-ui/react wrapped in ReactWidget
- **Responsibilities**:
  - Render conversation messages using Assistant UI components
  - Handle user input with Assistant UI's composer
  - Display loading states and streaming responses
  - Format code, markdown, and outputs (built-in to Assistant UI)
  - Scroll management (handled by Assistant UI)
  - Tool call visualization

#### 2. Settings Dialog
- **Purpose**: Configure LLM provider and API credentials
- **Responsibilities**:
  - Provider selection (OpenRouter, OpenAI, Anthropic, Local)
  - API key input and validation
  - Model selection (for OpenRouter)
  - Settings persistence
  - API key encryption

#### 3. AI Assistant Extension Plugin
- **Purpose**: Main extension entry point
- **Responsibilities**:
  - Register with JupyterLab application
  - Initialize all components
  - Register commands
  - Manage lifecycle

#### 4. Conversation Manager
- **Purpose**: Manage conversation state and history
- **Responsibilities**:
  - Store message history
  - Format messages for LLM API
  - Handle streaming responses
  - Manage conversation context
  - Persist conversation history

#### 5. Tool Registry
- **Purpose**: Register and manage available tools
- **Responsibilities**:
  - Define tool schemas
  - Route tool calls to implementations
  - Validate tool parameters
  - Handle tool errors
  - Return tool results

#### 6. Context Manager
- **Purpose**: Track notebook and workspace context
- **Responsibilities**:
  - Track active notebook
  - Monitor notebook changes
  - Track open documents
  - Provide context to LLM

#### 7. LLM Client Manager
- **Purpose**: Handle communication with LLM APIs
- **Responsibilities**:
  - Initialize API clients
  - Send requests to LLM
  - Handle streaming responses
  - Manage retries and errors
  - Support multiple providers

## Components and Interfaces

### Chat UI Widget

```typescript
import { ReactWidget } from '@jupyterlab/apputils';
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react';

class ChatWidget extends ReactWidget {
  private _conversationManager: ConversationManager;
  
  constructor(options: ChatWidget.IOptions) {
    super();
    this._conversationManager = options.conversationManager;
    this.addClass('jp-AIAssistant');
    this.id = 'ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;
  }
  
  render(): JSX.Element {
    return (
      <AssistantRuntimeProvider runtime={this.createRuntime()}>
        <div className="jp-AIAssistant-container">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    );
  }
  
  private createRuntime() {
    return useLocalRuntime({
      adapters: {
        chatAdapter: {
          async *run({ messages, abortSignal }) {
            // Send to conversation manager
            const stream = await this._conversationManager.sendMessage(
              messages[messages.length - 1].content,
              messages
            );
            
            // Stream response chunks
            for await (const chunk of stream) {
              if (abortSignal?.aborted) break;
              yield {
                type: 'text-delta',
                textDelta: chunk
              };
            }
          }
        }
      }
    });
  }
}

interface IMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: IToolCall[];
  toolCallId?: string;
  timestamp: Date;
}

interface IToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}
```

### Settings Dialog

```typescript
class SettingsDialog extends Dialog<ISettings> {
  private _providerSelect: HTMLSelectElement;
  private _apiKeyInput: HTMLInputElement;
  private _modelSelect: HTMLSelectElement;
  
  constructor(currentSettings: ISettings) {
    // Initialize dialog UI
  }
  
  async validateApiKey(provider: string, apiKey: string): Promise<boolean> {
    // Make test request to validate API key
  }
  
  getValue(): ISettings {
    // Return current settings
  }
}

interface ISettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model?: string; // For OpenRouter
  baseUrl?: string; // For local models
  temperature?: number;
  maxTokens?: number;
}
```

### Conversation Manager

```typescript
class ConversationManager {
  private _messages: IMessage[];
  private _llmClient: LLMClient;
  private _toolRegistry: ToolRegistry;
  private _contextManager: ContextManager;
  
  constructor(options: ConversationManager.IOptions) {
    // Initialize
  }
  
  async sendMessage(content: string): Promise<AsyncGenerator<string>> {
    // Add user message
    // Get context from context manager
    // Send to LLM with tools
    // Handle tool calls
    // Stream response
  }
  
  private async handleToolCalls(toolCalls: IToolCall[]): Promise<IMessage[]> {
    // Execute each tool call
    // Return tool results as messages
  }
  
  getHistory(): IMessage[] {
    // Return conversation history
  }
  
  clear(): void {
    // Clear history
  }
}
```

### Tool Registry

```typescript
class ToolRegistry {
  private _tools: Map<string, ITool>;
  
  constructor(app: JupyterFrontEnd, notebookTracker: INotebookTracker) {
    // Initialize with JupyterLab services
    this.registerTools();
  }
  
  private registerTools(): void {
    // Register all available tools
    this.register(new GetCellsTool());
    this.register(new ExecuteCellTool());
    this.register(new CreateCellTool());
    // ... more tools
  }
  
  register(tool: ITool): void {
    this._tools.set(tool.name, tool);
  }
  
  async execute(name: string, args: Record<string, any>): Promise<IToolResult> {
    const tool = this._tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.execute(args);
  }
  
  getSchemas(): IToolSchema[] {
    return Array.from(this._tools.values()).map(t => t.schema);
  }
}

interface ITool {
  name: string;
  schema: IToolSchema;
  execute(args: Record<string, any>): Promise<IToolResult>;
}

interface IToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

interface IToolResult {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    type: string;
  };
}
```

### Context Manager

```typescript
class ContextManager {
  private _notebookTracker: INotebookTracker;
  private _activeNotebook: NotebookPanel | null;
  
  constructor(notebookTracker: INotebookTracker) {
    this._notebookTracker = notebookTracker;
    this.setupTracking();
  }
  
  private setupTracking(): void {
    // Listen to notebook changes
    this._notebookTracker.currentChanged.connect(() => {
      this._activeNotebook = this._notebookTracker.currentWidget;
    });
  }
  
  getActiveNotebook(): NotebookPanel | null {
    return this._activeNotebook;
  }
  
  getActiveNotebookId(): string | null {
    return this._activeNotebook?.id ?? null;
  }
  
  getOpenNotebooks(): NotebookPanel[] {
    return Array.from(this._notebookTracker.widgets);
  }
  
  getContext(): IContext {
    return {
      activeNotebookId: this.getActiveNotebookId(),
      openNotebooks: this.getOpenNotebooks().map(nb => ({
        id: nb.id,
        path: nb.context.path,
        name: nb.title.label
      })),
      kernelStatus: this._activeNotebook?.sessionContext.session?.kernel?.status
    };
  }
}

interface IContext {
  activeNotebookId: string | null;
  openNotebooks: Array<{
    id: string;
    path: string;
    name: string;
  }>;
  kernelStatus?: string;
}
```

### LLM Client Manager

```typescript
class LLMClient {
  private _client: OpenAI;
  private _settings: ISettings;
  
  constructor(settings: ISettings) {
    this._settings = settings;
    this.initializeClient();
  }
  
  private initializeClient(): void {
    this._client = new OpenAI({
      apiKey: this._settings.apiKey,
      baseURL: this.getBaseUrl(),
      defaultHeaders: this.getHeaders()
    });
  }
  
  private getBaseUrl(): string {
    switch (this._settings.provider) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'local':
        return this._settings.baseUrl!;
    }
  }
  
  private getHeaders(): Record<string, string> {
    if (this._settings.provider === 'openrouter') {
      return {
        'HTTP-Referer': 'https://jupyterlab.local',
        'X-Title': 'JupyterLab AI Assistant'
      };
    }
    return {};
  }
  
  async *streamCompletion(
    messages: IMessage[],
    tools: IToolSchema[]
  ): AsyncGenerator<IChatCompletionChunk> {
    const stream = await this._client.chat.completions.create({
      model: this.getModel(),
      messages: this.formatMessages(messages),
      tools: tools,
      tool_choice: 'auto',
      stream: true,
      temperature: this._settings.temperature ?? 0.7,
      max_tokens: this._settings.maxTokens ?? 4096
    });
    
    for await (const chunk of stream) {
      yield chunk;
    }
  }
  
  private getModel(): string {
    if (this._settings.provider === 'openrouter') {
      return this._settings.model ?? 'anthropic/claude-3.5-sonnet';
    }
    // Default models for other providers
    return 'gpt-4-turbo';
  }
  
  private formatMessages(messages: IMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls,
      tool_call_id: msg.toolCallId
    }));
  }
  
  updateSettings(settings: ISettings): void {
    this._settings = settings;
    this.initializeClient();
  }
}

interface IChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: {
      role?: string;
      content?: string;
      tool_calls?: IToolCall[];
    };
    finish_reason?: string;
  }>;
}
```

## Data Models

### Message Model

```typescript
interface IMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: IToolCall[];
  toolCallId?: string;
  timestamp: Date;
  metadata?: {
    notebookId?: string;
    cellIndex?: number;
  };
}
```

### Tool Call Model

```typescript
interface IToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}
```

### Settings Model

```typescript
interface ISettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### Notebook Context Model

```typescript
interface INotebookContext {
  id: string;
  path: string;
  name: string;
  cells: ICellInfo[];
  kernelInfo: IKernelInfo;
}

interface ICellInfo {
  index: number;
  type: 'code' | 'markdown' | 'raw';
  content: string;
  executionCount?: number;
  outputs?: any[];
}

interface IKernelInfo {
  name: string;
  status: string;
  language: string;
}
```

## Tool Implementations

### Example: Get Cells Tool

```typescript
class GetCellsTool implements ITool {
  name = 'getCells';
  
  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'getCells',
      description: 'Get all cells from a notebook',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID'
          }
        },
        required: ['notebookId']
      }
    }
  };
  
  constructor(private notebookTracker: INotebookTracker) {}
  
  async execute(args: { notebookId: string }): Promise<IToolResult> {
    try {
      const notebook = this.findNotebook(args.notebookId);
      if (!notebook) {
        return {
          success: false,
          error: {
            message: `Notebook not found: ${args.notebookId}`,
            type: 'NotFoundError'
          }
        };
      }
      
      const cells = notebook.content.widgets.map((cell, index) => ({
        index,
        type: cell.model.type,
        content: cell.model.sharedModel.getSource(),
        executionCount: cell.model.type === 'code' 
          ? (cell.model as ICodeCellModel).executionCount 
          : undefined
      }));
      
      return {
        success: true,
        data: { cells }
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
  
  private findNotebook(id: string): NotebookPanel | undefined {
    return Array.from(this.notebookTracker.widgets).find(nb => nb.id === id);
  }
}
```

### Example: Execute Cell Tool

```typescript
class ExecuteCellTool implements ITool {
  name = 'executeCell';
  
  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'executeCell',
      description: 'Execute a code cell in a notebook',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID'
          },
          cellIndex: {
            type: 'number',
            description: 'The cell index (0-based)'
          }
        },
        required: ['notebookId', 'cellIndex']
      }
    }
  };
  
  constructor(private notebookTracker: INotebookTracker) {}
  
  async execute(args: { notebookId: string; cellIndex: number }): Promise<IToolResult> {
    try {
      const notebook = this.findNotebook(args.notebookId);
      if (!notebook) {
        return {
          success: false,
          error: {
            message: `Notebook not found: ${args.notebookId}`,
            type: 'NotFoundError'
          }
        };
      }
      
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
      
      if (cell.model.type !== 'code') {
        return {
          success: false,
          error: {
            message: 'Can only execute code cells',
            type: 'InvalidCellTypeError'
          }
        };
      }
      
      // Execute the cell
      await NotebookActions.run(notebook.content, notebook.sessionContext);
      
      // Get the output
      const codeCell = cell as CodeCell;
      const outputs = codeCell.model.outputs.toJSON();
      
      return {
        success: true,
        data: {
          executionCount: codeCell.model.executionCount,
          outputs
        }
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
  
  private findNotebook(id: string): NotebookPanel | undefined {
    return Array.from(this.notebookTracker.widgets).find(nb => nb.id === id);
  }
}
```

## Error Handling

### Error Types

1. **Tool Errors**: Tool execution failures
2. **API Errors**: LLM API failures
3. **Network Errors**: Connection issues
4. **Validation Errors**: Invalid parameters
5. **Kernel Errors**: Kernel execution failures

### Error Handling Strategy

```typescript
class ErrorHandler {
  static handleToolError(error: Error, toolName: string): IToolResult {
    console.error(`Tool error in ${toolName}:`, error);
    
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name
      }
    };
  }
  
  static async handleApiError(error: any): Promise<string> {
    if (error.status === 401) {
      return 'Invalid API key. Please check your settings.';
    } else if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    } else if (error.status === 402) {
      return 'Insufficient credits. Please add credits to your account.';
    } else if (error.status >= 500) {
      return 'LLM service error. Please try again later.';
    }
    
    return `Error: ${error.message}`;
  }
  
  static handleKernelError(error: any): string {
    // Parse Python traceback
    if (error.traceback) {
      const traceback = error.traceback.join('\n');
      return `Kernel error:\n${traceback}`;
    }
    
    return `Kernel error: ${error.ename}: ${error.evalue}`;
  }
}
```

## Testing Strategy

### Unit Tests

1. **Tool Tests**: Test each tool in isolation
2. **Conversation Manager Tests**: Test message handling and tool orchestration
3. **Context Manager Tests**: Test notebook tracking
4. **LLM Client Tests**: Test API communication (mocked)

### Integration Tests

1. **End-to-End Flow**: User message → Tool execution → Response
2. **Multi-Tool Scenarios**: Test complex workflows requiring multiple tools
3. **Error Scenarios**: Test error handling and recovery
4. **Streaming**: Test streaming response handling

### Manual Testing

1. **UI Testing**: Test chat interface interactions
2. **Settings Testing**: Test configuration dialog
3. **Provider Testing**: Test with different LLM providers
4. **Performance Testing**: Test with large notebooks

## Security Considerations

### API Key Storage

- Store API keys encrypted in JupyterLab settings
- Never log API keys
- Clear API keys from memory after use

### Code Execution

- Use existing kernel sessions (no new permissions)
- Validate all tool parameters
- Sanitize user inputs

### File System Access

- Restrict file operations to workspace directory
- Validate all file paths
- Prevent directory traversal attacks

### Network Security

- Use HTTPS for all API calls
- Validate SSL certificates
- Implement request timeouts

## Performance Optimization

### Caching

- Cache notebook cell contents for 30 seconds
- Cache kernel info for 10 seconds
- Cache tool schemas (static)

### Streaming

- Stream LLM responses to UI
- Use async generators for tool results
- Implement backpressure handling

### Lazy Loading

- Load tools on demand
- Lazy initialize API clients
- Defer heavy computations

## Deployment

### Extension Structure

```
jupyterlab-ai-assistant/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Extension entry point
│   ├── widget.ts             # Chat widget
│   ├── settings.ts           # Settings dialog
│   ├── conversation.ts       # Conversation manager
│   ├── tools/
│   │   ├── registry.ts       # Tool registry
│   │   ├── base.ts           # Base tool interface
│   │   ├── notebook.ts       # Notebook tools
│   │   ├── cell.ts           # Cell tools
│   │   ├── kernel.ts         # Kernel tools
│   │   └── file.ts           # File tools
│   ├── llm/
│   │   ├── client.ts         # LLM client
│   │   └── types.ts          # LLM types
│   ├── context.ts            # Context manager
│   └── utils/
│       ├── errors.ts         # Error handling
│       └── formatting.ts     # Message formatting
├── style/
│   └── index.css             # Widget styles
└── schema/
    └── plugin.json           # Settings schema
```

### Installation

```bash
# Development
pip install -e .
jupyter labextension develop . --overwrite

# Production
pip install jupyterlab-ai-assistant
```

### Configuration

Settings stored in JupyterLab settings:

```json
{
  "@jupyterlab/ai-assistant": {
    "provider": "openrouter",
    "apiKey": "encrypted-key",
    "model": "anthropic/claude-3.5-sonnet",
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

## Future Enhancements

1. **Multi-turn Tool Calls**: Support complex workflows with multiple tool calls
2. **Custom Tools**: Allow users to define custom tools
3. **Voice Input**: Add speech-to-text support
4. **Collaborative Features**: Share conversations with team members
5. **Notebook Templates**: Generate notebooks from descriptions
6. **Data Visualization**: Generate plots from natural language
7. **Code Refactoring**: Suggest and apply code improvements
8. **Test Generation**: Generate unit tests for code cells
9. **Documentation**: Generate markdown documentation
10. **Integration with Git**: Commit and push changes via chat
