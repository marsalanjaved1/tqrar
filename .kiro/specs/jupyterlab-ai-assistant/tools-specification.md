# JupyterLab AI Assistant - Tools Specification

Based on the JupyterLab codebase analysis, here are the tools the AI assistant should have access to:

## Core Notebook Tools

### 1. **Notebook Management**
- `listNotebooks()` - List all open notebooks in the workspace
- `getActiveNotebook()` - Get the currently active/focused notebook
- `openNotebook(path: string)` - Open a notebook by file path
- `createNotebook(path?: string)` - Create a new notebook
- `saveNotebook(notebookId: string)` - Save a specific notebook
- `closeNotebook(notebookId: string)` - Close a notebook

**JupyterLab APIs Used:**
- `@jupyterlab/docmanager` - Document management
- `@jupyterlab/notebook` - Notebook widget and panel
- `INotebookTracker` - Track open notebooks

### 2. **Cell Operations**
- `getCells(notebookId: string)` - Get all cells from a notebook
- `getCell(notebookId: string, cellIndex: number)` - Get a specific cell
- `createCell(notebookId: string, cellType: 'code' | 'markdown' | 'raw', index?: number)` - Create a new cell
- `updateCell(notebookId: string, cellIndex: number, content: string)` - Update cell content
- `deleteCell(notebookId: string, cellIndex: number)` - Delete a cell
- `moveCells(notebookId: string, fromIndex: number, toIndex: number, count: number)` - Move cells
- `mergeCells(notebookId: string, startIndex: number, endIndex: number)` - Merge multiple cells
- `splitCell(notebookId: string, cellIndex: number, cursorPosition: number)` - Split a cell at cursor

**JupyterLab APIs Used:**
- `@jupyterlab/cells` - Cell widgets and models
- `ICellModel`, `ICodeCellModel`, `IMarkdownCellModel`, `IRawCellModel`
- `NotebookActions` - High-level notebook actions

### 3. **Cell Execution**
- `executeCell(notebookId: string, cellIndex: number)` - Execute a single cell
- `executeCells(notebookId: string, cellIndices: number[])` - Execute multiple cells
- `executeAllCells(notebookId: string)` - Execute all cells in notebook
- `executeCellsAbove(notebookId: string, cellIndex: number)` - Execute all cells above
- `executeCellsBelow(notebookId: string, cellIndex: number)` - Execute all cells below
- `interruptKernel(notebookId: string)` - Interrupt kernel execution
- `restartKernel(notebookId: string, executeAll?: boolean)` - Restart kernel

**JupyterLab APIs Used:**
- `@jupyterlab/services` - Kernel and session management
- `IKernelConnection` - Kernel communication
- `NotebookActions.run()`, `NotebookActions.runAll()`

### 4. **Cell Output Management**
- `getCellOutput(notebookId: string, cellIndex: number)` - Get cell execution output
- `clearCellOutput(notebookId: string, cellIndex: number)` - Clear output of a cell
- `clearAllOutputs(notebookId: string)` - Clear all outputs in notebook
- `getCellExecutionCount(notebookId: string, cellIndex: number)` - Get execution count

**JupyterLab APIs Used:**
- `@jupyterlab/outputarea` - Output area management
- `IOutput` from `@jupyterlab/nbformat`

### 5. **Kernel Management**
- `getKernelInfo(notebookId: string)` - Get kernel information (name, language, version)
- `getKernelStatus(notebookId: string)` - Get kernel status (idle, busy, starting, etc.)
- `listAvailableKernels()` - List all available kernel specs
- `changeKernel(notebookId: string, kernelName: string)` - Change notebook kernel
- `inspectVariable(notebookId: string, variableName: string, cursorPos?: number)` - Inspect a variable

**JupyterLab APIs Used:**
- `@jupyterlab/services` - Kernel specs and management
- `IKernelSpec`, `ISessionContext`
- `KernelMessage` - Kernel protocol messages

### 6. **Code Inspection & Completion**
- `getCompletions(notebookId: string, cellIndex: number, cursorPosition: number)` - Get code completions
- `getDocumentation(notebookId: string, code: string, cursorPosition: number)` - Get documentation for code
- `inspectCode(notebookId: string, cellIndex: number, cursorPosition: number)` - Inspect code at cursor

**JupyterLab APIs Used:**
- `@jupyterlab/completer` - Code completion
- `@jupyterlab/inspector` - Code inspection
- Kernel `inspect_request` and `complete_request` messages

## File System Tools

### 7. **File Operations**
- `listFiles(path: string)` - List files in a directory
- `readFile(path: string)` - Read file contents
- `writeFile(path: string, content: string)` - Write content to file
- `deleteFile(path: string)` - Delete a file
- `renameFile(oldPath: string, newPath: string)` - Rename/move a file
- `createDirectory(path: string)` - Create a directory

**JupyterLab APIs Used:**
- `@jupyterlab/services` - Contents API
- `Contents.IManager` - File system operations

## Workspace Tools

### 8. **Workspace Management**
- `getWorkspaceLayout()` - Get current workspace layout
- `getOpenDocuments()` - List all open documents (notebooks, files, etc.)
- `focusDocument(documentId: string)` - Focus/activate a document
- `getActiveDocument()` - Get currently active document

**JupyterLab APIs Used:**
- `@jupyterlab/application` - Application shell
- `ILabShell` - Shell management
- `@jupyterlab/docregistry` - Document registry

## Data Analysis Tools

### 9. **DataFrame Operations** (Python-specific)
- `inspectDataFrame(notebookId: string, variableName: string)` - Get DataFrame info (shape, columns, dtypes)
- `getDataFrameHead(notebookId: string, variableName: string, n?: number)` - Get first n rows
- `getDataFrameSummary(notebookId: string, variableName: string)` - Get statistical summary
- `getDataFrameColumns(notebookId: string, variableName: string)` - Get column names and types

**Implementation:**
- Execute Python code via kernel to inspect variables
- Use `%whos`, `type()`, `df.info()`, `df.head()`, etc.

### 10. **Visualization Tools**
- `getPlotOutput(notebookId: string, cellIndex: number)` - Get plot/image output from cell
- `savePlot(notebookId: string, cellIndex: number, path: string)` - Save plot to file

**JupyterLab APIs Used:**
- `@jupyterlab/rendermime` - Render MIME types
- Output area image/plot extraction

## Search & Navigation Tools

### 11. **Search Operations**
- `searchInNotebook(notebookId: string, query: string)` - Search for text in notebook
- `searchInWorkspace(query: string)` - Search across all files in workspace
- `findReferences(notebookId: string, variableName: string)` - Find all references to a variable

**JupyterLab APIs Used:**
- `@jupyterlab/documentsearch` - Document search provider

## Metadata & Settings Tools

### 12. **Notebook Metadata**
- `getNotebookMetadata(notebookId: string)` - Get notebook metadata
- `updateNotebookMetadata(notebookId: string, metadata: object)` - Update metadata
- `getCellMetadata(notebookId: string, cellIndex: number)` - Get cell metadata
- `updateCellMetadata(notebookId: string, cellIndex: number, metadata: object)` - Update cell metadata

**JupyterLab APIs Used:**
- `@jupyterlab/nbformat` - Notebook format
- `INotebookModel.metadata`

## Error Handling & Debugging Tools

### 13. **Error Analysis**
- `getLastError(notebookId: string)` - Get last error from kernel
- `parseTraceback(traceback: string)` - Parse Python traceback
- `getCellErrors(notebookId: string, cellIndex: number)` - Get errors from specific cell

**Implementation:**
- Parse kernel error messages
- Extract traceback information from outputs

## Tool Implementation Strategy

### Tool Categories by Priority:

**Phase 1 (MVP):**
1. Notebook Management (list, get active, open)
2. Cell Operations (get, create, update, delete)
3. Cell Execution (execute single, execute all)
4. Cell Output Management (get output, clear)
5. Kernel Management (get info, get status)

**Phase 2:**
6. File Operations (list, read, write)
7. Code Inspection & Completion
8. Workspace Management
9. Search Operations

**Phase 3:**
10. DataFrame Operations
11. Visualization Tools
12. Metadata Management
13. Advanced Error Analysis

### Tool Response Format

All tools should return structured JSON responses:

```typescript
interface ToolResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    type: string;
    traceback?: string;
  };
  metadata?: {
    notebookId?: string;
    cellIndex?: number;
    executionCount?: number;
    timestamp?: string;
  };
}
```

### Tool Execution Context

Each tool call should include context:
- Current notebook ID
- Active cell index
- Kernel status
- User permissions

### Security Considerations

- Validate all file paths (prevent directory traversal)
- Limit file system access to workspace directory
- Sanitize code execution inputs
- Rate limit kernel requests
- Validate notebook IDs and cell indices

## Integration with LLM

The AI assistant will:
1. Receive user message
2. Analyze intent and determine which tools to call
3. Execute tools via JupyterLab APIs
4. Format results for user
5. Maintain conversation context with tool results

Tools will be exposed to the LLM as function definitions following the OpenAI/Anthropic function calling format.
