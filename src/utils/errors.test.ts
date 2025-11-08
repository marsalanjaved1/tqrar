/**
 * Test file to demonstrate error handling functionality
 * This is not a full test suite, but examples showing how the error handlers work
 */

import { ErrorHandler } from './errors';

// Example 1: Handling API errors
async function testApiErrorHandling() {
  console.log('=== Testing API Error Handling ===\n');

  // Test 401 error
  const error401 = { status: 401, message: 'Unauthorized' };
  const message401 = await ErrorHandler.handleApiError(error401);
  console.log('401 Error:\n', message401, '\n');

  // Test 429 error
  const error429 = { status: 429, message: 'Too many requests' };
  const message429 = await ErrorHandler.handleApiError(error429);
  console.log('429 Error:\n', message429, '\n');

  // Test network error
  const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
  const networkMessage = await ErrorHandler.handleApiError(networkError);
  console.log('Network Error:\n', networkMessage, '\n');
}

// Example 2: Handling Python errors
function testPythonErrorHandling() {
  console.log('=== Testing Python Error Handling ===\n');

  // Test NameError
  const nameError = {
    ename: 'NameError',
    evalue: "name 'undefined_var' is not defined",
    traceback: [
      'Traceback (most recent call last):',
      '  File "<ipython-input-1-abc123>", line 5, in <module>',
      '    result = undefined_var + 10',
      "NameError: name 'undefined_var' is not defined"
    ]
  };
  const nameErrorMessage = ErrorHandler.handleKernelError(nameError);
  console.log('NameError:\n', nameErrorMessage, '\n');

  // Test ImportError
  const importError = {
    ename: 'ModuleNotFoundError',
    evalue: "No module named 'nonexistent_module'",
    traceback: [
      'Traceback (most recent call last):',
      '  File "<ipython-input-2-def456>", line 1, in <module>',
      '    import nonexistent_module',
      "ModuleNotFoundError: No module named 'nonexistent_module'"
    ]
  };
  const importErrorMessage = ErrorHandler.handleKernelError(importError);
  console.log('ImportError:\n', importErrorMessage, '\n');

  // Test TypeError
  const typeError = {
    ename: 'TypeError',
    evalue: "unsupported operand type(s) for +: 'int' and 'str'",
    traceback: [
      'Traceback (most recent call last):',
      '  File "<ipython-input-3-ghi789>", line 2, in calculate',
      '    result = 5 + "10"',
      "TypeError: unsupported operand type(s) for +: 'int' and 'str'"
    ]
  };
  const typeErrorMessage = ErrorHandler.handleKernelError(typeError);
  console.log('TypeError:\n', typeErrorMessage, '\n');
}

// Example 3: Kernel status suggestions
function testKernelStatusSuggestions() {
  console.log('=== Testing Kernel Status Suggestions ===\n');

  const deadKernel = ErrorHandler.suggestKernelFix('dead');
  console.log('Dead Kernel:\n', deadKernel, '\n');

  const busyKernel = ErrorHandler.suggestKernelFix('busy');
  console.log('Busy Kernel:\n', busyKernel, '\n');

  const startingKernel = ErrorHandler.suggestKernelFix('starting');
  console.log('Starting Kernel:\n', startingKernel, '\n');
}

// Example 4: Retry logic
async function testRetryLogic() {
  console.log('=== Testing Retry Logic ===\n');

  let attemptCount = 0;
  const flakeyFunction = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw { status: 503, message: 'Service temporarily unavailable' };
    }
    return 'Success!';
  };

  try {
    const result = await ErrorHandler.withRetry(flakeyFunction, 3);
    console.log('Retry succeeded after', attemptCount, 'attempts:', result, '\n');
  } catch (error) {
    console.log('Retry failed:', error, '\n');
  }
}

// Example 5: Error sanitization
function testErrorSanitization() {
  console.log('=== Testing Error Sanitization ===\n');

  const sensitiveMessage = 'Error: API key sk-1234567890abcdef1234567890abcdef failed';
  const sanitized = ErrorHandler.sanitizeErrorMessage(sensitiveMessage);
  console.log('Original:', sensitiveMessage);
  console.log('Sanitized:', sanitized, '\n');

  const pathMessage = 'File not found: /home/username/secret/data.csv';
  const sanitizedPath = ErrorHandler.sanitizeErrorMessage(pathMessage);
  console.log('Original:', pathMessage);
  console.log('Sanitized:', sanitizedPath, '\n');
}

// Run all examples
async function runAllExamples() {
  await testApiErrorHandling();
  testPythonErrorHandling();
  testKernelStatusSuggestions();
  await testRetryLogic();
  testErrorSanitization();
}

// Export for use in other modules
export { runAllExamples };

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
