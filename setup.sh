#!/bin/bash

echo "========================================="
echo "TQRAR JupyterLab Extension Setup"
echo "========================================="
echo ""

# Check if jlpm is installed
if ! command -v jlpm &> /dev/null; then
    echo "Error: jlpm is not installed. Please install JupyterLab first."
    echo "Run: pip install jupyterlab"
    exit 1
fi

# Check if jupyter is installed
if ! command -v jupyter &> /dev/null; then
    echo "Error: jupyter is not installed. Please install JupyterLab first."
    echo "Run: pip install jupyterlab"
    exit 1
fi

echo "Step 1: Installing dependencies..."
jlpm install

echo ""
echo "Step 2: Building extension..."
jlpm build

echo ""
echo "Step 3: Installing extension in JupyterLab..."
jupyter labextension develop . --overwrite

echo ""
echo "Step 4: Building JupyterLab..."
jupyter lab build

echo ""
echo "========================================="
echo "Installation complete!"
echo "========================================="
echo ""
echo "To start JupyterLab, run:"
echo "  jupyter lab"
echo ""
echo "For development with auto-rebuild:"
echo "  Terminal 1: jlpm watch"
echo "  Terminal 2: jupyter lab"
echo ""
