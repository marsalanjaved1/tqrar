# Conversation Manager Implementation

## Overview

The Conversation Manager is the core orchestration component of the JupyterLab AI Assistant. It manages conversation history, coordinates LLM interactions, and orchestrates tool execution.

## Components Implemented

### 1. ConversationManager Class (`conversation.ts`)

The main class that handles all conversation logic:

#### Key Features:
- **Message History Management**: Maintains conversation history with system prompt
- **Streaming Response Support**: Yields response chunks as they arrive from the LLM
- **Tool Call Orchestration**: Executes tool calls in sequence and formats results
- **Error Handling**: Gracefully handles errors from LLM API and tool execution
- **Context Integration**: Uses ContextManager to provide notebook context to LLM

#### Public Methods:

```typescript
// Send a message and get streaming response
async *sendMessage(content: string): AsyncGenerator<string>

// Execute multiple tool calls in sequence
async handleToolCalls(toolCalls: IToolCall[]): Promise<IMessage[]>

// Get conversation history
getHistory(): IMessage[]

// Clear conversation and reset to system prompt
clear(): void

// Update system prompt
updateSystemPrompt(prompt: string): void

// Get current system prompt
getSystemPrompt(): string
```

### 2. System Prompt

The system prompt defines the AI Assistant's personality and capabilities:

- **Identity**: AI assistant integrated into JupyterLab for data scientists
- **Capabilities**: Code execution, data analysis, debugging, visualization, etc.
- **Response Style**: Knowledgeable, decisive, supportive, concise
- **Code Quality**: Python best practices, PEP 8, clear and maintainable
- **Data Science Focus**: pandas, numpy, matplotlib, scikit-learn, etc.

The system prompt is embedded in the ConversationManager and can be customized.

### 3. Integration with Extension

The main plugin (`index.ts`) now:

1. **Initializes Components**:
   - ContextManager (tracks notebook state)
   - ToolRegistry (manages available tools)
   - LLMClient (communicates with LLM API)
   - ConversationManager (orchestrates everything)

2. **Handles Settings**:
   - Loads API key and provider settings
   - Reinitializes components when settings change
   - Validates configuration before enabling chat

3. **Connects to Chat Widget**:
   - Passes ConversationManager's `sendMessage` to ChatWidget
   - Streams responses to UI in real-time
   - Shows configuration prompt if not set up

## Message Flow

### User Message → LLM Response

```
User Input
    ↓
ConversationManager.sendMessage()
    ↓
Add user message to history
    ↓
Get context from ContextManager
    ↓
Get available tools from ToolRegistry
    ↓
Stream completion from LLMClient
    ↓
Yield content chunks to UI
    ↓
Add assistant message to history
```

### Tool Call Flow

```
LLM requests tool calls
    ↓
Accumulate tool call data from stream
    ↓
ConversationManager.handleToolCalls()
    ↓
For each tool call:
    - Parse arguments
    - Execute via ToolRegistry
    - Format result as message
    - Add to history
    ↓
Send tool results back to LLM
    ↓
Stream final response to UI
```

## Streaming Implementation

The implementation uses async generators for streaming:

1. **LLMClient** streams chunks from the API
2. **ConversationManager** processes chunks and yields content
3. **ChatWidget** (via Assistant UI) displays chunks in real-time

### Handling Tool Calls in Streaming

Tool calls are accumulated from streaming chunks:

```typescript
const toolCallsMap = new Map<number, { id, name, arguments }>();

for await (const chunk of stream) {
  // Accumulate tool call data
  if (chunk.delta.tool_calls) {
    // Build complete tool call from partial chunks
  }
}

// Execute tools after stream completes
if (finishReason === 'tool_calls') {
  await handleToolCalls(toolCalls);
}
```

## Error Handling

### LLM API Errors
- Captured in `sendMessage` try-catch
- Formatted as user-friendly messages
- Added to conversation history
- Displayed in chat UI

### Tool Execution Errors
- Captured in `handleToolCalls` try-catch
- Formatted as tool result messages
- Sent back to LLM for interpretation
- LLM explains error to user

## Requirements Satisfied

### Requirement 13.1, 13.2 (Conversation History)
✅ Messages are appended to history
✅ History is maintained throughout session

### Requirement 13.6 (Clear Conversation)
✅ `clear()` method resets conversation

### Requirement 14.1 (System Prompt)
✅ System prompt loaded at initialization
✅ Can be updated via `updateSystemPrompt()`

### Requirement 15.4 (Tool Execution)
✅ Tools executed in sequence
✅ Results formatted as messages

### Requirement 15.6 (Tool Results to LLM)
✅ Tool results sent back to LLM
✅ LLM generates final response

### Requirement 17.3 (Streaming)
✅ Responses streamed as they arrive
✅ Partial tool calls accumulated
✅ Finish reasons handled correctly

## Usage Example

```typescript
// Initialize components
const llmClient = new LLMClient(settings);
const toolRegistry = new ToolRegistry(app, notebookTracker);
const contextManager = new ContextManager({ notebookTracker });

// Create conversation manager
const conversationManager = new ConversationManager({
  llmClient,
  toolRegistry,
  contextManager
});

// Send a message and stream response
for await (const chunk of conversationManager.sendMessage('Hello!')) {
  console.log(chunk); // Display chunk in UI
}

// Get conversation history
const history = conversationManager.getHistory();

// Clear conversation
conversationManager.clear();
```

## Testing

To test the implementation:

1. **Configure API Key**: Open settings and add your OpenRouter/OpenAI API key
2. **Open Chat**: Click "AI Assistant: Open Chat" in command palette
3. **Send Message**: Type a message and press Enter
4. **Observe Streaming**: Response should stream in real-time
5. **Test Tool Calls**: Ask to read notebook cells or execute code (when tools are registered)

## Next Steps

The conversation manager is now complete and ready for:

1. **Tool Implementation**: Register actual tools (file system, code inspection, etc.)
2. **History Persistence**: Save/restore conversation across sessions
3. **Multi-Notebook Support**: Maintain separate conversations per notebook
4. **Advanced Features**: Voice input, collaborative features, etc.

## Files Modified

- `packages/ai-assistant/src/conversation.ts` - New file with ConversationManager
- `packages/ai-assistant/src/index.ts` - Updated to integrate ConversationManager
- `packages/ai-assistant/src/types.ts` - Already had necessary types
- `packages/ai-assistant/src/llm/client.ts` - Already implemented streaming
- `packages/ai-assistant/src/tools/registry.ts` - Already implemented tool execution

## Dependencies

- `@jupyterlab/application` - JupyterLab app integration
- `@jupyterlab/notebook` - Notebook tracking
- `@jupyterlab/settingregistry` - Settings management
- `openai` - LLM API client
- `@assistant-ui/react` - Chat UI components

All dependencies are already installed and configured.
