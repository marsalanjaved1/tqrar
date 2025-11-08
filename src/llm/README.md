# LLM Client Module

This module provides the LLM client manager for the JupyterLab AI Assistant.

## Features

### Task 4.1: LLM Client Abstraction ✅
- **LLMClient class**: Main class for managing LLM API communication
- **getBaseUrl()**: Returns the appropriate base URL for each provider:
  - OpenRouter: `https://openrouter.ai/api/v1`
  - OpenAI: `https://api.openai.com/v1`
  - Anthropic: `https://api.anthropic.com/v1`
  - Local: Custom base URL from settings
- **getHeaders()**: Provides provider-specific headers:
  - OpenRouter: Includes `HTTP-Referer` and `X-Title` headers
  - Anthropic: Includes `anthropic-version` header
- **getModel()**: Selects the appropriate model based on provider and settings
- **formatMessages()**: Converts IMessage format to OpenAI API format

### Task 4.2: Streaming Response Handling ✅
- **streamCompletion()**: Async generator method for streaming completions
  - Handles streaming chunks from LLM API
  - Parses tool calls from streaming response
  - Implements comprehensive error handling for API failures
  - Includes retry logic with exponential backoff (up to 3 retries)
  - Distinguishes between retryable and non-retryable errors
  - Formats errors for user-friendly display

### Task 4.3: Provider-Specific Configurations ✅
- **OpenRouter integration**: 
  - Custom headers: `HTTP-Referer` and `X-Title`
  - Default model: `anthropic/claude-3.5-sonnet`
- **OpenAI provider**: 
  - Standard OpenAI API configuration
  - Default model: `gpt-4-turbo`
- **Anthropic provider**: 
  - Anthropic API version header
  - Default model: `claude-3-5-sonnet-20241022`
- **Local model provider**: 
  - Custom base URL support
  - Configurable model name
- **updateSettings()**: Reinitializes client when settings change

## Usage Example

```typescript
import { LLMClient } from './llm';
import { ISettings, IMessage, IToolSchema } from './types';

// Create settings
const settings: ISettings = {
  provider: 'openrouter',
  apiKey: 'sk-or-v1-...',
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.7,
  maxTokens: 4096
};

// Initialize client
const client = new LLMClient(settings);

// Prepare messages and tools
const messages: IMessage[] = [
  {
    role: 'user',
    content: 'Hello, can you help me with my notebook?',
    timestamp: new Date()
  }
];

const tools: IToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'getCells',
      description: 'Get all cells from a notebook',
      parameters: {
        type: 'object',
        properties: {
          notebookId: {
            type: 'string',
            description: 'The notebook ID'
          }
        },
        required: ['notebookId']
      }
    }
  }
];

// Stream completion
async function streamResponse() {
  try {
    for await (const chunk of client.streamCompletion(messages, tools)) {
      // Process each chunk
      const delta = chunk.choices[0]?.delta;
      if (delta.content) {
        console.log('Content:', delta.content);
      }
      if (delta.tool_calls) {
        console.log('Tool calls:', delta.tool_calls);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Update settings
const newSettings: ISettings = {
  ...settings,
  temperature: 0.5
};
client.updateSettings(newSettings);
```

## Error Handling

The client implements comprehensive error handling:

1. **Non-retryable errors** (immediate failure):
   - 401/403: Authentication errors
   - 400/422: Invalid request errors
   - 402: Payment required errors

2. **Retryable errors** (with exponential backoff):
   - 429: Rate limit errors
   - 500+: Server errors
   - Network errors

3. **User-friendly error messages**:
   - "Invalid API key. Please check your settings."
   - "Insufficient credits. Please add credits to your account."
   - "Rate limit exceeded. Please try again later."
   - "LLM service error. Please try again later."

## Requirements Satisfied

- ✅ Requirement 18.3: OpenAI provider configuration
- ✅ Requirement 18.4: Anthropic provider configuration
- ✅ Requirement 18.5: OpenRouter provider configuration
- ✅ Requirement 18.6: Model selection based on provider
- ✅ Requirement 18.7: Local model provider with custom base URL
- ✅ Requirement 18.8: Provider-specific headers and configuration
- ✅ Requirement 18.9: OpenRouter integration with all compatible models
- ✅ Requirement 12.6: Retry logic with exponential backoff
- ✅ Requirement 17.3: Streaming response handling
