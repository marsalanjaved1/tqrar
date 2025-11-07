# Contributing to Tqrar

First off, thank you for considering contributing to Tqrar! It's people like you that make Tqrar such a great tool for the data science community.

## 🌟 Ways to Contribute

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed** and what you expected
- **Include your environment details**:
  - JupyterLab version
  - Node.js version
  - Operating system
  - Browser (if relevant)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most Tqrar users
- **List any similar features** in other tools if applicable

### 📝 Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the existing style
5. Write a clear commit message
6. Open a Pull Request!

## 🚀 Development Process

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/tqrar.git
cd tqrar

# Add upstream remote
git remote add upstream https://github.com/marsalanjaved1/tqrar.git

# Install dependencies
yarn install

# Build the project
yarn build
```

### Making Changes

```bash
# Create a new branch
git checkout -b feature/my-awesome-feature

# Make your changes
# ... edit files ...

# Build and test
yarn build
cd dev_mode && yarn build

# Test in JupyterLab
jupyter lab --dev-mode
```

### Code Style

- We use **TypeScript** for type safety
- Follow the existing code style
- Use **ESLint** and **Prettier** for formatting
- Write clear, descriptive variable and function names
- Add comments for complex logic

```bash
# Check code style
yarn lint

# Auto-fix style issues
yarn lint:fix
```

### Commit Messages

Write clear, concise commit messages:

```
feat: add support for local LLM models
fix: resolve status bar layout issue
docs: update installation instructions
style: format code with prettier
refactor: simplify chat component logic
test: add unit tests for settings dialog
```

### Testing

```bash
# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run with coverage
yarn test:coverage
```

## 📋 Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass** before submitting
4. **Update the README.md** if needed
5. **Link any related issues** in your PR description
6. **Request review** from maintainers

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Dependent changes merged

## 🏗️ Project Structure

```
tqrar/
├── packages/
│   └── ai-assistant/
│       ├── src/              # Source code
│       ├── style/            # CSS styles
│       ├── schema/           # Settings schema
│       └── package.json
├── dev_mode/                 # Development environment
├── docs/                     # Documentation
└── tests/                    # Test files
```

## 🎯 Areas for Contribution

### High Priority
- 🔧 Notebook context integration
- 🤖 Tool calling / function execution
- 📊 Data visualization generation
- 🧪 Test coverage improvements

### Medium Priority
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🌐 Internationalization (i18n)
- ♿ Accessibility improvements

### Good First Issues
Look for issues labeled `good first issue` - these are great for newcomers!

## 💬 Community

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Report bugs, request features
- **Pull Requests**: Contribute code

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment, trolling, or discriminatory comments
- Personal or political attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## 📄 License

By contributing to Tqrar, you agree that your contributions will be licensed under the BSD 3-Clause License.

## ❓ Questions?

Don't hesitate to ask! Open an issue or start a discussion if you need help.

---

**Thank you for contributing to Tqrar! 🎉**

*Together, we're making data science more accessible and efficient for everyone.*
