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

// Import the icon
import iconSvgStr from '../style/icon.svg';

// Create the icon
const tqrarIcon = new LabIcon({
  name: 'tqrar:icon',
  svgstr: iconSvgStr
});
import { ConversationManager } from './conversation';
import { LLMClient } from './llm/client';
import { ToolRegistry } from './tools/registry';
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
          if (llmClient && toolRegistry && contextManager && historyStorage && historySaver) {
            // Load conversation history from storage
            const savedHistory = await historyStorage.load();

            conversationManager = new ConversationManager({
              llmClient,
              toolRegistry,
              contextManager,
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
            if (llmClient && toolRegistry && contextManager && historyStorage && historySaver) {
              // Load conversation history from storage
              const savedHistory = await historyStorage.load();

              conversationManager = new ConversationManager({
                llmClient,
                toolRegistry,
                contextManager,
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
            rendermime: rendermime || undefined
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
