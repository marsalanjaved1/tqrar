/**
 * Demo tool for testing the tool registry
 * This is a simple example tool that will be replaced with real tools in future tasks
 */

import { ITool, IToolResult, IToolSchema } from '../types';

/**
 * A simple echo tool that returns the input message
 */
export class EchoTool implements ITool {
  name = 'echo';
  category: 'read' | 'write' = 'read';

  schema: IToolSchema = {
    type: 'function',
    function: {
      name: 'echo',
      description: 'Echo back the provided message',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The message to echo back'
          }
        },
        required: ['message']
      }
    }
  };

  async execute(args: Record<string, any>): Promise<IToolResult> {
    try {
      const message = args.message as string;
      return {
        success: true,
        data: {
          echo: message,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: 'EchoError'
        }
      };
    }
  }
}

