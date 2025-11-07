# @jupyterlab/ai-assistant

AI-powered assistant for JupyterLab

## Overview

This extension provides an AI-powered conversational interface integrated into JupyterLab. It enables users to interact with Jupyter notebooks through natural language, providing assistance with code execution, data analysis, and notebook management.

## Features

- Natural language interaction with notebooks
- Code execution and output interpretation
- Cell reading and modification
- Kernel management
- File system operations
- Multi-notebook support
- Support for multiple LLM providers (OpenRouter, OpenAI, Anthropic, Local)

## Installation

```bash
pip install @jupyterlab/ai-assistant
```

## Development

```bash
# Install dependencies
jlpm install

# Build the extension
jlpm build

# Watch for changes
jlpm watch
```

## Configuration

Configure the extension through JupyterLab's settings:

1. Open Settings → Advanced Settings Editor
2. Select "AI Assistant" from the list
3. Configure your LLM provider and API key

## Requirements

- JupyterLab >= 4.0.0
- Node.js >= 18.0.0

## License

BSD-3-Clause
