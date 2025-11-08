/**
 * Security utilities for AI Assistant
 * 
 * Provides security validations, logging, and encryption utilities
 * to ensure safe operation of the AI Assistant extension.
 */

import { PathExt } from '@jupyterlab/coreutils';

/**
 * Security event types for logging
 */
export enum SecurityEventType {
  UNAUTHORIZED_FILE_ACCESS = 'unauthorized_file_access',
  PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
  ABSOLUTE_PATH_ATTEMPT = 'absolute_path_attempt',
  API_KEY_VALIDATION = 'api_key_validation',
  INSECURE_CONNECTION = 'insecure_connection',
  TOOL_EXECUTION_ERROR = 'tool_execution_error'
}

/**
 * Security event for logging
 */
export interface ISecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  details: string;
  path?: string;
  tool?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Security logger for tracking security-related events
 */
export class SecurityLogger {
  private static _events: ISecurityEvent[] = [];
  private static _maxEvents = 1000; // Keep last 1000 events

  /**
   * Log a security event
   * 
   * @param type - Type of security event
   * @param details - Details about the event (sanitized)
   * @param severity - Severity level
   * @param metadata - Additional metadata (will be sanitized)
   */
  static logEvent(
    type: SecurityEventType,
    details: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    metadata?: { path?: string; tool?: string }
  ): void {
    const event: ISecurityEvent = {
      type,
      timestamp: new Date(),
      details: this.sanitizeLogMessage(details),
      path: metadata?.path ? this.sanitizeLogMessage(metadata.path) : undefined,
      tool: metadata?.tool,
      severity
    };

    // Add to events array
    this._events.push(event);

    // Trim to max size
    if (this._events.length > this._maxEvents) {
      this._events = this._events.slice(-this._maxEvents);
    }

    // Log to console based on severity
    const logMessage = `[Security ${severity.toUpperCase()}] ${type}: ${details}`;
    if (severity === 'high') {
      console.error(logMessage, metadata);
    } else if (severity === 'medium') {
      console.warn(logMessage, metadata);
    } else {
      console.log(logMessage, metadata);
    }
  }

  /**
   * Get recent security events
   * 
   * @param count - Number of recent events to retrieve
   * @returns Array of security events
   */
  static getRecentEvents(count: number = 100): ISecurityEvent[] {
    return this._events.slice(-count);
  }

  /**
   * Get events by type
   * 
   * @param type - Event type to filter by
   * @returns Array of matching security events
   */
  static getEventsByType(type: SecurityEventType): ISecurityEvent[] {
    return this._events.filter(event => event.type === type);
  }

  /**
   * Clear all logged events
   */
  static clearEvents(): void {
    this._events = [];
  }

  /**
   * Sanitize log messages to remove sensitive information
   * 
   * @param message - Message to sanitize
   * @returns Sanitized message
   */
  private static sanitizeLogMessage(message: string): string {
    // Remove potential API keys (patterns like sk-..., Bearer ...)
    let sanitized = message.replace(/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]');
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [TOKEN_REDACTED]');
    
    // Remove potential passwords
    sanitized = sanitized.replace(/password["\s:=]+[^\s"]+/gi, 'password=[REDACTED]');
    
    // Remove potential tokens
    sanitized = sanitized.replace(/token["\s:=]+[^\s"]+/gi, 'token=[REDACTED]');
    
    return sanitized;
  }
}

/**
 * Path validation utilities
 */
export class PathValidator {
  /**
   * Validate that a path is safe and within workspace boundaries
   * 
   * @param path - Path to validate
   * @returns Validation result with error message if invalid
   */
  static validatePath(path: string): { valid: boolean; error?: string } {
    // Normalize the path
    const normalizedPath = PathExt.normalize(path);

    // Check for directory traversal attempts (..)
    if (normalizedPath.includes('..') || path.includes('..')) {
      SecurityLogger.logEvent(
        SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
        `Attempted directory traversal with path: ${path}`,
        'high',
        { path }
      );
      
      return {
        valid: false,
        error: 'Path contains directory traversal (..) which is not allowed for security reasons.'
      };
    }

    // Check for absolute paths (starting with /)
    if (path.startsWith('/')) {
      SecurityLogger.logEvent(
        SecurityEventType.ABSOLUTE_PATH_ATTEMPT,
        `Attempted absolute path access: ${path}`,
        'medium',
        { path }
      );
      
      return {
        valid: false,
        error: 'Absolute paths are not allowed. Please use paths relative to the workspace root.'
      };
    }

    // Check for null bytes (potential security issue)
    if (path.includes('\0')) {
      SecurityLogger.logEvent(
        SecurityEventType.UNAUTHORIZED_FILE_ACCESS,
        `Path contains null byte: ${path}`,
        'high',
        { path }
      );
      
      return {
        valid: false,
        error: 'Path contains invalid characters.'
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple paths at once
   * 
   * @param paths - Array of paths to validate
   * @returns Validation result for all paths
   */
  static validatePaths(paths: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const path of paths) {
      const result = this.validatePath(path);
      if (!result.valid && result.error) {
        errors.push(`${path}: ${result.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * API key encryption utilities
 * 
 * Note: In a browser environment, true encryption is limited.
 * This provides basic obfuscation. For production use, consider
 * server-side encryption or browser's SubtleCrypto API.
 */
export class ApiKeyEncryption {
  // private static readonly STORAGE_KEY = 'jp-ai-assistant-encrypted-key';

  /**
   * Encrypt an API key for storage
   * 
   * Note: This is basic obfuscation. For production, use proper encryption.
   * 
   * @param apiKey - API key to encrypt
   * @returns Encrypted key string
   */
  static encrypt(apiKey: string): string {
    if (!apiKey) {
      return '';
    }

    try {
      // Simple base64 encoding with a prefix
      // In production, use SubtleCrypto API or server-side encryption
      const encoded = btoa(apiKey);
      return `enc_v1_${encoded}`;
    } catch (error) {
      console.error('[Security] Failed to encrypt API key:', error);
      SecurityLogger.logEvent(
        SecurityEventType.API_KEY_VALIDATION,
        'Failed to encrypt API key',
        'high'
      );
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt an API key from storage
   * 
   * @param encryptedKey - Encrypted key string
   * @returns Decrypted API key
   */
  static decrypt(encryptedKey: string): string {
    if (!encryptedKey) {
      return '';
    }

    try {
      // Check for our encryption prefix
      if (!encryptedKey.startsWith('enc_v1_')) {
        // Assume it's already decrypted (backward compatibility)
        return encryptedKey;
      }

      // Remove prefix and decode
      const encoded = encryptedKey.substring(7);
      return atob(encoded);
    } catch (error) {
      console.error('[Security] Failed to decrypt API key:', error);
      SecurityLogger.logEvent(
        SecurityEventType.API_KEY_VALIDATION,
        'Failed to decrypt API key',
        'high'
      );
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Check if a string appears to be an encrypted key
   * 
   * @param value - Value to check
   * @returns True if value appears to be encrypted
   */
  static isEncrypted(value: string): boolean {
    return value.startsWith('enc_v1_');
  }
}

/**
 * URL validation utilities
 */
export class UrlValidator {
  /**
   * Validate that a URL uses HTTPS (or localhost HTTP for development)
   * 
   * @param url - URL to validate
   * @returns Validation result
   */
  static validateSecureUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsedUrl = new URL(url);
      
      // Allow HTTPS
      if (parsedUrl.protocol === 'https:') {
        return { valid: true };
      }

      // Allow HTTP only for localhost/127.0.0.1 (development)
      if (parsedUrl.protocol === 'http:') {
        const hostname = parsedUrl.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
          SecurityLogger.logEvent(
            SecurityEventType.INSECURE_CONNECTION,
            `Using HTTP for local development: ${hostname}`,
            'low',
            { path: url }
          );
          return { valid: true };
        }

        SecurityLogger.logEvent(
          SecurityEventType.INSECURE_CONNECTION,
          `Attempted insecure HTTP connection to: ${hostname}`,
          'high',
          { path: url }
        );

        return {
          valid: false,
          error: 'Only HTTPS connections are allowed for remote hosts. HTTP is only permitted for localhost.'
        };
      }

      return {
        valid: false,
        error: `Invalid protocol: ${parsedUrl.protocol}. Only HTTPS (or HTTP for localhost) is allowed.`
      };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate LLM provider base URL
   * 
   * @param provider - Provider name
   * @param baseUrl - Base URL to validate
   * @returns Validation result
   */
  static validateProviderUrl(provider: string, baseUrl?: string): { valid: boolean; error?: string } {
    // Known secure provider URLs
    const knownProviders: Record<string, string> = {
      'openrouter': 'https://openrouter.ai/api/v1',
      'openai': 'https://api.openai.com/v1',
      'anthropic': 'https://api.anthropic.com/v1'
    };

    // If it's a known provider, no validation needed
    if (provider in knownProviders) {
      return { valid: true };
    }

    // For local/custom providers, validate the URL
    if (provider === 'local' && baseUrl) {
      return this.validateSecureUrl(baseUrl);
    }

    return {
      valid: false,
      error: 'Unknown provider or missing base URL'
    };
  }
}

/**
 * Kernel session validation utilities
 */
export class KernelValidator {
  /**
   * Validate that we're using an existing kernel session
   * (not creating new permissions)
   * 
   * @param sessionContext - Session context to validate
   * @returns Validation result
   */
  static validateExistingSession(sessionContext: any): { valid: boolean; error?: string } {
    if (!sessionContext) {
      return {
        valid: false,
        error: 'No session context available'
      };
    }

    // Check if session exists
    if (!sessionContext.session) {
      return {
        valid: false,
        error: 'No active session. Please start a kernel first.'
      };
    }

    // Check if kernel exists
    if (!sessionContext.session.kernel) {
      return {
        valid: false,
        error: 'No active kernel. Please start a kernel first.'
      };
    }

    return { valid: true };
  }
}

/**
 * Tool execution security wrapper
 */
export class ToolSecurityWrapper {
  /**
   * Wrap tool execution with security logging
   * 
   * @param toolName - Name of the tool being executed
   * @param args - Tool arguments (will be sanitized for logging)
   * @param executor - Function that executes the tool
   * @returns Tool execution result
   */
  static async executeWithLogging<T>(
    toolName: string,
    args: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Log tool execution start (with sanitized args)
      // const sanitizedArgs = this.sanitizeToolArgs(args);
      SecurityLogger.logEvent(
        SecurityEventType.TOOL_EXECUTION_ERROR,
        `Executing tool: ${toolName}`,
        'low',
        { tool: toolName }
      );

      // Execute the tool
      const result = await executor();

      // Log successful execution
      const duration = Date.now() - startTime;
      console.log(`[Security] Tool ${toolName} executed successfully in ${duration}ms`);

      return result;
    } catch (error) {
      // Log tool execution error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      SecurityLogger.logEvent(
        SecurityEventType.TOOL_EXECUTION_ERROR,
        `Tool ${toolName} failed: ${errorMessage}`,
        'medium',
        { tool: toolName }
      );

      throw error;
    }
  }
}

/**
 * Security audit utilities
 */
export class SecurityAudit {
  /**
   * Generate a security audit report
   * 
   * @returns Security audit report
   */
  static generateReport(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    highSeverityEvents: number;
    recentHighSeverityEvents: ISecurityEvent[];
  } {
    const events = SecurityLogger.getRecentEvents(1000);
    
    const eventsByType: Record<string, number> = {};
    let highSeverityCount = 0;
    const recentHighSeverity: ISecurityEvent[] = [];

    for (const event of events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count high severity
      if (event.severity === 'high') {
        highSeverityCount++;
        if (recentHighSeverity.length < 10) {
          recentHighSeverity.push(event);
        }
      }
    }

    return {
      totalEvents: events.length,
      eventsByType,
      highSeverityEvents: highSeverityCount,
      recentHighSeverityEvents: recentHighSeverity
    };
  }

  /**
   * Check if there are any critical security issues
   * 
   * @returns True if critical issues detected
   */
  static hasCriticalIssues(): boolean {
    const report = this.generateReport();
    return report.highSeverityEvents > 0;
  }
}
