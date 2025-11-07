# OpenRouter Integration Details

## Overview

OpenRouter (openrouter.ai) provides unified access to multiple LLM providers through a single API endpoint. This allows users to access models from OpenAI, Anthropic, Google, Meta, and others without managing multiple API keys.

## Benefits

1. **Single API Key**: Users only need one OpenRouter API key to access multiple models
2. **Model Flexibility**: Easy switching between different models and providers
3. **Cost Optimization**: Compare pricing across providers
4. **Fallback Support**: Can configure fallback models if primary is unavailable
5. **OpenAI-Compatible API**: Uses the same API format as OpenAI, making integration straightforward

## API Endpoint

```
https://openrouter.ai/api/v1/chat/completions
```

## Supported Models with Function Calling

OpenRouter supports function calling for models that have this capability:

### Recommended Models:
- **anthropic/claude-3.5-sonnet** - Best for complex reasoning and code
- **anthropic/claude-3-opus** - Most capable, higher cost
- **anthropic/claude-3-haiku** - Fast and cost-effective
- **openai/gpt-4-turbo** - Strong general purpose
- **openai/gpt-4o** - Latest OpenAI model
- **openai/gpt-3.5-turbo** - Fast and economical
- **google/gemini-pro-1.5** - Good for long context
- **meta-llama/llama-3.1-70b-instruct** - Open source option

## Authentication

```typescript
headers: {
  "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
  "HTTP-Referer": "https://jupyterlab.local", // Optional
  "X-Title": "JupyterLab AI Assistant" // Optional
}
```

## Request Format

OpenRouter uses OpenAI-compatible format:

```typescript
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful AI assistant..."
    },
    {
      "role": "user",
      "content": "Execute the first cell"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "executeCell",
        "description": "Execute a code cell",
        "parameters": {
          "type": "object",
          "properties": {
            "notebookId": {"type": "string"},
            "cellIndex": {"type": "number"}
          },
          "required": ["notebookId", "cellIndex"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

## Response Format

Same as OpenAI:

```typescript
{
  "id": "gen-xxx",
  "model": "anthropic/claude-3.5-sonnet",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_xxx",
            "type": "function",
            "function": {
              "name": "executeCell",
              "arguments": "{\"notebookId\":\"nb-123\",\"cellIndex\":0}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ]
}
```

## Model Selection UI

The settings dialog should include:

1. **Provider Dropdown**: OpenAI, Anthropic, OpenRouter, Local
2. **API Key Input**: Text field for the API key
3. **Model Dropdown** (when OpenRouter selected):
   - Grouped by provider (Anthropic, OpenAI, Google, etc.)
   - Show pricing information
   - Indicate function calling support
   - Default to `anthropic/claude-3.5-sonnet`

## Configuration Storage

Store in JupyterLab settings:

```json
{
  "provider": "openrouter",
  "apiKey": "sk-or-v1-xxx", // Encrypted
  "model": "anthropic/claude-3.5-sonnet",
  "baseUrl": "https://openrouter.ai/api/v1",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

## Error Handling

OpenRouter-specific errors:

- **402 Payment Required**: Insufficient credits
- **429 Rate Limited**: Too many requests
- **502 Bad Gateway**: Upstream provider issue
- **Model not found**: Invalid model name

## Implementation Notes

1. **Use OpenAI SDK**: Can use the OpenAI JavaScript SDK with custom base URL
2. **Streaming Support**: OpenRouter supports streaming responses
3. **Token Counting**: OpenRouter provides token usage in response
4. **Model Fallbacks**: Can specify fallback models in request
5. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors

## Example Implementation

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: settings.apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://jupyterlab.local',
    'X-Title': 'JupyterLab AI Assistant'
  }
});

const response = await client.chat.completions.create({
  model: settings.model,
  messages: conversationHistory,
  tools: toolDefinitions,
  tool_choice: 'auto',
  stream: true
});
```

## Testing

Test with different models:
1. Anthropic Claude (best for code)
2. OpenAI GPT-4 (general purpose)
3. Google Gemini (long context)
4. Open source models (cost-effective)

Verify function calling works correctly with each model.
