# تِقرار (Tqrar)

<div align="center">

![Tqrar Logo](https://via.placeholder.com/200x200?text=Tqrar)

**AI-Powered Conversational Assistant for JupyterLab**

[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)
[![JupyterLab](https://img.shields.io/badge/JupyterLab-4.5+-orange.svg)](https://jupyterlab.readthedocs.io)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

[Website](https://tqrar.dev) • [Documentation](#documentation) • [Installation](#installation) • [Contributing](#contributing)

</div>

---

## 📖 About

**Tqrar** (تِقرار) — meaning "repetition" in Arabic and Urdu — is an intelligent AI assistant extension for JupyterLab that helps you iterate faster on your data science and machine learning workflows. Just as the name suggests, Tqrar enables you to repeat, refine, and perfect your work through natural conversation with AI.

### Etymology

The word **تِقرار** (tqrar) originates from Arabic and is widely used in Urdu:

- **Arabic**: تِكرار (tikrār) — from root ك ر ر (k-r-r), meaning "to repeat" or "repetition"
- **Urdu**: تکرار (tqrar) — carries the same meaning of repetition, iteration, or refinement

This perfectly captures the essence of data science: iterative experimentation, continuous refinement, and repeated analysis until you achieve the perfect result.

---

## ✨ Features

### 🤖 Intelligent Conversational Interface
- **Natural Language Interaction**: Ask questions about your notebooks, code, and data in plain English
- **Context-Aware Responses**: Understands your notebook structure, variables, and execution state
- **Streaming Responses**: Real-time AI responses with smooth, word-by-word streaming

### 🎨 Beautiful, Native Integration
- **Seamless JupyterLab Integration**: Fits naturally into your existing workflow
- **Theme-Aware Design**: Automatically adapts to JupyterLab's light and dark themes
- **Responsive UI**: Clean, modern interface built with React and TypeScript

### 🔧 Powerful Capabilities
- **Code Analysis**: Get explanations, suggestions, and improvements for your code
- **Data Insights**: Ask questions about your datasets and visualizations
- **Error Debugging**: Intelligent assistance with error messages and stack traces
- **Documentation**: Quick access to library documentation and examples

### 🚀 Developer-Friendly
- **Multiple LLM Providers**: Support for OpenRouter, OpenAI, Anthropic, and local models
- **Extensible Architecture**: Built on modern React patterns with clean separation of concerns
- **Type-Safe**: Full TypeScript implementation for reliability and maintainability

---

## 🎯 Use Cases

### For Data Scientists
```
You: "Explain what this pandas groupby operation does"
Tqrar: Analyzes your code and provides clear explanations with examples
```

### For ML Engineers
```
You: "Why is my model overfitting?"
Tqrar: Reviews your training code and suggests regularization techniques
```

### For Researchers
```
You: "Generate a visualization for this dataset"
Tqrar: Provides matplotlib/seaborn code tailored to your data structure
```

### For Students
```
You: "What's the difference between numpy arrays and pandas series?"
Tqrar: Explains concepts with practical examples from your notebook
```

---

## 📦 Installation

### Prerequisites

- **JupyterLab** 4.5.0 or higher
- **Node.js** 20.0.0 or higher
- **Python** 3.8 or higher

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/marsalanjaved1/tqrar.git
   cd tqrar
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the extension**
   ```bash
   yarn build
   ```

4. **Start JupyterLab in development mode**
   ```bash
   jupyter lab --dev-mode
   ```

5. **Open the AI Assistant**
   - Click the AI Assistant icon in the left sidebar, or
   - Use Command Palette: `Cmd/Ctrl + Shift + C` → "AI Assistant: Open Chat"

---

## ⚙️ Configuration

### Setting up your AI Provider

1. **Open Settings**
   - Click the settings icon (⚙️) in the AI Assistant panel
   - Or use Command Palette: "AI Assistant: Configure Settings"

2. **Choose your provider**
   - **OpenRouter** (Recommended): Access to multiple models with one API key
   - **OpenAI**: Direct access to GPT models
   - **Anthropic**: Claude models
   - **Local**: Self-hosted models (Ollama, LM Studio, etc.)

3. **Enter your API key**
   - Get your API key from your chosen provider
   - Paste it in the settings dialog
   - Click "Save"

### Provider Setup Guides

#### OpenRouter (Recommended)
```bash
# Get your API key from https://openrouter.ai
# Supports GPT-4, Claude, Llama, and 100+ other models
```

#### OpenAI
```bash
# Get your API key from https://platform.openai.com
# Supports GPT-4, GPT-3.5-turbo, and other OpenAI models
```

#### Local Models
```bash
# Install Ollama: https://ollama.ai
ollama pull llama2
# Set base URL to: http://localhost:11434
```

---

## 🏗️ Architecture

Tqrar is built with modern web technologies and follows best practices:

```
tqrar/
├── packages/
│   └── ai-assistant/           # Main extension package
│       ├── src/
│       │   ├── index.ts        # Extension entry point
│       │   ├── widget-simple.tsx  # React chat component
│       │   ├── settings.ts     # Settings management
│       │   └── types.ts        # TypeScript definitions
│       ├── style/
│       │   └── index.css       # Styling
│       └── schema/
│           └── plugin.json     # Settings schema
├── dev_mode/                   # Development environment
└── docs/                       # Documentation
```

### Technology Stack

- **Frontend**: React 18, TypeScript 5.5
- **UI Framework**: JupyterLab 4.5, Lumino Widgets
- **Build System**: Webpack 5, Yarn Workspaces
- **Styling**: CSS Variables, JupyterLab Theme System
- **AI Integration**: OpenAI SDK, Streaming APIs

---

## 🛠️ Development

### Building from Source

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Watch mode for development
yarn watch

# Clean build artifacts
yarn clean
```

### Running Tests

```bash
# Run unit tests
yarn test

# Run integration tests
yarn test:integration

# Run with coverage
yarn test:coverage
```

### Development Workflow

1. **Make your changes** in `packages/ai-assistant/src/`
2. **Build the package**: `yarn build`
3. **Rebuild dev_mode**: `cd dev_mode && yarn build`
4. **Restart JupyterLab** or refresh your browser
5. **Test your changes** in the AI Assistant panel

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check code style
yarn lint

# Fix code style issues
yarn lint:fix

# Format code
yarn format
```

---

## 📚 Documentation

### User Guide

- [Getting Started](docs/getting-started.md)
- [Configuration Guide](docs/configuration.md)
- [Keyboard Shortcuts](docs/shortcuts.md)
- [Troubleshooting](docs/troubleshooting.md)

### Developer Guide

- [Architecture Overview](docs/architecture.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [API Reference](docs/api.md)
- [Extension Development](docs/extension-dev.md)

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and commit: `git commit -m 'Add amazing feature'`
4. **Push to your fork**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/tqrar.git
cd tqrar

# Add upstream remote
git remote add upstream https://github.com/marsalanjaved1/tqrar.git

# Create a branch
git checkout -b feature/my-feature

# Make changes and test
yarn build
jupyter lab --dev-mode

# Commit and push
git add .
git commit -m "Description of changes"
git push origin feature/my-feature
```

---

## 🗺️ Roadmap

### Version 1.0 (Current)
- ✅ Basic chat interface
- ✅ Streaming responses
- ✅ Settings management
- ✅ Theme integration

### Version 1.1 (Planned)
- 🔄 Notebook context awareness
- 🔄 Code execution capabilities
- 🔄 Variable inspection
- 🔄 Cell output analysis

### Version 2.0 (Future)
- 📋 Tool calling / Function execution
- 📊 Data visualization generation
- 🔍 Semantic code search
- 🤖 Multi-agent workflows
- 🌐 Collaborative features

---

## 🙏 Acknowledgments

Tqrar is built on the shoulders of giants:

- **[JupyterLab](https://jupyterlab.readthedocs.io)** - The foundation of modern data science
- **[React](https://reactjs.org)** - For the beautiful UI
- **[TypeScript](https://www.typescriptlang.org)** - For type safety and developer experience
- **[OpenAI](https://openai.com)** - For pioneering conversational AI
- **[Assistant UI](https://github.com/Yonom/assistant-ui)** - For chat UI inspiration

Special thanks to the Jupyter community for creating an amazing ecosystem.

---

## 📄 License

This project is licensed under the **BSD 3-Clause License** - see the [LICENSE](LICENSE) file for details.

This license is compatible with JupyterLab and allows for both commercial and non-commercial use.

---

## 🌟 Support

If you find Tqrar helpful, please consider:

- ⭐ **Starring the repository** on GitHub
- 🐦 **Sharing on social media** with #Tqrar
- 💬 **Joining our community** discussions
- 🐛 **Reporting bugs** to help us improve
- 📝 **Contributing** to the project

---

## 📞 Contact

- **Website**: [tqrar.dev](https://tqrar.dev)
- **GitHub**: [@marsalanjaved1](https://github.com/marsalanjaved1)
- **Issues**: [GitHub Issues](https://github.com/marsalanjaved1/tqrar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/marsalanjaved1/tqrar/discussions)

---

<div align="center">

**Made with ❤️ for the Data Science Community**

*Iterate. Refine. Perfect. — تِقرار*

</div>
