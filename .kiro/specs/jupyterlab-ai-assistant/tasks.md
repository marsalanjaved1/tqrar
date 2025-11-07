# Implementation Plan

- [x] 1. Set up project structure and core interfaces

  - Create JupyterLab extension package structure with TypeScript configuration
  - Define core TypeScript interfaces (IMessage, IToolSchema, IToolResult, ISettings, IContext)
  - Set up build configuration (tsconfig.json, package.json with dependencies)
  - Create base directory structure (src/, style/, schema/)
  - _Requirements: 20.1, 20.2, 20.3_

- [x] 2. Implement settings management and API key configuration
- [x] 2.1 Create settings schema and dialog UI

  - Define settings schema in schema/plugin.json for JupyterLab settings registry
  - Implement SettingsDialog class with provider dropdown (OpenRouter, OpenAI, Anthropic, Local)
  - Add API key input field with password masking
  - Add model selection dropdown for OpenRouter with popular models
  - Add temperature and max tokens configuration fields
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 18.1, 18.2_

- [x] 2.2 Implement API key validation and storage

  - Implement API key encryption using JupyterLab's secure storage
  - Create validateApiKey() method that makes test request to selected provider
  - Handle validation errors and display user-friendly messages
  - Store validated settings in JupyterLab settings registry
  - _Requirements: 2.6, 2.7, 2.8, 16.3_

- [x] 3. Create chat UI widget and message rendering
- [x] 3.1 Implement base chat widget structure

  - Create ChatWidget class extending Lumino Widget
  - Implement message container with scrolling
  - Create message input textarea with send button
  - Add settings icon button in panel header
  - Style chat widget to match JupyterLab theme
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 Implement message rendering and formatting

  - Create renderMessage() method for different message types (user, assistant, tool)
  - Implement syntax highlighting for code blocks using CodeMirror
  - Add markdown rendering for formatted text
  - Implement table formatting for structured data
  - Add error message styling with red highlighting
  - Create scrollable containers for long outputs
  - Make links clickable
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [x] 3.3 Implement message input and submission

  - Handle Enter key press to send messages
  - Add Shift+Enter for multi-line input
  - Display loading indicator when waiting for response
  - Disable input while processing
  - Clear input after sending
  - _Requirements: 1.5, 17.1_

- [ ] 3.4 Refactor to use Assistant UI library

  - Add React, ReactDOM, and @assistant-ui/react dependencies to package.json
  - Convert ChatWidget from Lumino Widget to ReactWidget
  - Implement AssistantRuntimeProvider with custom chat adapter
  - Replace custom message rendering with Assistant UI Thread component
  - Configure Assistant UI theme to match JupyterLab dark/light themes
  - Add custom CSS for JupyterLab integration and styling
  - Implement streaming response handling with Assistant UI's runtime
  - Test message rendering, code blocks, markdown, and tool calls
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [ ] 4. Implement LLM client manager with OpenRouter support
- [ ] 4.1 Create LLM client abstraction

  - Implement LLMClient class with OpenAI SDK
  - Create getBaseUrl() method for different providers
  - Implement getHeaders() method for provider-specific headers
  - Add getModel() method to select appropriate model
  - Create formatMessages() method to convert IMessage to API format
  - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

- [ ] 4.2 Implement streaming response handling

  - Create streamCompletion() async generator method
  - Handle streaming chunks from LLM API
  - Parse tool calls from streaming response
  - Implement error handling for API failures
  - Add retry logic with exponential backoff (up to 3 retries)
  - _Requirements: 12.6, 17.3_

- [ ] 4.3 Add provider-specific configurations

  - Implement OpenRouter integration with HTTP-Referer and X-Title headers
  - Add OpenAI provider configuration
  - Add Anthropic provider configuration
  - Add local model provider configuration with custom base URL
  - Create updateSettings() method to reinitialize client on settings change
  - _Requirements: 18.9_

- [ ] 5. Implement context manager for notebook tracking
- [ ] 5.1 Create context manager with notebook tracking

  - Implement ContextManager class with INotebookTracker dependency
  - Set up currentChanged signal listener to track active notebook
  - Implement getActiveNotebook() method
  - Implement getActiveNotebookId() method
  - Implement getOpenNotebooks() method
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5.2 Implement context gathering for LLM

  - Create getContext() method returning IContext object
  - Include active notebook ID in context
  - Include list of open notebooks with IDs, paths, and names
  - Include kernel status for active notebook
  - Update context within 500ms of notebook switch
  - _Requirements: 3.5, 9.1, 9.2_

- [ ] 6. Implement tool registry and base tool infrastructure
- [ ] 6.1 Create tool registry system

  - Implement ToolRegistry class with Map storage
  - Create ITool interface with name, schema, and execute method
  - Implement register() method to add tools
  - Implement execute() method to run tools by name
  - Create getSchemas() method to return all tool schemas for LLM
  - Add parameter validation before tool execution
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 6.2 Implement tool error handling

  - Create ErrorHandler utility class
  - Implement handleToolError() for tool execution failures
  - Add timeout handling for long-running tools (10 second limit)
  - Return structured IToolResult with success flag and error details
  - Log tool errors for debugging
  - _Requirements: 15.5, 15.7, 12.1_

- [ ] 7. Implement core notebook tools
- [ ] 7.1 Implement cell reading tools

  - Create GetCellsTool to retrieve all cells from notebook
  - Include cell type, content, index, and execution count
  - Create GetCellTool to retrieve single cell by index
  - Optimize for notebooks with up to 100 cells (< 1 second)
  - Handle notebook not found errors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7.2 Implement cell writing and modification tools

  - Create CreateCellTool to insert new cells at specified index
  - Support cell types: code, markdown, raw
  - Create UpdateCellTool to modify cell content
  - Preserve cell type unless explicitly changed
  - Mark notebook as modified after changes
  - Update UI within 500ms of cell operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 7.3 Implement cell deletion and movement tools

  - Create DeleteCellTool to remove cells by index
  - Create MoveCellsTool to reorder cells
  - Create MergeCellsTool to combine multiple cells
  - Create SplitCellTool to split cell at cursor position
  - Handle edge cases (invalid indices, empty notebooks)
  - _Requirements: 5.1, 5.7_

- [ ] 8. Implement code execution tools
- [ ] 8.1 Create cell execution tool

  - Implement ExecuteCellTool using NotebookActions.run()
  - Send execute request to kernel via session context
  - Wait for execution completion before returning
  - Retrieve output from cell's output area
  - Capture execution count
  - Handle code cells only (return error for other types)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8.2 Implement batch execution tools

  - Create ExecuteAllCellsTool using NotebookActions.runAll()
  - Create ExecuteCellsAboveTool for cells above index
  - Create ExecuteCellsBelowTool for cells below index
  - Queue execution requests when kernel is busy
  - Notify user for executions longer than 30 seconds
  - _Requirements: 6.6, 6.7_

- [ ] 8.3 Implement output retrieval and interpretation

  - Create GetCellOutputTool to retrieve cell outputs
  - Parse text output as plain text
  - Identify error outputs by MIME type
  - Extract error messages and tracebacks
  - Identify display data (plots, tables, HTML)
  - Parse DataFrame representations
  - Identify image formats and dimensions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 8.4 Implement output clearing tools

  - Create ClearCellOutputTool to clear single cell output
  - Create ClearAllOutputsTool to clear all outputs in notebook
  - Update UI immediately after clearing
  - _Requirements: 6.4_

- [ ] 9. Implement kernel management tools
- [ ] 9.1 Create kernel information tools

  - Implement GetKernelInfoTool to retrieve kernel name, language, and version
  - Implement GetKernelStatusTool to check status (idle, busy, starting, restarting, dead)
  - Create ListAvailableKernelsTool to list all kernel specs
  - Handle cases where kernel is not available
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ] 9.2 Implement kernel control tools

  - Create RestartKernelTool with optional executeAll parameter
  - Create InterruptKernelTool to stop running execution
  - Create ChangeKernelTool to switch notebook kernel
  - Confirm completion of kernel operations
  - Detect and notify on kernel death
  - _Requirements: 8.4, 8.6_

- [ ] 10. Implement conversation manager and message orchestration
- [ ] 10.1 Create conversation manager

  - Implement ConversationManager class with message history storage
  - Create sendMessage() method that coordinates LLM and tool calls
  - Implement getHistory() method to retrieve conversation
  - Create clear() method to reset conversation
  - Add system prompt to conversation initialization
  - _Requirements: 13.1, 13.2, 13.6, 14.1_

- [ ] 10.2 Implement tool call orchestration

  - Create handleToolCalls() method to execute multiple tool calls
  - Execute tool calls in sequence
  - Format tool results as messages for LLM
  - Handle tool execution errors gracefully
  - Return tool results to LLM for final response generation
  - _Requirements: 15.4, 15.6_

- [ ] 10.3 Implement streaming response integration

  - Stream LLM responses to chat widget as they arrive
  - Handle partial tool call chunks
  - Accumulate streaming content for display
  - Handle finish reasons (stop, tool_calls, length)
  - _Requirements: 17.3_

- [ ] 11. Implement file system tools
- [ ] 11.1 Create file reading and listing tools

  - Implement ListFilesTool using Contents API
  - Implement ReadFileTool to read file contents as text
  - Restrict access to workspace directory only
  - Validate file paths to prevent directory traversal
  - _Requirements: 10.1, 10.2, 10.4, 16.1_

- [ ] 11.2 Create file writing tools

  - Implement WriteFileTool to create or overwrite files
  - Implement DeleteFileTool to remove files
  - Implement RenameFileTool to move/rename files
  - Implement CreateDirectoryTool for folder creation
  - Return clear error messages for permission failures
  - Deny requests outside workspace directory
  - _Requirements: 10.3, 10.5, 10.6, 16.1_

- [ ] 12. Implement code inspection tools
- [ ] 12.1 Create completion and documentation tools

  - Implement GetCompletionsTool using kernel complete_request
  - Implement GetDocumentationTool using kernel inspect_request
  - Implement InspectCodeTool for code at cursor position
  - Format documentation for display
  - Handle kernels that don't support inspection
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 13. Implement multi-notebook support
- [ ] 13.1 Add notebook identification and switching

  - Implement ListNotebooksTool to list all open notebooks
  - Support notebook identification by name or ID
  - Maintain separate conversation context per notebook
  - Clearly indicate which notebook responses refer to
  - Support "all notebooks" operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 14. Implement error handling and recovery
- [ ] 14.1 Create comprehensive error handling

  - Implement handleApiError() for LLM API failures
  - Implement handleKernelError() for kernel execution errors
  - Parse Python tracebacks to identify root cause
  - Provide plain language error explanations
  - Suggest fixes for common errors (API key, kernel unavailable)
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 15. Implement conversation history persistence
- [ ] 15.1 Add conversation history management

  - Store conversation history in widget state
  - Display history when chat panel opens
  - Implement scroll-to-load for previous messages
  - Restore conversation on panel reopen
  - Persist history across JupyterLab sessions
  - _Requirements: 13.3, 13.4, 13.5_

- [ ] 16. Implement security and permissions
- [ ] 16.1 Add security validations

  - Validate all file paths are within workspace
  - Use existing kernel sessions (no new permissions)
  - Encrypt API keys before storage
  - Use HTTPS for all LLM API calls
  - Exclude sensitive info from logs
  - Log unauthorized access attempts
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ] 17. Implement performance optimizations
- [ ] 17.1 Add caching mechanisms

  - Cache notebook cell contents for 30 seconds
  - Cache kernel info for 10 seconds
  - Cache tool schemas (static)
  - Implement cache invalidation on notebook changes
  - _Requirements: 17.4_

- [ ] 17.2 Optimize UI responsiveness

  - Display loading indicator within 100ms of message send
  - Complete simple tool operations within 5 seconds
  - Render UI updates within 200ms
  - Implement request queuing under load
  - _Requirements: 17.1, 17.2, 17.5, 17.6_

- [ ] 18. Register extension with JupyterLab
- [ ] 18.1 Create extension plugin and registration

  - Implement main plugin activation function
  - Register ChatWidget with ILabShell
  - Add chat icon to left sidebar
  - Register commands for opening/closing chat panel
  - Register settings schema with ISettingRegistry
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 1.1_

- [ ] 18.2 Implement extension lifecycle management

  - Handle extension disable/unregister cleanly
  - Implement settings migration for version updates
  - Clean up resources on extension disposal
  - _Requirements: 20.5, 20.6_

- [ ] 19. Create extension packaging and documentation
- [ ] 19.1 Set up build and packaging

  - Configure package.json with correct metadata and dependencies
  - Set up TypeScript build configuration
  - Create CSS styles for chat widget
  - Add extension metadata for JupyterLab
  - Create installation instructions
  - _Requirements: 20.1, 20.2_

- [ ] 19.2 Write user documentation

  - Create README with installation and usage instructions
  - Document API key configuration for each provider
  - Add examples of common use cases
  - Document available tools and their usage
  - Create troubleshooting guide
  - _Requirements: 2.1, 18.1_

- [ ]\* 20. Testing and validation
- [ ]\* 20.1 Write unit tests for core components

  - Test tool implementations with mock notebooks
  - Test conversation manager message handling
  - Test context manager notebook tracking
  - Test LLM client with mocked API responses
  - Test error handling for various failure scenarios
  - _Requirements: All_

- [ ]\* 20.2 Perform integration testing

  - Test end-to-end flow: user message → tool execution → response
  - Test multi-tool scenarios requiring sequential tool calls
  - Test error recovery and retry logic
  - Test streaming response handling
  - Test with different LLM providers (OpenRouter, OpenAI, Anthropic)
  - _Requirements: All_

- [ ]\* 20.3 Conduct manual testing
  - Test chat UI interactions and message formatting
  - Test settings dialog and API key validation
  - Test with various notebook sizes and complexities
  - Test performance with large notebooks (100+ cells)
  - Verify security restrictions (file access, path validation)
  - _Requirements: All_
