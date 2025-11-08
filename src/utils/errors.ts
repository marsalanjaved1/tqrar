/**
 * Error handling utilities for the AI Assistant
 */

import { IToolResult } from '../types';

/**
 * Timeout error class for long-running operations
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Tool execution error class
 */
export class ToolExecutionError extends Error {
  constructor(message: string, public readonly toolName: string) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error handler utility class for managing errors in the AI Assistant
 */
export class ErrorHandler {
  /**
   * Handle tool execution errors and return a structured result
   * 
   * @param error - The error that occurred
   * @param toolName - The name of the tool that failed
   * @returns A structured tool result with error information
   */
  static handleToolError(error: Error, toolName: string): IToolResult {
    console.error(`Tool error in ${toolName}:`, error);

    // Log stack trace for debugging
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return {
      success: false,
      error: {
        message: error.message || 'Unknown error occurred',
        type: error.name || 'Error'
      }
    };
  }

  /**
   * Handle API errors from LLM services with detailed explanations
   * 
   * @param error - The API error
   * @returns A user-friendly error message with suggestions
   */
  static async handleApiError(error: any): Promise<string> {
    console.error('API error:', error);

    // Handle HTTP status codes
    if (error.status) {
      switch (error.status) {
        case 401:
          return 'Authentication Error (401)\n\n' +
            'Your API key is invalid or has expired.\n\n' +
            'Suggestions:\n' +
            '• Open the settings dialog (gear icon) and verify your API key\n' +
            '• Make sure you copied the entire API key without extra spaces\n' +
            '• Check if your API key has expired and generate a new one\n' +
            '• Verify you selected the correct provider (OpenRouter, OpenAI, Anthropic)\n' +
            '• For OpenRouter, get your key at: https://openrouter.ai/keys';
            
        case 402:
          return 'Payment Required (402)\n\n' +
            'Your account has insufficient credits or your payment method failed.\n\n' +
            'Suggestions:\n' +
            '• Add credits to your account\n' +
            '• Check your payment method is valid\n' +
            '• Verify your billing information is up to date\n' +
            '• Contact your provider\'s support if the issue persists';
            
        case 403:
          return 'Access Forbidden (403)\n\n' +
            'Your API key doesn\'t have permission to access this resource.\n\n' +
            'Suggestions:\n' +
            '• Check if your API key has the required permissions\n' +
            '• Verify you\'re using the correct model for your plan\n' +
            '• Some models require special access - check with your provider\n' +
            '• Try using a different model that\'s available on your plan';
            
        case 404:
          return 'Not Found (404)\n\n' +
            'The API endpoint or model was not found.\n\n' +
            'Suggestions:\n' +
            '• Check that the model name is correct in settings\n' +
            '• Verify the provider URL is correct (for local models)\n' +
            '• The model might have been deprecated - try a different model\n' +
            '• For OpenRouter, check available models at: https://openrouter.ai/models';
            
        case 429:
          return 'Rate Limit Exceeded (429)\n\n' +
            'You\'ve made too many requests in a short time period.\n\n' +
            'Suggestions:\n' +
            '• Wait a few minutes before trying again\n' +
            '• Reduce the frequency of your requests\n' +
            '• Upgrade to a higher tier plan for increased rate limits\n' +
            '• Check if you have multiple applications using the same API key';
            
        case 500:
          return 'Internal Server Error (500)\n\n' +
            'The LLM service encountered an internal error.\n\n' +
            'Suggestions:\n' +
            '• This is a temporary issue with the service\n' +
            '• Wait a few minutes and try again\n' +
            '• Check the provider\'s status page for known issues\n' +
            '• Try a different model if the problem persists';
            
        case 502:
        case 503:
        case 504:
          return `Service Unavailable (${error.status})\n\n` +
            'The LLM service is temporarily unavailable or overloaded.\n\n' +
            'Suggestions:\n' +
            '• Wait a few minutes and try again\n' +
            '• The service may be experiencing high traffic\n' +
            '• Check the provider\'s status page\n' +
            '• Try using a different provider or model';
            
        default:
          if (error.status >= 400 && error.status < 500) {
            return `Client Error (${error.status})\n\n` +
              `${error.message || 'There was a problem with your request.'}\n\n` +
              'Suggestions:\n' +
              '• Check your request parameters\n' +
              '• Verify your API key and settings\n' +
              '• Review the error message for specific details';
          }
          if (error.status >= 500) {
            return `Server Error (${error.status})\n\n` +
              'The LLM service is experiencing technical difficulties.\n\n' +
              'Suggestions:\n' +
              '• Wait a few minutes and try again\n' +
              '• Check the provider\'s status page\n' +
              '• Try a different provider if available';
          }
      }
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED') {
      return 'Connection Refused\n\n' +
        'Unable to connect to the LLM service.\n\n' +
        'Suggestions:\n' +
        '• Check your internet connection\n' +
        '• Verify the API endpoint URL is correct (for local models)\n' +
        '• Check if a firewall is blocking the connection\n' +
        '• For local models, ensure the server is running';
    }

    if (error.code === 'ENOTFOUND') {
      return 'Host Not Found\n\n' +
        'The LLM service hostname could not be resolved.\n\n' +
        'Suggestions:\n' +
        '• Check your internet connection\n' +
        '• Verify the API endpoint URL is correct\n' +
        '• Check your DNS settings\n' +
        '• Try accessing the provider\'s website in a browser';
    }

    if (error.code === 'ETIMEDOUT') {
      return 'Request Timeout\n\n' +
        'The LLM service took too long to respond.\n\n' +
        'Suggestions:\n' +
        '• Check your internet connection speed\n' +
        '• The service may be experiencing high load - try again later\n' +
        '• Try reducing the max_tokens setting\n' +
        '• Consider using a faster model';
    }

    if (error.code === 'ECONNRESET') {
      return 'Connection Reset\n\n' +
        'The connection to the LLM service was interrupted.\n\n' +
        'Suggestions:\n' +
        '• Check your internet connection stability\n' +
        '• Try again - this is often a temporary issue\n' +
        '• Check if your network has connection limits or timeouts';
    }

    // Handle OpenAI SDK specific errors
    if (error.type === 'invalid_request_error') {
      return 'Invalid Request\n\n' +
        `${error.message || 'The request parameters are invalid.'}\n\n` +
        'Suggestions:\n' +
        '• Check that your request is properly formatted\n' +
        '• Verify all required parameters are provided\n' +
        '• Review the model\'s documentation for parameter limits\n' +
        '• Try reducing the length of your message or context';
    }

    if (error.type === 'tokens') {
      return 'Token Limit Exceeded\n\n' +
        'Your request exceeds the model\'s token limit.\n\n' +
        'Suggestions:\n' +
        '• Reduce the length of your message\n' +
        '• Clear the conversation history to reduce context\n' +
        '• Use a model with a larger context window\n' +
        '• Break your request into smaller parts';
    }

    // Handle context length errors
    if (error.message && error.message.toLowerCase().includes('context length')) {
      return 'Context Length Exceeded\n\n' +
        'Your conversation has exceeded the model\'s maximum context length.\n\n' +
        'Suggestions:\n' +
        '• Clear the conversation history to start fresh\n' +
        '• Reduce the amount of code or data in your messages\n' +
        '• Use a model with a larger context window\n' +
        '• Summarize previous context instead of including everything';
    }

    // Generic error message with suggestions
    const errorMsg = error.message || 'An unexpected error occurred';
    return 'LLM Service Error\n\n' +
      `${errorMsg}\n\n` +
      'Suggestions:\n' +
      '• Try again in a few moments\n' +
      '• Check your API key and settings\n' +
      '• Verify your internet connection\n' +
      '• Try using a different model or provider\n' +
      '• Check the provider\'s status page for known issues';
  }

  /**
   * Handle kernel execution errors with detailed analysis
   * 
   * @param error - The kernel error object
   * @returns A formatted error message with explanation and suggestions
   */
  static handleKernelError(error: any): string {
    console.error('Kernel error:', error);

    // Parse Python traceback if available
    if (error.traceback && Array.isArray(error.traceback)) {
      const analysis = ErrorHandler.parsePythonTraceback(error.traceback, error.ename, error.evalue);
      return analysis;
    }

    // Format error name and value
    if (error.ename && error.evalue) {
      const explanation = ErrorHandler.explainPythonError(error.ename, error.evalue);
      return `Kernel error: ${error.ename}: ${error.evalue}\n\n${explanation}`;
    }

    // Generic kernel error
    return `Kernel error: ${error.message || 'An error occurred during code execution'}`;
  }

  /**
   * Parse Python traceback to identify root cause and provide explanation
   * 
   * @param traceback - Array of traceback lines
   * @param errorName - The error type name (e.g., 'NameError', 'TypeError')
   * @param errorValue - The error message
   * @returns A formatted error message with explanation and suggestions
   */
  static parsePythonTraceback(
    traceback: string[],
    errorName?: string,
    errorValue?: string
  ): string {
    // Join traceback lines
    const fullTraceback = traceback.join('\n');
    
    // Extract the last frame (where the error occurred)
    const lastFrameMatch = fullTraceback.match(/File "([^"]+)", line (\d+)(?:, in (.+))?\n\s+(.+)/);
    
    let rootCause = '';
    if (lastFrameMatch) {
      const [, filename, lineNumber, functionName, codeLine] = lastFrameMatch;
      rootCause = `The error occurred in ${filename} at line ${lineNumber}`;
      if (functionName) {
        rootCause += ` in function '${functionName}'`;
      }
      rootCause += `:\n  ${codeLine.trim()}`;
    }

    // Build the error message
    let message = 'Kernel Execution Error\n';
    message += '─'.repeat(50) + '\n\n';
    
    if (errorName && errorValue) {
      message += `Error Type: ${errorName}\n`;
      message += `Error Message: ${errorValue}\n\n`;
    }
    
    if (rootCause) {
      message += `Root Cause:\n${rootCause}\n\n`;
    }
    
    // Add explanation and suggestions
    if (errorName) {
      const explanation = ErrorHandler.explainPythonError(errorName, errorValue || '');
      message += `Explanation:\n${explanation}\n\n`;
    }
    
    // Add full traceback for reference
    message += `Full Traceback:\n${fullTraceback}`;
    
    return message;
  }

  /**
   * Provide plain language explanation for Python errors
   * 
   * @param errorName - The error type name
   * @param errorValue - The error message
   * @returns A plain language explanation with suggestions
   */
  static explainPythonError(errorName: string, errorValue: string): string {
    const lowerErrorName = errorName.toLowerCase();
    const lowerErrorValue = errorValue.toLowerCase();

    // NameError
    if (lowerErrorName.includes('nameerror')) {
      const varMatch = errorValue.match(/name '([^']+)' is not defined/);
      const varName = varMatch ? varMatch[1] : 'variable';
      return `The variable or function '${varName}' hasn't been defined yet.\n\n` +
        `Suggestions:\n` +
        `• Check if you've spelled the name correctly\n` +
        `• Make sure you've run the cell that defines '${varName}'\n` +
        `• Verify the variable is in scope (not defined inside a function or class)\n` +
        `• If it's from a library, make sure you've imported it`;
    }

    // ImportError / ModuleNotFoundError
    if (lowerErrorName.includes('importerror') || lowerErrorName.includes('modulenotfounderror')) {
      const moduleMatch = errorValue.match(/No module named '([^']+)'/);
      const moduleName = moduleMatch ? moduleMatch[1] : 'module';
      return `The Python module '${moduleName}' is not installed or cannot be found.\n\n` +
        `Suggestions:\n` +
        `• Install the module using: !pip install ${moduleName}\n` +
        `• Check if the module name is spelled correctly\n` +
        `• Verify the module is compatible with your Python version\n` +
        `• Restart the kernel after installing new packages`;
    }

    // TypeError
    if (lowerErrorName.includes('typeerror')) {
      if (lowerErrorValue.includes('unsupported operand type')) {
        return `You're trying to perform an operation on incompatible data types.\n\n` +
          `Suggestions:\n` +
          `• Check the types of your variables using type(variable)\n` +
          `• Convert variables to the correct type (e.g., int(), str(), float())\n` +
          `• Verify you're using the right operator for your data types`;
      }
      if (lowerErrorValue.includes('missing') && lowerErrorValue.includes('required positional argument')) {
        return `A function is missing one or more required arguments.\n\n` +
          `Suggestions:\n` +
          `• Check the function signature to see what arguments are required\n` +
          `• Make sure you're passing all required arguments\n` +
          `• Check the order of arguments`;
      }
      return `There's a type mismatch in your code.\n\n` +
        `Suggestions:\n` +
        `• Check that you're using the correct data types\n` +
        `• Verify function arguments match expected types\n` +
        `• Use type() to inspect variable types`;
    }

    // AttributeError
    if (lowerErrorName.includes('attributeerror')) {
      const attrMatch = errorValue.match(/has no attribute '([^']+)'/);
      const attrName = attrMatch ? attrMatch[1] : 'attribute';
      return `The object doesn't have the attribute or method '${attrName}'.\n\n` +
        `Suggestions:\n` +
        `• Check if you've spelled the attribute name correctly\n` +
        `• Use dir(object) to see available attributes and methods\n` +
        `• Verify the object is of the expected type\n` +
        `• Check if the attribute exists in your version of the library`;
    }

    // KeyError
    if (lowerErrorName.includes('keyerror')) {
      return `You're trying to access a dictionary key that doesn't exist.\n\n` +
        `Suggestions:\n` +
        `• Check if the key exists using 'key in dictionary'\n` +
        `• Use dictionary.get(key, default_value) for safe access\n` +
        `• Print dictionary.keys() to see available keys\n` +
        `• Check for typos in the key name`;
    }

    // IndexError
    if (lowerErrorName.includes('indexerror')) {
      return `You're trying to access an index that's out of range.\n\n` +
        `Suggestions:\n` +
        `• Check the length of your list/array using len()\n` +
        `• Remember that indexing starts at 0\n` +
        `• Verify your loop conditions\n` +
        `• Use negative indexing carefully (-1 is the last element)`;
    }

    // ValueError
    if (lowerErrorName.includes('valueerror')) {
      if (lowerErrorValue.includes('could not convert')) {
        return `A value cannot be converted to the requested type.\n\n` +
          `Suggestions:\n` +
          `• Check that the value is in the correct format\n` +
          `• Handle conversion errors with try/except\n` +
          `• Validate input data before conversion\n` +
          `• Use appropriate conversion functions`;
      }
      return `A function received an argument with an inappropriate value.\n\n` +
        `Suggestions:\n` +
        `• Check that values are within expected ranges\n` +
        `• Verify input data format\n` +
        `• Read the function documentation for valid values`;
    }

    // ZeroDivisionError
    if (lowerErrorName.includes('zerodivisionerror')) {
      return `You're trying to divide by zero.\n\n` +
        `Suggestions:\n` +
        `• Check if the denominator is zero before dividing\n` +
        `• Add a condition to handle zero values\n` +
        `• Verify your calculations are correct`;
    }

    // FileNotFoundError
    if (lowerErrorName.includes('filenotfounderror')) {
      return `The specified file or directory doesn't exist.\n\n` +
        `Suggestions:\n` +
        `• Check if the file path is correct\n` +
        `• Use absolute paths or verify relative paths\n` +
        `• Check if the file exists using os.path.exists()\n` +
        `• Verify file permissions`;
    }

    // SyntaxError
    if (lowerErrorName.includes('syntaxerror')) {
      return `There's a syntax error in your Python code.\n\n` +
        `Suggestions:\n` +
        `• Check for missing or extra parentheses, brackets, or quotes\n` +
        `• Verify proper indentation\n` +
        `• Look for typos in keywords\n` +
        `• Check if you're using Python 3 syntax`;
    }

    // IndentationError
    if (lowerErrorName.includes('indentationerror')) {
      return `Your code has incorrect indentation.\n\n` +
        `Suggestions:\n` +
        `• Use consistent indentation (4 spaces is standard)\n` +
        `• Don't mix tabs and spaces\n` +
        `• Check that code blocks are properly indented\n` +
        `• Verify that all lines in a block have the same indentation`;
    }

    // MemoryError
    if (lowerErrorName.includes('memoryerror')) {
      return `Your code is trying to use more memory than available.\n\n` +
        `Suggestions:\n` +
        `• Process data in smaller chunks\n` +
        `• Use generators instead of lists for large datasets\n` +
        `• Delete unused variables with del\n` +
        `• Consider using more memory-efficient data structures`;
    }

    // RecursionError
    if (lowerErrorName.includes('recursionerror')) {
      return `Your recursive function has exceeded the maximum recursion depth.\n\n` +
        `Suggestions:\n` +
        `• Check that your recursive function has a proper base case\n` +
        `• Verify the recursion will eventually terminate\n` +
        `• Consider using iteration instead of recursion\n` +
        `• Increase recursion limit with sys.setrecursionlimit() (use carefully)`;
    }

    // Generic explanation
    return `A ${errorName} occurred during code execution.\n\n` +
      `Suggestions:\n` +
      `• Review the error message and traceback carefully\n` +
      `• Check the documentation for the functions you're using\n` +
      `• Try breaking down complex operations into smaller steps\n` +
      `• Use print statements or a debugger to inspect values`;
  }

  /**
   * Execute a function with a timeout
   * 
   * @param fn - The async function to execute
   * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10 seconds)
   * @param timeoutMessage - Custom timeout message
   * @returns A promise that resolves to the function result or rejects with TimeoutError
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 10000,
    timeoutMessage?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Create timeout
      const timeoutId = setTimeout(() => {
        reject(
          new TimeoutError(
            timeoutMessage || `Operation timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      // Execute function
      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute a tool with timeout and error handling
   * 
   * @param toolName - The name of the tool
   * @param executeFn - The tool execution function
   * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
   * @returns A promise that resolves to the tool result
   */
  static async executeWithTimeout(
    toolName: string,
    executeFn: () => Promise<IToolResult>,
    timeoutMs: number = 10000
  ): Promise<IToolResult> {
    try {
      const result = await ErrorHandler.withTimeout(
        executeFn,
        timeoutMs,
        `Tool execution timed out after ${timeoutMs}ms`
      );
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error(`Tool ${toolName} timed out after ${timeoutMs}ms`);
        return {
          success: false,
          error: {
            message: `Tool execution timed out after ${timeoutMs / 1000} seconds. The operation took too long to complete.`,
            type: 'TimeoutError'
          }
        };
      }

      // Handle other errors
      return ErrorHandler.handleToolError(
        error instanceof Error ? error : new Error(String(error)),
        toolName
      );
    }
  }

  /**
   * Retry a function with exponential backoff
   * 
   * @param fn - The async function to retry
   * @param maxRetries - Maximum number of retries (default: 3)
   * @param initialDelayMs - Initial delay in milliseconds (default: 1000ms)
   * @returns A promise that resolves to the function result
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!ErrorHandler.isRetryableError(error)) {
          console.warn('Error is not retryable, failing immediately:', error);
          throw error;
        }

        // Calculate delay based on error type
        const delayMs = ErrorHandler.getRetryDelay(error, attempt);
        console.warn(
          `Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delayMs}ms...`,
          error
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // All retries failed
    const errorMessage = lastError instanceof Error 
      ? lastError.message 
      : String(lastError);
    throw new Error(
      `Operation failed after ${maxRetries + 1} attempts. Last error: ${errorMessage}`
    );
  }

  /**
   * Provide suggestions when kernel is unavailable
   * 
   * @param kernelStatus - The current kernel status (if available)
   * @returns A message with suggestions for fixing kernel issues
   */
  static suggestKernelFix(kernelStatus?: string): string {
    if (!kernelStatus || kernelStatus === 'dead' || kernelStatus === 'unknown') {
      return 'Kernel Not Available\n\n' +
        'The notebook kernel is not running or has died.\n\n' +
        'Suggestions:\n' +
        '• Click "Select Kernel" in the notebook toolbar to start a kernel\n' +
        '• If a kernel was running, try restarting it (Kernel → Restart Kernel)\n' +
        '• Check if the kernel crashed due to a previous error\n' +
        '• Try selecting a different kernel if available\n' +
        '• Restart JupyterLab if the problem persists';
    }

    if (kernelStatus === 'starting' || kernelStatus === 'restarting') {
      return 'Kernel Starting\n\n' +
        'The kernel is currently starting up.\n\n' +
        'Suggestions:\n' +
        '• Wait a few seconds for the kernel to finish starting\n' +
        '• Check the kernel indicator in the notebook toolbar\n' +
        '• If it takes too long, try restarting the kernel\n' +
        '• Check the browser console for any error messages';
    }

    if (kernelStatus === 'busy') {
      return 'Kernel Busy\n\n' +
        'The kernel is currently executing code.\n\n' +
        'Suggestions:\n' +
        '• Wait for the current execution to complete\n' +
        '• If code is stuck, interrupt the kernel (Kernel → Interrupt Kernel)\n' +
        '• Check if there\'s an infinite loop or long-running operation\n' +
        '• Consider restarting the kernel if it\'s unresponsive';
    }

    return 'Kernel Issue\n\n' +
      `The kernel is in an unexpected state: ${kernelStatus}\n\n` +
      'Suggestions:\n' +
      '• Try restarting the kernel (Kernel → Restart Kernel)\n' +
      '• Check the kernel indicator in the notebook toolbar\n' +
      '• Review recent error messages in the notebook\n' +
      '• Restart JupyterLab if the problem persists';
  }

  /**
   * Provide a comprehensive error report with context
   * 
   * @param error - The error that occurred
   * @param context - Additional context about where the error occurred
   * @returns A formatted error report
   */
  static createErrorReport(error: Error | unknown, context: string): string {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    let report = 'Error Report\n';
    report += '═'.repeat(50) + '\n\n';
    report += `Context: ${context}\n`;
    report += `Error Type: ${errorObj.name}\n`;
    report += `Error Message: ${errorObj.message}\n\n`;
    
    if (errorObj.stack) {
      report += 'Stack Trace:\n';
      report += errorObj.stack + '\n\n';
    }
    
    report += 'What to do:\n';
    report += '• Review the error message and context\n';
    report += '• Check the browser console for additional details\n';
    report += '• Try the operation again\n';
    report += '• If the problem persists, restart JupyterLab\n';
    
    return report;
  }

  /**
   * Check if an error is retryable
   * 
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  static isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limit errors are retryable (after delay)
    if (error.status === 429) {
      return true;
    }

    // Timeout errors are retryable
    if (error instanceof TimeoutError) {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay based on error type and attempt number
   * 
   * @param error - The error that occurred
   * @param attempt - The current attempt number (0-based)
   * @returns Delay in milliseconds before retrying
   */
  static getRetryDelay(error: any, attempt: number): number {
    // For rate limit errors, use longer delays
    if (error.status === 429) {
      // Check if Retry-After header is present
      if (error.headers && error.headers['retry-after']) {
        const retryAfter = parseInt(error.headers['retry-after'], 10);
        if (!isNaN(retryAfter)) {
          return retryAfter * 1000; // Convert to milliseconds
        }
      }
      // Default to longer exponential backoff for rate limits
      return Math.min(1000 * Math.pow(3, attempt), 60000); // Max 60 seconds
    }

    // Standard exponential backoff for other errors
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  /**
   * Sanitize error messages to remove sensitive information
   * 
   * @param message - The error message to sanitize
   * @returns The sanitized error message
   */
  static sanitizeErrorMessage(message: string): string {
    // Remove potential API keys (patterns like sk-..., Bearer ...)
    let sanitized = message.replace(/sk-[a-zA-Z0-9]{32,}/g, '[API_KEY]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [TOKEN]');
    
    // Remove potential file paths that might contain usernames
    sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[USER]');
    sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[USER]');
    sanitized = sanitized.replace(/C:\\Users\\[^\\s]+/g, 'C:\\Users\\[USER]');

    return sanitized;
  }

  /**
   * Log an error with sanitization
   * 
   * @param context - The context where the error occurred
   * @param error - The error to log
   */
  static logError(context: string, error: Error | unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedMessage = ErrorHandler.sanitizeErrorMessage(errorMessage);
    
    console.error(`[${context}] Error:`, sanitizedMessage);
    
    if (error instanceof Error && error.stack) {
      const sanitizedStack = ErrorHandler.sanitizeErrorMessage(error.stack);
      console.error('Stack trace:', sanitizedStack);
    }
  }
}

