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

import { showSettingsDialogWithValidation } from './settings';
import { ChatWidget } from './widget-simple.js';

/**
 * The plugin ID
 */
const PLUGIN_ID = '@jupyterlab/ai-assistant:plugin';

/**
 * Command IDs
 */
namespace CommandIDs {
  export const openSettings = 'ai-assistant:open-settings';
  export const openChat = 'ai-assistant:open-chat';
}

/**
 * Initialization data for the AI Assistant extension
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'AI-powered assistant for JupyterLab',
  autoStart: true,
  requires: [ISettingRegistry],
  optional: [ICommandPalette, ILabShell, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette | null,
    labShell: ILabShell | null,
    rendermime: IRenderMimeRegistry | null
  ) => {
    console.log('JupyterLab AI Assistant extension is activated!');

    let chatWidget: ChatWidget | null = null;

    // Load settings
    settingRegistry
      .load(PLUGIN_ID)
      .then(settings => {
        console.log('AI Assistant settings loaded:', settings.composite);
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
              // For now, create a demo streaming response
              console.log('Message sent:', content);

              // Create an async generator for streaming response
              async function* streamDemoResponse() {
                const demoResponse = `You said: "${content}"\n\nThis is a demo streaming response. The actual AI integration will be implemented in later tasks.\n\nHere's some **formatted** text with *italic* and a code example:\n\n\`\`\`python\nimport numpy as np\nimport pandas as pd\n\ndf = pd.DataFrame({'A': [1, 2, 3]})\nprint(df.head())\n\`\`\`\n\nAnd here's a link: https://jupyterlab.readthedocs.io`;

                // Simulate streaming by yielding chunks
                const words = demoResponse.split(' ');
                for (const word of words) {
                  yield word + ' ';
                  // Small delay to simulate streaming
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }

              return streamDemoResponse();
            },
            rendermime: rendermime || undefined
          });

          chatWidget.id = 'ai-assistant-chat';
          chatWidget.title.label = 'AI Assistant';
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
    }
  }
};

export default plugin;

// Export types
export * from './types';

// Export settings utilities
export * from './settings';

// Export widget
export * from './widget-simple.js';
