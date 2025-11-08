# تِقرار (Tqrar)

<div align="center">

![Tqrar Logo](./ghost-logo.png)

**AI-Powered JupyterLab Extension with Conversational Assistant**

[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)
[![JupyterLab](https://img.shields.io/badge/JupyterLab-4.0+-orange.svg)](https://jupyterlab.readthedocs.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

</div>

---

## About

**Tqrar** (تِقرار) — meaning "conversation" or "discussion" in Arabic and Urdu — is a **JupyterLab extension** that brings AI-powered conversational assistance directly into your data science workflow.

This is a **native JupyterLab extension**, not a standalone application. It integrates seamlessly into your existing JupyterLab environment, adding an AI assistant panel to help with:

- 📝 **Code Analysis**: Get explanations and suggestions for your code
- 🔍 **Data Insights**: Ask questions about your datasets and visualizations  
- 🐛 **Error Debugging**: Intelligent assistance with error messages
- 📚 **Documentation**: Quick access to library docs and examples
- 🤖 **Notebook Manipulation**: Create, modify, and manage notebook cells via natural language

### Key Features

- **Context-Aware**: Understands your active notebook, cells, and execution state
- **Tool Integration**: Can read/write files, create/modify cells, and execute code
- **Multiple LLM Providers**: OpenRouter, OpenAI, Anthropic, or local models
- **Streaming Responses**: Real-time AI responses with smooth streaming
- **Conversation History**: Persistent chat history across sessions
- **Theme Integration**: Automatically adapts to JupyterLab's light/dark themes

---

## Installation

### As a JupyterLab Extension (Development)

**Prerequisites:**
- JupyterLab >= 4.0.0
- Node.js >= 20.0.0 (for building)
- Python >= 3.8

**Install from source:**

```bash
# Clone the repository
git clone https://github.com/marsalanjaved1/tqrar.git
cd tqrar

# Install Node dependencies
jlpm install

# Build the extension
jlpm build

# Install as a development extension
jupyter labextension develop . --overwrite

# Build JupyterLab (if needed)
jupyter lab build
```

### Development Mode with Watch

For active development with auto-rebuild:

```bash
# Terminal 1: Watch TypeScript changes
jlpm watch

# Terminal 2: Run JupyterLab
jupyter lab
```

Refresh your browser after changes to see updates.

---

## Configuration

### Setting up your AI Provider

1. **Open JupyterLab** and click the AI Assistant icon in the left sidebar
2. **Click the settings/gear icon** in the chat panel
3. **Choose your provider:**
   - **OpenRouter** (Recommended): Access multiple models with one API key
   - **OpenAI**: Direct access to GPT models
   - **Anthropic**: Claude models  
   - **Local**: Self-hosted models (Ollama, LM Studio, etc.)
4. **Enter your API key** and select a model
5. **Click Save**

### Supported Models

**Free/Low-Cost:**
- DeepSeek V3.1 (Free - $0)
- Gemini 1.5 Flash (Free - $0)
- Llama 3.1 8B (Free - $0)
- Claude 3 Haiku (Low Cost)
- Claude 4.5 Haiku (Low Cost)

**Premium:**
- Claude 3.5 Sonnet
- GPT-4 Turbo
- GPT-4
- And many more via OpenRouter

### Get API Keys

- **OpenRouter**: https://openrouter.ai (supports 100+ models)
- **OpenAI**: https://platform.openai.com
- **Anthropic**: https://console.anthropic.com

---

## Usage

### Basic Workflow

1. **Open a notebook** in JupyterLab
2. **Click the AI Assistant icon** in the left sidebar
3. **Start chatting:**
   - "Create a cell that loads a CSV file and shows the first 5 rows"
   - "Explain what this pandas groupby operation does"
   - "Why is my model overfitting?"
   - "Generate a visualization for this dataset"

### Available Tools

The AI can use these tools to interact with your notebooks:

**Notebook Tools:**
- `createCell` - Add new cells
- `updateCell` - Modify existing cells
- `getCells` - View all cells
- `deleteCell` - Remove cells
- `moveCells` - Reorder cells
- `mergeCells` - Combine cells
- `splitCell` - Split a cell

**File System Tools:**
- `listFiles` - List files and directories
- `readFile` - Read file contents
- `writeFile` - Create/update files
- `deleteFile` - Delete files
- `createDirectory` - Create directories

**Code Inspection Tools:**
- `getCompletions` - Code completion suggestions
- `getDocumentation` - Get docs for functions/classes
- `inspectCode` - Analyze code structure

---

## Architecture

Built with modern web technologies:

```
tqrar/
├── src/
│   ├── index.ts              # Extension entry point
│   ├── widget.tsx            # React chat component
│   ├── conversation.ts       # Conversation manager
│   ├── llm/
│   │   └── client.ts         # LLM provider integration
│   ├── tools/
│   │   ├── registry.ts       # Tool management
│   │   ├── notebook.ts       # Notebook manipulation
│   │   ├── file.ts           # File system operations
│   │   └── inspection.ts     # Code inspection
│   ├── context.ts            # Notebook context tracking
│   ├── settings.ts           # Settings management
│   └── types.ts              # TypeScript definitions
├── style/                    # CSS styling
├── schema/                   # Settings schema
└── tqrar/                    # Python package
    └── labextension/         # Built extension
```

### Technology Stack

- **Frontend**: React 18, TypeScript 5.1
- **UI Framework**: JupyterLab 4.0, Lumino Widgets
- **Build System**: Webpack 5, Yarn
- **AI Integration**: OpenAI SDK, Streaming APIs
- **State Management**: React Hooks, Context API

---

## Development

### Building

```bash
# Install dependencies
jlpm install

# Build TypeScript
jlpm build

# Clean build artifacts
jlpm clean

# Watch mode (auto-rebuild)
jlpm watch
```

### Testing

```bash
# Check TypeScript types
jlpm build

# Lint code
jlpm lint

# Format code
jlpm format
```

### Making Changes

1. **Edit source files** in `src/`
2. **Build**: `jlpm build`
3. **Refresh JupyterLab** in your browser
4. **Test your changes**

For active development, use `jlpm watch` to auto-rebuild on file changes.

---

## Contributing

We welcome contributions! Whether it's:

- 🐛 Bug reports
- ✨ Feature requests
- 📝 Documentation improvements
- 💻 Code contributions

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to your fork: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## Roadmap

### Current (v0.1.0)
- ✅ Basic chat interface with streaming
- ✅ Context-aware notebook understanding
- ✅ Tool calling (file, notebook, inspection)
- ✅ Multiple LLM provider support
- ✅ Conversation history persistence

### Planned
- 🔄 Cell execution and output analysis
- 🔄 Variable inspection and debugging
- 🔄 Data visualization generation
- 🔄 Semantic code search
- 🔄 Multi-agent workflows

---

## Troubleshooting

### Extension not showing up
```bash
# Rebuild JupyterLab
jupyter lab build

# Check installed extensions
jupyter labextension list
```

### Build errors
```bash
# Clean and rebuild
jlpm clean
jlpm install
jlpm build
```

### API key issues
- Verify your API key is correct
- Check you have credits/quota available
- Try a different model (some require payment)

---

## License

This project is licensed under the **BSD 3-Clause License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built on the shoulders of giants:

- **[JupyterLab](https://jupyterlab.readthedocs.io)** - The foundation
- **[React](https://reactjs.org)** - UI framework
- **[TypeScript](https://www.typescriptlang.org)** - Type safety
- **[OpenAI](https://openai.com)** - AI capabilities

---

## Contact

- **GitHub**: [@marsalanjaved1](https://github.com/marsalanjaved1)
- **Issues**: [GitHub Issues](https://github.com/marsalanjaved1/tqrar/issues)
- **Repository**: [github.com/marsalanjaved1/tqrar](https://github.com/marsalanjaved1/tqrar)

---

<div align="center">

**Made for the Data Science Community**

*Iterate. Refine. Perfect. — تِقرار*

</div>
