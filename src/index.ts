// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module ai-assistant
 */

/**
 * JupyterLab AI Assistant Extension
 * 
 * This extension provides an AI-powered conversational interface
 * for interacting with Jupyter notebooks.
 */



import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICommandPalette } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IStateDB } from '@jupyterlab/statedb';
import { LabIcon } from '@jupyterlab/ui-components';

import { showSettingsDialogWithValidation, loadSettings } from './settings';
import { ChatWidget } from './widget';

// Tqrar icon SVG
const iconSvgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M0 0 C36.3 0 72.6 0 110 0 C110 5.94 110 11.88 110 18 C116.27 18 122.54 18 129 18 C129 23.94 129 29.88 129 36 C134.94 36 140.88 36 147 36 C147 41.94 147 47.88 147 54 C152.94 54 158.88 54 165 54 C165 66.21 165 78.42 165 91 C170.94 91 176.88 91 183 91 C183 139.51 183 188.02 183 238 C177.06 238 171.12 238 165 238 C165 243.94 165 249.88 165 256 C152.79 256 140.58 256 128 256 C128 250.06 128 244.12 128 238 C121.73 238 115.46 238 109 238 C109 232.06 109 226.12 109 220 C103.39 220 97.78 220 92 220 C92 225.94 92 231.88 92 238 C86.06 238 80.12 238 74 238 C74 243.94 74 249.88 74 256 C61.46 256 48.92 256 36 256 C36 250.06 36 244.12 36 238 C30.06 238 24.12 238 18 238 C18 232.06 18 226.12 18 220 C12.39 220 6.78 220 1 220 C1 225.94 1 231.88 1 238 C-5.27 238 -11.54 238 -18 238 C-18 243.94 -18 249.88 -18 256 C-30.21 256 -42.42 256 -55 256 C-55 250.06 -55 244.12 -55 238 C-60.94 238 -66.88 238 -73 238 C-73 189.49 -73 140.98 -73 91 C-67.06 91 -61.12 91 -55 91 C-55 78.79 -55 66.58 -55 54 C-49.06 54 -43.12 54 -37 54 C-37 48.06 -37 42.12 -37 36 C-31.06 36 -25.12 36 -19 36 C-19 30.06 -19 24.12 -19 18 C-12.73 18 -6.46 18 0 18 C0 12.06 0 6.12 0 0 Z " fill="#CC4F38" transform="translate(73,0)"/><path d="M0 0 C12.21 0 24.42 0 37 0 C37 5.94 37 11.88 37 18 C42.94 18 48.88 18 55 18 C55 36.15 55 54.3 55 73 C49.06 73 43.12 73 37 73 C37 67.06 37 61.12 37 55 C24.79 55 12.58 55 0 55 C0 60.94 0 66.88 0 73 C-5.94 73 -11.88 73 -18 73 C-18 54.85 -18 36.7 -18 18 C-12.06 18 -6.12 18 0 18 C0 12.06 0 6.12 0 0 Z " fill="#FDFDFD" transform="translate(183,55)"/><path d="M0 0 C12.21 0 24.42 0 37 0 C37 5.94 37 11.88 37 18 C42.94 18 48.88 18 55 18 C55 36.15 55 54.3 55 73 C49.06 73 43.12 73 37 73 C37 67.06 37 61.12 37 55 C24.79 55 12.58 55 0 55 C0 60.94 0 66.88 0 73 C-5.94 73 -11.88 73 -18 73 C-18 54.85 -18 36.7 -18 18 C-12.06 18 -6.12 18 0 18 C0 12.06 0 6.12 0 0 Z " fill="#FEFDFD" transform="translate(73,55)"/><path d="M0 0 C12.21 0 24.42 0 37 0 C37 11.88 37 23.76 37 36 C24.79 36 12.58 36 0 36 C0 24.12 0 12.24 0 0 Z " fill="#356A92" transform="translate(183,110)"/><path d="M0 0 C12.21 0 24.42 0 37 0 C37 11.88 37 23.76 37 36 C24.79 36 12.58 36 0 36 C0 24.12 0 12.24 0 0 Z " fill="#346992" transform="translate(73,110)"/></svg>';

// Create the icon
const tqrarIcon = new LabIcon({
  name: 'tqrar:icon',
  svgstr: iconSvgStr
});
import { ConversationManager } from './conversation';
import { LLMClient } from './llm/client';
import { ToolRegistry } from './tools/registry';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { ContextManager } from './context';
import { DebouncedHistorySaver, HistoryStorage } from './history';
import { ISettings } from './types';

/**
 * The plugin ID
 */
const PLUGIN_ID = 'tqrar:plugin';

/**
 * Command IDs
 */
namespace CommandIDs {
  export const openSettings = 'ai-assistant:open-settings';
  export const openChat = 'ai-assistant:open-chat';
  export const clearHistory = 'ai-assistant:clear-history';
}

/**
 * Initialization data for the AI Assistant extension
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'AI-powered assistant for JupyterLab',
  autoStart: true,
  requires: [ISettingRegistry, IStateDB],
  optional: [ICommandPalette, ILabShell, IRenderMimeRegistry, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    stateDB: IStateDB,
    palette: ICommandPalette | null,
    labShell: ILabShell | null,
    rendermime: IRenderMimeRegistry | null,
    notebookTracker: INotebookTracker | null
  ) => {
    console.log('JupyterLab AI Assistant extension is activated!');

    let chatWidget: ChatWidget | null = null;
    let conversationManager: ConversationManager | null = null;
    let llmClient: LLMClient | null = null;
    let toolRegistry: ToolRegistry | null = null;
    let contextManager: ContextManager | null = null;
    let historyStorage: HistoryStorage | null = null;
    let historySaver: DebouncedHistorySaver | null = null;
    let toolExecutionTracker: ToolExecutionTracker | null = null;

    // Initialize tool execution tracker
    toolExecutionTracker = new ToolExecutionTracker();
    console.log('[AI Assistant] Tool execution tracker initialized');

    // Initialize history storage
    historyStorage = new HistoryStorage(stateDB);
    historySaver = new DebouncedHistorySaver(historyStorage, 1000);
    console.log('[AI Assistant] History storage initialized');

    // Initialize context manager if notebook tracker is available
    if (notebookTracker) {
      contextManager = new ContextManager({ notebookTracker });
      console.log('[AI Assistant] Context manager initialized');
    }

    // Initialize tool registry
    toolRegistry = new ToolRegistry(app, notebookTracker);
    console.log('[AI Assistant] Tool registry initialized');

    // Register file system tools
    const contentsManager = app.serviceManager.contents;
    const {
      ListFilesTool,
      ReadFileTool,
      WriteFileTool,
      DeleteFileTool,
      RenameFileTool,
      CreateDirectoryTool
    } = await import('./tools/file');

    toolRegistry.register(new ListFilesTool(app, contentsManager));
    toolRegistry.register(new ReadFileTool(app, contentsManager));
    toolRegistry.register(new WriteFileTool(app, contentsManager));
    toolRegistry.register(new DeleteFileTool(app, contentsManager));
    toolRegistry.register(new RenameFileTool(app, contentsManager));
    toolRegistry.register(new CreateDirectoryTool(app, contentsManager));
    console.log('[AI Assistant] File system tools registered');

    // Register notebook tools if notebook tracker is available
    if (notebookTracker) {
      const {
        GetCellsTool,
        GetCellTool,
        CreateCellTool,
        UpdateCellTool,
        DeleteCellTool,
        MoveCellsTool,
        MergeCellsTool,
        SplitCellTool,
        ListNotebooksTool
      } = await import('./tools/notebook');

      toolRegistry.register(new GetCellsTool(notebookTracker));
      toolRegistry.register(new GetCellTool(notebookTracker));
      toolRegistry.register(new CreateCellTool(notebookTracker));
      toolRegistry.register(new UpdateCellTool(notebookTracker));
      toolRegistry.register(new DeleteCellTool(notebookTracker));
      toolRegistry.register(new MoveCellsTool(notebookTracker));
      toolRegistry.register(new MergeCellsTool(notebookTracker));
      toolRegistry.register(new SplitCellTool(notebookTracker));
      toolRegistry.register(new ListNotebooksTool(notebookTracker));
      console.log('[AI Assistant] Notebook tools registered');
    }

    // Register code inspection tools if notebook tracker is available
    if (notebookTracker) {
      const {
        GetCompletionsTool,
        GetDocumentationTool,
        InspectCodeTool
      } = await import('./tools/inspection');

      toolRegistry.register(new GetCompletionsTool(notebookTracker));
      toolRegistry.register(new GetDocumentationTool(notebookTracker));
      toolRegistry.register(new InspectCodeTool(notebookTracker));
      console.log('[AI Assistant] Code inspection tools registered');
    }

    // Load settings and initialize LLM client
    settingRegistry
      .load(PLUGIN_ID)
      .then(async settings => {
        console.log('AI Assistant settings loaded');

        // Load and decrypt settings properly
        const settingsData = await loadSettings(settingRegistry, PLUGIN_ID);

        // Initialize LLM client if API key is configured
        if (settingsData.apiKey && settingsData.provider) {
          const fullSettings: ISettings = {
            provider: settingsData.provider as ISettings['provider'],
            apiKey: settingsData.apiKey,
            model: settingsData.model || '',
            baseUrl: settingsData.baseUrl || '',
            temperature: settingsData.temperature ?? 0.7,
            maxTokens: settingsData.maxTokens ?? 4096
          };

          llmClient = new LLMClient(fullSettings);
          console.log('[AI Assistant] LLM client initialized with decrypted API key');

          // Initialize conversation manager if all dependencies are ready
          if (llmClient && toolRegistry && contextManager && historyStorage && historySaver && toolExecutionTracker) {
            // Load conversation history from storage
            const savedHistory = await historyStorage.load();

            conversationManager = new ConversationManager({
              llmClient,
              toolRegistry,
              contextManager,
              toolExecutionTracker,
              initialHistory: savedHistory.length > 0 ? savedHistory : undefined,
              onHistoryChange: (messages) => {
                // Save history whenever it changes (debounced)
                if (historySaver) {
                  historySaver.save(messages);
                }
              }
            });
            console.log('[AI Assistant] Conversation manager initialized');
          }
        } else {
          console.log('[AI Assistant] API key not configured, skipping LLM client initialization');
        }

        // Listen for settings changes
        settings.changed.connect(async () => {
          console.log('[AI Assistant] Settings changed, reinitializing...');
          const newComposite = settings.composite as any;

          if (newComposite.apiKey && newComposite.provider) {
            const newSettings: ISettings = {
              provider: newComposite.provider,
              apiKey: newComposite.apiKey,
              model: newComposite.model,
              baseUrl: newComposite.baseUrl,
              temperature: newComposite.temperature,
              maxTokens: newComposite.maxTokens
            };

            if (llmClient) {
              llmClient.updateSettings(newSettings);
            } else {
              llmClient = new LLMClient(newSettings);
            }

            // Reinitialize conversation manager
            if (llmClient && toolRegistry && contextManager && historyStorage && historySaver && toolExecutionTracker) {
              // Load conversation history from storage
              const savedHistory = await historyStorage.load();

              conversationManager = new ConversationManager({
                llmClient,
                toolRegistry,
                contextManager,
                toolExecutionTracker,
                initialHistory: savedHistory.length > 0 ? savedHistory : undefined,
                onHistoryChange: (messages) => {
                  // Save history whenever it changes (debounced)
                  if (historySaver) {
                    historySaver.save(messages);
                  }
                }
              });
              console.log('[AI Assistant] Conversation manager reinitialized');
            }
          }
        });
      })
      .catch(reason => {
        console.error('Failed to load AI Assistant settings:', reason);
      });

    // Register command to open settings
    app.commands.addCommand(CommandIDs.openSettings, {
      label: 'AI Assistant: Configure Settings',
      caption: 'Configure AI Assistant settings and API key',
      execute: async () => {
        await showSettingsDialogWithValidation(settingRegistry, PLUGIN_ID);
      }
    });

    // Register command to clear conversation history
    app.commands.addCommand(CommandIDs.clearHistory, {
      label: 'AI Assistant: Clear Conversation History',
      caption: 'Clear the conversation history and start fresh',
      execute: async () => {
        if (conversationManager) {
          conversationManager.clear();
          console.log('[AI Assistant] Conversation history cleared');
        }

        if (historyStorage) {
          await historyStorage.clear();
          console.log('[AI Assistant] Stored history cleared');
        }
      }
    });

    // Register command to open chat
    app.commands.addCommand(CommandIDs.openChat, {
      label: 'AI Assistant: Open Chat',
      caption: 'Open the AI Assistant chat panel',
      execute: () => {
        if (!chatWidget || chatWidget.isDisposed) {
          // Create new chat widget with streaming support
          chatWidget = new ChatWidget({
            onSettingsClick: () => {
              void app.commands.execute(CommandIDs.openSettings);
            },
            onMessageSend: async (content: string) => {
              console.log('[AI Assistant] Message sent:', content);

              // Use conversation manager if available, otherwise show demo response
              if (conversationManager) {
                return conversationManager.sendMessage(content);
              } else {
                // Demo response when conversation manager is not initialized
                async function* streamDemoResponse() {
                  const demoResponse = `AI Assistant is not fully configured.\n\nPlease click the settings icon to configure your API key and provider.\n\nOnce configured, you'll be able to:\n- Ask questions about your notebooks\n- Execute code cells\n- Analyze data and visualizations\n- Debug errors\n- And much more!`;

                  // Simulate streaming by yielding chunks
                  const words = demoResponse.split(' ');
                  for (const word of words) {
                    yield word + ' ';
                    await new Promise(resolve => setTimeout(resolve, 30));
                  }
                }

                return streamDemoResponse();
              }
            },
            rendermime: rendermime || undefined,
            toolExecutionTracker: toolExecutionTracker || undefined
          });

          chatWidget.id = 'ai-assistant-chat';
          chatWidget.title.label = ''; // No label, just icon
          chatWidget.title.caption = 'Tqrar - AI Assistant'; // Tooltip on hover
          chatWidget.title.icon = tqrarIcon;
          chatWidget.title.closable = true;
        }

        // Add to left sidebar if labShell is available
        if (labShell && !chatWidget.isAttached) {
          labShell.add(chatWidget, 'left', { rank: 200 });
        }

        // Activate the widget
        if (labShell) {
          labShell.activateById(chatWidget.id);
        }
      }
    });

    // Add commands to palette
    if (palette) {
      palette.addItem({
        command: CommandIDs.openChat,
        category: 'AI Assistant'
      });
      palette.addItem({
        command: CommandIDs.openSettings,
        category: 'AI Assistant'
      });
      palette.addItem({
        command: CommandIDs.clearHistory,
        category: 'AI Assistant'
      });
    }

    // Save history when JupyterLab is closing
    window.addEventListener('beforeunload', () => {
      if (conversationManager && historySaver) {
        // Force immediate save on close
        const messages = conversationManager.getHistory();
        historySaver.saveNow(messages).catch(error => {
          console.error('[AI Assistant] Failed to save history on close:', error);
        });
      }
    });
  }
};

export default plugin;

// Export types
export * from './types';

// Export settings utilities
export * from './settings';

// Export widget
export * from './widget';

// Export context manager
export * from './context';

// Export tool registry
export * from './tools';

// Export utilities
export * from './utils';

// Export conversation manager
export * from './conversation';

// Export LLM client
export * from './llm';

// Export history storage
export * from './history';
