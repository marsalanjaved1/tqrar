/**
 * LLM Client Manager for AI Assistant
 * 
 * Handles communication with various LLM providers (OpenRouter, OpenAI, Anthropic, Local)
 * Supports streaming responses and function calling
 */

import OpenAI from 'openai';
import { ISettings, IMessage, IToolSchema, IChatCompletionChunk } from '../types';
import { UrlValidator, SecurityLogger, SecurityEventType } from '../utils/security';

/**
 * LLM Client for managing communication with LLM APIs
 */
export class LLMClient {
  private _client: OpenAI;
  private _settings: ISettings;
  private _retryAttempts = 3;
  private _retryDelay = 1000; // Initial delay in ms

  constructor(settings: ISettings) {
    this._settings = settings;
    this._client = this.initializeClient();
  }

  /**
   * Initialize the OpenAI client with provider-specific configuration
   */
  private initializeClient(): OpenAI {
    const baseUrl = this.getBaseUrl();
    
    // Validate URL security
    const urlValidation = UrlValidator.validateProviderUrl(
      this._settings.provider,
      this._settings.baseUrl
    );
    
    if (!urlValidation.valid) {
      SecurityLogger.logEvent(
        SecurityEventType.INSECURE_CONNECTION,
        `Invalid provider URL: ${urlValidation.error}`,
        'high'
      );
      throw new Error(`Security error: ${urlValidation.error}`);
    }
    
    return new OpenAI({
      apiKey: this._settings.apiKey,
      baseURL: baseUrl,
      defaultHeaders: this.getHeaders(),
      dangerouslyAllowBrowser: true // Required for browser usage
    });
  }

  /**
   * Get the base URL for the selected provider
   */
  private getBaseUrl(): string {
    switch (this._settings.provider) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        // Anthropic uses a different API structure, but we can use OpenAI SDK
        // with a compatibility layer
        return 'https://api.anthropic.com/v1';
      case 'local':
        return this._settings.baseUrl || 'http://localhost:8000/v1';
      default:
        throw new Error(`Unknown provider: ${this._settings.provider}`);
    }
  }

  /**
   * Get provider-specific headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // OpenRouter requires specific headers
    if (this._settings.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://jupyterlab.local';
      headers['X-Title'] = 'JupyterLab AI Assistant';
    }

    // Anthropic uses a different header format
    if (this._settings.provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    return headers;
  }

  /**
   * Get the model name for the selected provider
   */
  private getModel(): string {
    switch (this._settings.provider) {
      case 'openrouter':
        // Use the model specified in settings, or default to Claude 3.5 Sonnet
        return this._settings.model || 'anthropic/claude-3.5-sonnet';
      case 'openai':
        return this._settings.model || 'gpt-4-turbo';
      case 'anthropic':
        return this._settings.model || 'claude-3-5-sonnet-20241022';
      case 'local':
        return this._settings.model || 'local-model';
      default:
        return 'gpt-4-turbo';
    }
  }

  /**
   * Format messages for the LLM API
   * Converts IMessage format to OpenAI API format
   */
  private formatMessages(messages: IMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      const baseMessage: any = {
        role: msg.role,
        content: msg.content
      };

      // Add tool calls if present
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        baseMessage.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
      }

      // Add tool call ID for tool messages
      if (msg.role === 'tool' && msg.toolCallId) {
        baseMessage.tool_call_id = msg.toolCallId;
      }

      return baseMessage;
    });
  }

  /**
   * Stream completion from the LLM with retry logic
   * 
   * @param messages - Conversation history
   * @param tools - Available tools for function calling
   * @returns Async generator yielding completion chunks
   */
  async *streamCompletion(
    messages: IMessage[],
    tools: IToolSchema[]
  ): AsyncGenerator<IChatCompletionChunk, void, unknown> {
    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < this._retryAttempts; attempt++) {
      try {
        // Format tools for OpenAI API
        const formattedTools = tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
          }
        }));

        // Create streaming completion request
        const stream = await this._client.chat.completions.create({
          model: this.getModel(),
          messages: this.formatMessages(messages),
          tools: formattedTools.length > 0 ? formattedTools : undefined,
          tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
          stream: true,
          temperature: this._settings.temperature ?? 0.7,
          max_tokens: this._settings.maxTokens ?? 4096
        });

        // Stream chunks to caller
        for await (const chunk of stream) {
          // Convert OpenAI chunk format to our IChatCompletionChunk format
          const formattedChunk: IChatCompletionChunk = {
            id: chunk.id,
            choices: chunk.choices.map(choice => ({
              delta: {
                role: choice.delta.role,
                content: choice.delta.content || undefined,
                tool_calls: choice.delta.tool_calls?.map(tc => ({
                  id: tc.id || '',
                  type: 'function' as const,
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || ''
                  }
                }))
              },
              finish_reason: choice.finish_reason || undefined
            }))
          };

          yield formattedChunk;
        }

        // Success - exit retry loop
        return;

      } catch (error) {
        lastError = error as Error;
        console.error(`LLM API error (attempt ${attempt + 1}/${this._retryAttempts}):`, error);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw this.formatError(error);
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < this._retryAttempts - 1) {
          const delay = this._retryDelay * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    throw this.formatError(lastError || new Error('Unknown error during LLM request'));
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    // Don't retry authentication errors
    if (error?.status === 401 || error?.status === 403) {
      return true;
    }

    // Don't retry invalid request errors
    if (error?.status === 400 || error?.status === 422) {
      return true;
    }

    // Don't retry payment required errors
    if (error?.status === 402) {
      return true;
    }

    return false;
  }

  /**
   * Format error for user-friendly display
   */
  private formatError(error: any): Error {
    if (error?.status === 401) {
      return new Error('Invalid API key. Please check your settings.');
    }

    if (error?.status === 402) {
      return new Error('Insufficient credits. Please add credits to your account.');
    }

    if (error?.status === 429) {
      return new Error('Rate limit exceeded. Please try again later.');
    }

    if (error?.status >= 500) {
      return new Error('LLM service error. Please try again later.');
    }

    if (error?.message) {
      return new Error(`LLM API error: ${error.message}`);
    }

    return new Error('Unknown error communicating with LLM service');
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update settings and reinitialize client
   * 
   * @param settings - New settings to apply
   */
  updateSettings(settings: ISettings): void {
    this._settings = settings;
    this._client = this.initializeClient();
  }

  /**
   * Get current settings
   */
  getSettings(): ISettings {
    return { ...this._settings };
  }
}
