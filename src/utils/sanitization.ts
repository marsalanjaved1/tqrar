/**
 * Sanitization utilities for tool execution data
 * 
 * Provides functions to sanitize and escape user-generated content
 * to prevent XSS attacks and protect sensitive information.
 */

/**
 * Maximum size for result data (1MB)
 */
const MAX_RESULT_SIZE = 1024 * 1024;

/**
 * Maximum length for displayed strings (10KB)
 */
const MAX_STRING_LENGTH = 10 * 1024;

/**
 * Patterns for sensitive data that should be redacted
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /\b[A-Za-z0-9_-]{32,}\b/g, // Generic long alphanumeric strings (likely keys)
  /sk-[A-Za-z0-9]{32,}/g, // OpenAI-style keys
  /Bearer\s+[A-Za-z0-9_-]+/gi, // Bearer tokens
  /api[_-]?key[:\s=]+[A-Za-z0-9_-]+/gi, // API key patterns
  /token[:\s=]+[A-Za-z0-9_-]+/gi, // Token patterns
  /password[:\s=]+\S+/gi, // Password patterns
  /secret[:\s=]+\S+/gi, // Secret patterns
  
  // AWS credentials
  /AKIA[0-9A-Z]{16}/g, // AWS access key IDs
  /aws_secret_access_key[:\s=]+\S+/gi,
  
  // Private keys
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
];

/**
 * Patterns for file paths that might contain sensitive information
 */
const SENSITIVE_PATH_PATTERNS = [
  // Home directories
  /\/home\/[^\/\s]+/g,
  /\/Users\/[^\/\s]+/g,
  /C:\\Users\\[^\\\/\s]+/g,
  
  // Common sensitive directories
  /\/\.ssh\//g,
  /\/\.aws\//g,
  /\/\.config\//g,
  /\/\.env/g,
];

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for HTML display
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'\/]/g, char => htmlEscapeMap[char]);
}

/**
 * Sanitize parameter values for display
 * - Escapes HTML
 * - Truncates long values
 * - Redacts sensitive data
 * 
 * @param value - Parameter value to sanitize
 * @returns Sanitized value safe for display
 */
export function sanitizeParameterValue(value: any): any {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitives
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    // Redact sensitive data
    let sanitized = redactSensitiveData(value);
    
    // Escape HTML
    sanitized = escapeHtml(sanitized);
    
    // Truncate if too long
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.substring(0, MAX_STRING_LENGTH) + '... [truncated]';
    }
    
    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeParameterValue(item));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, val] of Object.entries(value)) {
      // Sanitize both key and value
      const sanitizedKey = escapeHtml(key);
      sanitized[sanitizedKey] = sanitizeParameterValue(val);
    }
    
    return sanitized;
  }

  // Fallback: convert to string and escape
  return escapeHtml(String(value));
}

/**
 * Sanitize result values for display
 * - Escapes HTML
 * - Limits result size
 * - Sanitizes file paths
 * - Redacts sensitive data
 * 
 * @param result - Result value to sanitize
 * @returns Sanitized result safe for display
 */
export function sanitizeResultValue(result: any): any {
  // Handle null and undefined
  if (result === null || result === undefined) {
    return result;
  }

  // Check size limit for objects
  if (typeof result === 'object') {
    const jsonString = JSON.stringify(result);
    
    if (jsonString.length > MAX_RESULT_SIZE) {
      return {
        success: false,
        error: {
          message: `Result too large (${jsonString.length} bytes, max ${MAX_RESULT_SIZE} bytes)`,
          type: 'ResultSizeError'
        }
      };
    }
  }

  // Handle primitives
  if (typeof result === 'boolean' || typeof result === 'number') {
    return result;
  }

  // Handle strings
  if (typeof result === 'string') {
    // Sanitize file paths
    let sanitized = sanitizeFilePath(result);
    
    // Redact sensitive data
    sanitized = redactSensitiveData(sanitized);
    
    // Escape HTML
    sanitized = escapeHtml(sanitized);
    
    // Truncate if too long
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.substring(0, MAX_STRING_LENGTH) + '... [truncated]';
    }
    
    return sanitized;
  }

  // Handle arrays
  if (Array.isArray(result)) {
    return result.map(item => sanitizeResultValue(item));
  }

  // Handle objects
  if (typeof result === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, val] of Object.entries(result)) {
      // Sanitize both key and value
      const sanitizedKey = escapeHtml(key);
      sanitized[sanitizedKey] = sanitizeResultValue(val);
    }
    
    return sanitized;
  }

  // Fallback: convert to string and escape
  return escapeHtml(String(result));
}

/**
 * Sanitize error messages for display
 * - Removes sensitive paths
 * - Removes API keys/tokens
 * - Sanitizes stack traces
 * - Escapes HTML
 * 
 * @param error - Error object to sanitize
 * @returns Sanitized error safe for display
 */
export function sanitizeError(error: {
  message: string;
  type: string;
  stack?: string;
}): {
  message: string;
  type: string;
  stack?: string;
} {
  return {
    message: sanitizeErrorMessage(error.message),
    type: escapeHtml(error.type),
    stack: error.stack ? sanitizeStackTrace(error.stack) : undefined
  };
}

/**
 * Sanitize an error message
 * - Removes sensitive paths
 * - Removes API keys/tokens
 * - Escapes HTML
 * 
 * @param message - Error message to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (typeof message !== 'string') {
    return String(message);
  }

  // Sanitize file paths
  let sanitized = sanitizeFilePath(message);
  
  // Redact sensitive data
  sanitized = redactSensitiveData(sanitized);
  
  // Escape HTML
  sanitized = escapeHtml(sanitized);
  
  return sanitized;
}

/**
 * Sanitize a stack trace
 * - Removes sensitive paths
 * - Removes API keys/tokens
 * - Escapes HTML
 * - Limits length
 * 
 * @param stack - Stack trace to sanitize
 * @returns Sanitized stack trace
 */
export function sanitizeStackTrace(stack: string): string {
  if (typeof stack !== 'string') {
    return String(stack);
  }

  // Sanitize file paths in stack trace
  let sanitized = sanitizeFilePath(stack);
  
  // Redact sensitive data
  sanitized = redactSensitiveData(sanitized);
  
  // Escape HTML
  sanitized = escapeHtml(sanitized);
  
  // Limit stack trace length
  const maxStackLength = 5000; // 5KB
  if (sanitized.length > maxStackLength) {
    sanitized = sanitized.substring(0, maxStackLength) + '\n... [stack trace truncated]';
  }
  
  return sanitized;
}

/**
 * Sanitize file paths to remove sensitive information
 * Replaces user-specific paths with generic placeholders
 * 
 * @param text - Text containing file paths
 * @returns Text with sanitized file paths
 */
export function sanitizeFilePath(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }

  let sanitized = text;

  // Replace sensitive path patterns
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    sanitized = sanitized.replace(pattern, match => {
      // Replace home directories
      if (match.includes('/home/') || match.includes('/Users/') || match.includes('C:\\Users\\')) {
        return match.replace(/\/home\/[^\/\s]+/, '/home/[user]')
                    .replace(/\/Users\/[^\/\s]+/, '/Users/[user]')
                    .replace(/C:\\Users\\[^\\\/\s]+/, 'C:\\Users\\[user]');
      }
      
      // Replace sensitive directories
      return '[sensitive-path]';
    });
  }

  return sanitized;
}

/**
 * Redact sensitive data like API keys, tokens, and passwords
 * 
 * @param text - Text that may contain sensitive data
 * @returns Text with sensitive data redacted
 */
export function redactSensitiveData(text: string): string {
  if (typeof text !== 'string') {
    return String(text);
  }

  let redacted = text;

  // Apply all sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, match => {
      // Keep first and last 4 characters for identification
      if (match.length > 12) {
        const start = match.substring(0, 4);
        const end = match.substring(match.length - 4);
        return `${start}${'*'.repeat(Math.min(match.length - 8, 20))}${end}`;
      }
      
      // For shorter matches, redact completely
      return '[REDACTED]';
    });
  }

  return redacted;
}

/**
 * Sanitize code snippets for display
 * - Escapes HTML but preserves formatting
 * - Redacts sensitive data
 * - Limits length
 * 
 * @param code - Code snippet to sanitize
 * @returns Sanitized code safe for display
 */
export function sanitizeCodeSnippet(code: string): string {
  if (typeof code !== 'string') {
    return String(code);
  }

  // Redact sensitive data
  let sanitized = redactSensitiveData(code);
  
  // Escape HTML
  sanitized = escapeHtml(sanitized);
  
  // Limit code length
  const maxCodeLength = 50000; // 50KB
  if (sanitized.length > maxCodeLength) {
    sanitized = sanitized.substring(0, maxCodeLength) + '\n... [code truncated]';
  }
  
  return sanitized;
}

/**
 * Check if a value contains potentially sensitive data
 * 
 * @param value - Value to check
 * @returns True if value might contain sensitive data
 */
export function containsSensitiveData(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // Check against sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }

  return false;
}
