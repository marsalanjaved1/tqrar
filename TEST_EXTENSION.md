# Testing TQRAR Extension

## What to Check

1. **Extension Loaded**: Look in the left sidebar for an AI Assistant icon
2. **Settings**: Go to Settings → Advanced Settings Editor → AI Assistant
3. **Console**: Open browser console (F12) and check for any errors related to 'tqrar'

## Expected Behavior

- The extension should appear in the left sidebar
- Clicking it should open the AI Assistant chat interface
- You'll need to configure an API key in settings before it works

## Configuration

To configure the extension:
1. Settings → Advanced Settings Editor
2. Find "AI Assistant" 
3. Add your OpenAI API key and provider settings

## Current Status

✅ Extension built successfully
✅ JupyterLab running at http://localhost:8888
⚠️  Node.js version warning (has v18, needs v20+) - but extension still works
