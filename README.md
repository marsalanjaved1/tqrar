# TQRAR - AI Assistant for JupyterLab

AI-powered assistant extension for JupyterLab

## Installation

### From Source

```bash
cd tqrar
jlpm install
jlpm build
jupyter labextension develop . --overwrite
jupyter lab build
```

### For Development

```bash
jlpm install
jlpm build
jupyter labextension develop . --overwrite
jlpm watch
```

## Configuration

Configure through JupyterLab Settings:
1. Settings → Advanced Settings Editor
2. Select "AI Assistant"
3. Add your API key and provider

## Usage

1. Open JupyterLab
2. Click AI Assistant icon in left sidebar
3. Start chatting

## Requirements

- JupyterLab >= 4.0.0
- Node.js >= 18.0.0

## License

BSD-3-Clause
