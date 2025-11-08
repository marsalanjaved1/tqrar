# Inline Tool UI Implementation

## Overview

This document describes the implementation of inline tool call visualization, similar to Kiro's approach where tool executions appear directly in the conversation flow rather than in a separate container.

## Implementation Date

November 8, 2025

## Architecture

### Before: Separate Container Approach

Previously, tool execution panels were rendered in a separate container below the Thread component:

```tsx
<Thread />
{toolExecutions.length > 0 && (
  <div className="jp-AIAssistant-toolExecutions">
    {toolExecutions.map(execution => (
      <ToolExecutionPanel key={execution.id} execution={execution} />
    ))}
  </div>
)}
```

**Problems:**
- Tool executions appeared disconnected from the conversation
- Not chronologically integrated with messages
- Didn't match Kiro's inline UX pattern

### After: Inline Integration with Assistant UI

Now, tool execution panels are rendered inline using Assistant UI's `ToolFallback` component:

```tsx
<Thread
  assistantMessage={{
    components: {
      ToolFallback: ({ toolName, toolCallId }) => (
        <InlineToolUI toolName={toolName} toolCallId={toolCallId} />
      )
    }
  }}
/>
```

**Benefits:**
- Tool executions appear inline with assistant messages
- Chronologically integrated in the conversation flow
- Matches Kiro's UX pattern
- Leverages Assistant UI's built-in tool rendering system

## Components

### 1. ToolExecutionContext

**Purpose:** Provides tool execution tracker to child components via React Context

```typescript
const ToolExecutionContext = React.createContext<ToolExecutionTracker | undefined>(undefined);

const useToolExecutionTracker = () => {
  return React.useContext(ToolExecutionContext);
};
```

**Usage:**
- Wraps the entire chat component
- Makes tracker available to `InlineToolUI` component
- Avoids prop drilling through Assistant UI components

### 2. InlineToolUI Component

**Purpose:** Renders tool execution panel inline with messages

```typescript
const InlineToolUI: React.FC<{ toolName: string; toolCallId: string }> = 
  ({ toolName, toolCallId }) => {
  const tracker = useToolExecutionTracker();
  const [execution, setExecution] = React.useState<IToolExecutionEvent | null>(null);

  // Find and track execution by tool call ID
  React.useEffect(() => {
    // ... implementation
  }, [tracker, toolCallId]);

  if (!execution) {
    return null;
  }

  return <ToolExecutionPanel execution={execution} />;
};
```

**Features:**
- Receives `toolName` and `toolCallId` from Assistant UI
- Looks up execution from tracker using `toolCallId`
- Subscribes to execution updates for real-time status
- Renders the existing `ToolExecutionPanel` component

### 3. Thread Configuration

**Purpose:** Configure Assistant UI to use custom tool rendering

```typescript
<Thread
  assistantMessage={{
    components: {
      ToolFallback: ({ toolName, toolCallId }) => (
        <InlineToolUI toolName={toolName} toolCallId={toolCallId} />
      )
    }
  }}
/>
```

**How it works:**
- `assistantMessage` prop configures assistant message rendering
- `components.ToolFallback` specifies custom component for tool calls
- Assistant UI automatically renders this component when tools are called
- Component receives `toolName` and `toolCallId` as props

## Data Flow

### 1. Tool Execution Starts

```
ConversationManager.handleToolCalls()
  ↓
ToolExecutionTracker.startExecution()
  ↓
Emits 'execution:start' event
  ↓
InlineToolUI receives event (via useEffect)
  ↓
Updates local state with execution
  ↓
ToolExecutionPanel renders inline
```

### 2. Tool Execution Updates

```
ToolExecutionTracker.updateStatus()
  ↓
Emits 'execution:update' event
  ↓
InlineToolUI receives event
  ↓
Updates local state
  ↓
ToolExecutionPanel re-renders with new status
```

### 3. Tool Execution Completes

```
ToolExecutionTracker.completeExecution()
  ↓
Emits 'execution:complete' event
  ↓
InlineToolUI receives event
  ↓
Updates local state with result
  ↓
ToolExecutionPanel shows final result
```

## Integration with Assistant UI

### Assistant UI's Tool Rendering System

Assistant UI provides a built-in system for rendering tool calls:

1. **Tool Call Detection:** When the LLM returns tool calls, Assistant UI detects them
2. **ToolFallback Component:** If no specific tool UI is registered, uses `ToolFallback`
3. **Props Provided:** `toolName` and `toolCallId` are passed to the component
4. **Inline Rendering:** Component is rendered inline with the assistant message

### Our Integration

We leverage this system by:

1. **Providing ToolFallback:** Custom component that looks up execution data
2. **Using ToolCallId:** Links Assistant UI's tool call to our tracker
3. **Reusing ToolExecutionPanel:** Existing panel component works inline
4. **Real-time Updates:** Event system keeps UI in sync with execution state

## Advantages of Inline Approach

### 1. Better UX

- **Chronological Flow:** Tool executions appear exactly when they occur
- **Context Preservation:** Users see tools in context of the conversation
- **Kiro-like Experience:** Matches familiar UX pattern from Kiro

### 2. Cleaner Architecture

- **Leverages Assistant UI:** Uses built-in tool rendering system
- **No Separate Container:** Eliminates need for separate tool execution container
- **Automatic Positioning:** Assistant UI handles positioning and layout

### 3. Improved Performance

- **Lazy Rendering:** Only renders tool panels when needed
- **Component Reuse:** Existing `ToolExecutionPanel` works without changes
- **Event-driven Updates:** Efficient real-time updates via event system

### 4. Maintainability

- **Standard Pattern:** Uses Assistant UI's recommended approach
- **Less Custom Code:** Removes custom positioning and layout logic
- **Future-proof:** Compatible with Assistant UI updates

## Styling Considerations

### Inline Styling

Tool execution panels now appear inline, so styling must account for:

1. **Message Flow Integration:**
   - Panels should visually integrate with messages
   - Proper spacing between messages and panels
   - Consistent width with message bubbles

2. **Responsive Layout:**
   - Panels adapt to message container width
   - Mobile-friendly inline display
   - Proper wrapping and overflow handling

3. **Visual Hierarchy:**
   - Clear distinction between messages and tool panels
   - Consistent with JupyterLab theme
   - Accessible color contrast

### CSS Updates

The existing `tool-execution.css` styles work inline because:

- Panels are self-contained components
- Styling is relative to panel container
- No absolute positioning required
- Theme variables ensure consistency

## Testing

### Manual Testing Checklist

- [ ] Tool executions appear inline with messages
- [ ] Multiple tool calls render in correct order
- [ ] Status updates appear in real-time
- [ ] Results display correctly inline
- [ ] Errors show inline with proper styling
- [ ] Scrolling works smoothly with inline panels
- [ ] Theme switching works (light/dark)
- [ ] Accessibility features work inline

### Edge Cases

1. **Multiple Concurrent Tools:**
   - Each tool renders in its own inline panel
   - Status updates don't interfere with each other
   - Chronological order is maintained

2. **Long Tool Executions:**
   - Panel shows "Running..." status
   - User can continue conversation
   - Completion updates appear inline

3. **Tool Errors:**
   - Error displays inline with message
   - Conversation can continue
   - Error details are accessible

## Migration Notes

### Breaking Changes

None - this is a pure enhancement that improves the existing implementation.

### Backward Compatibility

- Existing `ToolExecutionPanel` component unchanged
- `ToolExecutionTracker` API unchanged
- Event system unchanged
- Only rendering location changed

### Upgrade Path

No upgrade needed - the change is transparent to users.

## Future Enhancements

### 1. Tool-Specific Rendering

Register custom UI components for specific tools:

```typescript
<Thread
  assistantMessage={{
    components: {
      ToolFallback: ({ toolName, toolCallId }) => {
        // Route to tool-specific component
        if (toolName === 'createCell') {
          return <CreateCellToolUI toolCallId={toolCallId} />;
        }
        return <InlineToolUI toolName={toolName} toolCallId={toolCallId} />;
      }
    }
  }}
/>
```

### 2. Collapsible Tool Groups

Group multiple related tool calls:

```typescript
<Thread
  assistantMessage={{
    components: {
      ToolFallback: ({ toolName, toolCallId }) => (
        <CollapsibleToolGroup>
          <InlineToolUI toolName={toolName} toolCallId={toolCallId} />
        </CollapsibleToolGroup>
      )
    }
  }}
/>
```

### 3. Tool Execution Timeline

Show visual timeline of tool executions:

```typescript
<Thread
  assistantMessage={{
    components: {
      ToolFallback: ({ toolName, toolCallId }) => (
        <ToolTimeline>
          <InlineToolUI toolName={toolName} toolCallId={toolCallId} />
        </ToolTimeline>
      )
    }
  }}
/>
```

## References

- Assistant UI Documentation: https://www.assistant-ui.com/
- Assistant UI Thread Config: `node_modules/@assistant-ui/react/dist/ui/thread-config.d.ts`
- Kiro Tool Visualization: (internal reference)

## Conclusion

The inline tool UI implementation successfully integrates tool execution visualization directly into the conversation flow, matching Kiro's UX pattern. By leveraging Assistant UI's built-in tool rendering system, we achieve a cleaner architecture, better UX, and improved maintainability while reusing existing components.
