# Design Document: Tool Call Visualization

## Overview

This design document outlines the architecture and implementation approach for adding Kiro-style tool call visualization to TQRAR. The feature will integrate seamlessly with the existing Assistant UI-based chat interface, displaying tool executions in real-time with status tracking, parameter display, and result formatting.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Interface (React)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Assistant UI Thread Component               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  User Message                                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Tool Execution Panel (NEW)                     │  │  │
│  │  │  ├─ Tool Name & Icon                            │  │  │
│  │  │  ├─ Status Indicator (running/success/error)    │  │  │
│  │  │  ├─ Parameters (collapsible)                    │  │  │
│  │  │  ├─ Execution Time                              │  │  │
│  │  │  └─ Result (collapsible)                        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Assistant Message                               │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Conversation Manager (TypeScript)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  sendMessage() - Orchestrates LLM & Tool Execution   │  │
│  │  handleToolCalls() - Executes tools sequentially     │  │
│  │  NEW: Tool execution event emitter                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Tool Registry (TypeScript)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  execute() - Runs individual tools                   │  │
│  │  NEW: Execution lifecycle hooks                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
ChatWidget (ReactWidget)
└── ChatComponent (React.FC)
    └── AssistantRuntimeProvider
        └── Thread (Assistant UI)
            ├── Message (User)
            ├── ToolExecutionPanel (NEW)
            │   ├── ToolHeader
            │   │   ├── ToolIcon
            │   │   ├── ToolName
            │   │   └── StatusBadge
            │   ├── ToolParameters (collapsible)
            │   ├── ExecutionTimer
            │   └── ToolResult (collapsible)
            └── Message (Assistant)
```

## Components and Interfaces

### 1. ToolExecutionPanel Component

**Purpose:** Display a single tool execution with all its details

**Props:**
```typescript
interface IToolExecutionPanelProps {
  toolCall: IToolCall;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  result?: IToolResult;
  error?: Error;
}
```

**State:**
```typescript
interface IToolExecutionPanelState {
  parametersExpanded: boolean;
  resultExpanded: boolean;
}
```

**Behavior:**
- Renders immediately when tool call is detected
- Updates status in real-time as execution progresses
- Displays execution duration
- Allows expanding/collapsing parameters and results
- Shows appropriate icons based on tool type and status

### 2. ToolExecutionTracker (NEW)

**Purpose:** Track tool execution lifecycle and emit events for UI updates

**Interface:**
```typescript
interface IToolExecutionEvent {
  id: string;
  toolCall: IToolCall;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime: Date;
  endTime?: Date;
  result?: IToolResult;
  error?: Error;
}

class ToolExecutionTracker extends EventEmitter {
  private executions: Map<string, IToolExecutionEvent>;
  
  startExecution(toolCall: IToolCall): string;
  updateStatus(id: string, status: string): void;
  completeExecution(id: string, result: IToolResult): void;
  failExecution(id: string, error: Error): void;
  getExecution(id: string): IToolExecutionEvent | undefined;
  getAllExecutions(): IToolExecutionEvent[];
}
```

**Events:**
- `execution:start` - Tool execution begins
- `execution:update` - Status changes
- `execution:complete` - Tool execution succeeds
- `execution:error` - Tool execution fails

### 3. Enhanced ConversationManager

**Modifications:**
```typescript
class ConversationManager {
  private _toolExecutionTracker: ToolExecutionTracker;
  
  // Modified to emit tool execution events
  async handleToolCalls(toolCalls: IToolCall[]): Promise<IMessage[]> {
    const results: IMessage[] = [];
    
    for (const toolCall of toolCalls) {
      // Start tracking
      const executionId = this._toolExecutionTracker.startExecution(toolCall);
      
      try {
        // Execute tool
        const result = await this._toolRegistry.execute(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );
        
        // Complete tracking
        this._toolExecutionTracker.completeExecution(executionId, result);
        
        results.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id,
          timestamp: new Date()
        });
      } catch (error) {
        // Fail tracking
        this._toolExecutionTracker.failExecution(executionId, error);
        
        results.push({
          role: 'tool',
          content: JSON.stringify({
            success: false,
            error: {
              message: error.message,
              type: error.name
            }
          }),
          toolCallId: toolCall.id,
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }
  
  getToolExecutionTracker(): ToolExecutionTracker {
    return this._toolExecutionTracker;
  }
}
```

### 4. Enhanced ChatWidget

**Modifications:**
```typescript
interface IChatWidgetOptions {
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  rendermime?: IRenderMimeRegistry;
  toolExecutionTracker?: ToolExecutionTracker; // NEW
}

class ChatWidget extends ReactWidget {
  private _toolExecutionTracker?: ToolExecutionTracker;
  
  constructor(options: IChatWidgetOptions = {}) {
    super();
    this._toolExecutionTracker = options.toolExecutionTracker;
    // ... existing code
  }
  
  render(): JSX.Element {
    return (
      <ChatComponent
        onSettingsClick={this._onSettingsClick}
        onMessageSend={this._onMessageSend}
        toolExecutionTracker={this._toolExecutionTracker}
      />
    );
  }
}
```

### 5. Enhanced ChatComponent

**Modifications:**
```typescript
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  toolExecutionTracker?: ToolExecutionTracker; // NEW
}> = ({ onSettingsClick, onMessageSend, toolExecutionTracker }) => {
  const [toolExecutions, setToolExecutions] = React.useState<IToolExecutionEvent[]>([]);
  
  // Subscribe to tool execution events
  React.useEffect(() => {
    if (!toolExecutionTracker) return;
    
    const handleExecutionStart = (event: IToolExecutionEvent) => {
      setToolExecutions(prev => [...prev, event]);
    };
    
    const handleExecutionUpdate = (event: IToolExecutionEvent) => {
      setToolExecutions(prev => 
        prev.map(e => e.id === event.id ? event : e)
      );
    };
    
    toolExecutionTracker.on('execution:start', handleExecutionStart);
    toolExecutionTracker.on('execution:update', handleExecutionUpdate);
    toolExecutionTracker.on('execution:complete', handleExecutionUpdate);
    toolExecutionTracker.on('execution:error', handleExecutionUpdate);
    
    return () => {
      toolExecutionTracker.off('execution:start', handleExecutionStart);
      toolExecutionTracker.off('execution:update', handleExecutionUpdate);
      toolExecutionTracker.off('execution:complete', handleExecutionUpdate);
      toolExecutionTracker.off('execution:error', handleExecutionUpdate);
    };
  }, [toolExecutionTracker]);
  
  // ... rest of component
};
```

## Data Models

### Tool Execution Event

```typescript
interface IToolExecutionEvent {
  id: string;                    // Unique execution ID
  toolCall: IToolCall;           // Original tool call from LLM
  status: ToolExecutionStatus;   // Current status
  startTime: Date;               // When execution started
  endTime?: Date;                // When execution completed
  duration?: number;             // Execution time in ms
  result?: IToolResult;          // Result if successful
  error?: {                      // Error if failed
    message: string;
    type: string;
    stack?: string;
  };
}

type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error';
```

### Tool Metadata

```typescript
interface IToolMetadata {
  name: string;
  displayName: string;
  description: string;
  icon: string;                  // Icon identifier
  category: 'notebook' | 'file' | 'inspection' | 'other';
  color: string;                 // Theme color for the tool
}
```

## Visual Design

### Tool Execution Panel Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 createCell                              ✓ Success    │
│ ─────────────────────────────────────────────────────── │
│ Parameters ▼                                            │
│   {                                                     │
│     "cellType": "code",                                 │
│     "content": "import pandas as pd"                    │
│   }                                                     │
│ ─────────────────────────────────────────────────────── │
│ Result ▼                                                │
│   Cell created at index 3                               │
│ ─────────────────────────────────────────────────────── │
│ Executed in 45ms                                        │
└─────────────────────────────────────────────────────────┘
```

### Status Indicators

- **Pending:** Gray circle with clock icon
- **Running:** Blue spinning circle
- **Success:** Green checkmark
- **Error:** Red X with error icon

### Color Scheme (JupyterLab Variables)

```css
/* Tool panel background */
--tool-panel-bg: var(--jp-layout-color2);

/* Tool panel border */
--tool-panel-border: var(--jp-border-color1);

/* Status colors */
--status-pending: var(--jp-ui-font-color3);
--status-running: var(--jp-brand-color1);
--status-success: var(--jp-success-color1);
--status-error: var(--jp-error-color1);

/* Tool category colors */
--tool-notebook: var(--jp-info-color1);
--tool-file: var(--jp-warn-color1);
--tool-inspection: var(--jp-accent-color1);
```

### Icons

Tool icons will be sourced from:
1. JupyterLab's built-in icon set (@jupyterlab/ui-components)
2. Custom SVG icons for tool-specific actions
3. Fallback to generic tool icon

Icon mapping:
- `createCell` → notebook icon
- `updateCell` → edit icon
- `deleteCell` → trash icon
- `readFile` → file icon
- `writeFile` → save icon
- `listFiles` → folder icon
- `getCompletions` → lightbulb icon
- `getDocumentation` → book icon

## Error Handling

### Error Display Strategy

1. **Tool Not Found:**
   - Display: "Tool '{name}' not found"
   - Action: Show available tools

2. **Invalid Parameters:**
   - Display: "Invalid parameters for '{name}'"
   - Action: Highlight invalid parameters in red

3. **Execution Failure:**
   - Display: Error message from tool
   - Action: Show stack trace in collapsible section (dev mode only)

4. **Timeout:**
   - Display: "Tool execution timed out after {duration}s"
   - Action: Offer retry option

### Error Recovery

- Failed tool executions don't block subsequent tools
- Conversation continues even if tools fail
- Error details are logged to console for debugging
- User can retry failed operations through chat

## Testing Strategy

### Unit Tests

1. **ToolExecutionTracker:**
   - Test event emission for all lifecycle stages
   - Test execution tracking and retrieval
   - Test concurrent execution handling

2. **ToolExecutionPanel:**
   - Test rendering for all status states
   - Test parameter formatting (simple, complex, code)
   - Test result display (success, error, empty)
   - Test expand/collapse functionality

3. **ConversationManager Integration:**
   - Test tool execution event emission
   - Test error handling and event emission
   - Test multiple tool execution tracking

### Integration Tests

1. **End-to-End Tool Execution:**
   - Send message requiring tool call
   - Verify tool panel appears
   - Verify status updates correctly
   - Verify result displays

2. **Multiple Tool Calls:**
   - Send message requiring multiple tools
   - Verify all panels appear in order
   - Verify independent status tracking

3. **Error Scenarios:**
   - Test tool not found
   - Test invalid parameters
   - Test execution failure
   - Verify error display

### Visual Regression Tests

1. Tool panel appearance in light theme
2. Tool panel appearance in dark theme
3. Expanded vs collapsed states
4. Different tool types and categories
5. Long parameter values
6. Long result values

## Performance Considerations

### Optimization Strategies

1. **Lazy Rendering:**
   - Only render visible tool panels
   - Use React.memo for ToolExecutionPanel
   - Virtualize long lists of tool executions

2. **Event Throttling:**
   - Throttle status update events to max 60fps
   - Batch multiple status updates

3. **Memory Management:**
   - Limit stored tool executions to last 100
   - Clear old executions when conversation is cleared
   - Use WeakMap for execution tracking

4. **Animation Performance:**
   - Use CSS transforms for animations
   - Use will-change for animated properties
   - Disable animations on low-end devices

### Performance Metrics

- Tool panel render time: < 16ms (60fps)
- Status update latency: < 50ms
- Memory per tool execution: < 10KB
- Maximum concurrent tool panels: 50

## Accessibility

### Keyboard Navigation

- Tab: Navigate between tool panels
- Enter/Space: Expand/collapse sections
- Arrow keys: Navigate within expanded sections
- Escape: Collapse expanded sections

### Screen Reader Support

```html
<div 
  role="region" 
  aria-label="Tool execution: createCell"
  aria-live="polite"
  aria-busy={status === 'running'}
>
  <div role="status" aria-label={`Status: ${status}`}>
    <!-- Status indicator -->
  </div>
  
  <button 
    aria-expanded={parametersExpanded}
    aria-controls="tool-parameters"
  >
    Parameters
  </button>
  
  <div 
    id="tool-parameters"
    role="region"
    aria-hidden={!parametersExpanded}
  >
    <!-- Parameters content -->
  </div>
</div>
```

### Visual Accessibility

- Minimum contrast ratio: 4.5:1 for text
- Status indicators have both color and icon
- Focus indicators are clearly visible
- Text is resizable up to 200%

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)
- Implement ToolExecutionTracker
- Add event emitters to ConversationManager
- Create basic ToolExecutionPanel component

### Phase 2: UI Integration (Week 2)
- Integrate ToolExecutionPanel into ChatComponent
- Implement status tracking and updates
- Add basic styling

### Phase 3: Enhanced Features (Week 3)
- Add parameter formatting
- Add result display
- Implement expand/collapse
- Add icons and animations

### Phase 4: Polish and Testing (Week 4)
- Accessibility improvements
- Performance optimization
- Comprehensive testing
- Documentation

## Dependencies

### New Dependencies

None - all functionality can be implemented with existing dependencies:
- React (already installed)
- @assistant-ui/react (already installed)
- TypeScript (already installed)
- JupyterLab UI components (already installed)

### Modified Files

1. `src/conversation.ts` - Add ToolExecutionTracker
2. `src/widget.tsx` - Pass tracker to ChatComponent
3. `src/index.ts` - Initialize tracker and pass to widget
4. `src/types.ts` - Add new interfaces
5. `style/widget.css` - Add tool panel styles

### New Files

1. `src/components/ToolExecutionPanel.tsx` - Main component
2. `src/components/ToolExecutionTracker.ts` - Execution tracking
3. `src/components/ToolIcon.tsx` - Icon component
4. `src/components/ToolParameters.tsx` - Parameter display
5. `src/components/ToolResult.tsx` - Result display
6. `style/tool-execution.css` - Tool panel styles

## Future Enhancements

1. **Tool Execution History:**
   - View all tool executions in a conversation
   - Filter by tool type or status
   - Export execution logs

2. **Tool Execution Replay:**
   - Replay failed tool executions
   - Modify parameters and retry
   - Compare results across executions

3. **Tool Performance Metrics:**
   - Track average execution time per tool
   - Identify slow tools
   - Display performance trends

4. **Tool Execution Notifications:**
   - Desktop notifications for long-running tools
   - Sound alerts for completion/errors
   - Browser tab title updates

5. **Advanced Debugging:**
   - Step-through tool execution
   - Inspect intermediate states
   - View tool call stack

## Security Considerations

1. **Parameter Sanitization:**
   - Escape HTML in parameter values
   - Sanitize code snippets
   - Prevent XSS attacks

2. **Result Sanitization:**
   - Escape HTML in results
   - Limit result size to prevent DoS
   - Sanitize file paths

3. **Error Message Sanitization:**
   - Don't expose sensitive paths
   - Don't expose API keys or tokens
   - Sanitize stack traces

4. **Event Listener Cleanup:**
   - Remove event listeners on unmount
   - Prevent memory leaks
   - Clean up timers and intervals
