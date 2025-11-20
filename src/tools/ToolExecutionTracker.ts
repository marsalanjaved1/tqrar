/**
 * Tool Execution Tracker
 * 
 * Tracks tool execution lifecycle and emits events for UI updates.
 * Provides real-time status tracking for tool calls in the chat interface.
 */

import { EventEmitter } from 'events';
import {
  IToolCall,
  IToolResult,
  IToolExecutionEvent,
  ToolExecutionStatus
} from '../types';
import { sanitizeError } from '../utils/sanitization';

/**
 * Tool Execution Tracker class
 * 
 * Manages tool execution lifecycle and emits events for UI updates.
 * Extends EventEmitter to provide event-driven updates.
 * 
 * Events:
 * - 'execution:start' - Tool execution begins
 * - 'execution:update' - Status changes
 * - 'execution:complete' - Tool execution succeeds
 * - 'execution:error' - Tool execution fails
 * 
 * Performance optimizations:
 * - Throttles status updates to 60fps (16.67ms)
 * - Batches multiple updates within throttle window
 * - Limits stored executions to 100 (configurable)
 * - Automatically clears old executions when limit is reached
 */
export class ToolExecutionTracker extends EventEmitter {
  private _executions: Map<string, IToolExecutionEvent>;
  private _executionCounter: number;

  // Throttling for status updates
  private _throttleDelay: number = 16.67; // 60fps = 16.67ms per frame
  private _pendingUpdates: Map<string, IToolExecutionEvent>;
  private _throttleTimer: NodeJS.Timeout | null = null;

  // Execution history limits
  private _maxExecutions: number = 100;
  private _executionOrder: string[] = []; // Track insertion order for FIFO cleanup

  /**
   * Create a new ToolExecutionTracker
   * 
   * @param maxExecutions - Maximum number of executions to store (default: 100)
   */
  constructor(maxExecutions: number = 100) {
    super();
    this._executions = new Map();
    this._executionCounter = 0;
    this._pendingUpdates = new Map();
    this._maxExecutions = maxExecutions;
    this._executionOrder = [];

    console.log('[ToolExecutionTracker] Initialized with throttling (60fps) and history limit:', maxExecutions);
  }

  /**
   * Start tracking a tool execution
   * Automatically clears old executions if limit is reached
   * 
   * @param toolCall - The tool call to track
   * @returns Unique execution ID
   */
  startExecution(toolCall: IToolCall): string {
    const id = `exec-${++this._executionCounter}-${Date.now()}`;

    const event: IToolExecutionEvent = {
      id,
      toolCall,
      status: 'running',
      startTime: new Date()
    };

    // Check if we need to clear old executions
    if (this._executions.size >= this._maxExecutions) {
      this._clearOldestExecution();
    }

    this._executions.set(id, event);
    this._executionOrder.push(id);

    console.log('[TQRAR-DEBUG] [ToolExecutionTracker] Started execution:', {
      id,
      toolCallId: toolCall.id,
      tool: toolCall.function.name,
      totalExecutions: this._executions.size
    });

    // Emit start event
    console.log('[TQRAR-DEBUG] [ToolExecutionTracker] Emitting execution:start event, listeners:', this.listenerCount('execution:start'));
    this.emit('execution:start', event);

    return id;
  }

  /**
   * Clear the oldest execution to maintain history limit
   * Uses FIFO (First In, First Out) strategy
   * @private
   */
  private _clearOldestExecution(): void {
    if (this._executionOrder.length === 0) {
      return;
    }

    // Remove the oldest execution (first in the order array)
    const oldestId = this._executionOrder.shift();

    if (oldestId) {
      this._executions.delete(oldestId);
      this._pendingUpdates.delete(oldestId);

      console.log('[ToolExecutionTracker] Cleared oldest execution:', oldestId);
    }
  }

  /**
   * Update the status of a tool execution
   * Throttled to 60fps to prevent excessive UI updates
   * 
   * @param id - Execution ID
   * @param status - New status
   */
  updateStatus(id: string, status: ToolExecutionStatus): void {
    const execution = this._executions.get(id);

    if (!execution) {
      console.warn('[ToolExecutionTracker] Execution not found:', id);
      return;
    }

    execution.status = status;

    console.log('[ToolExecutionTracker] Updated status:', {
      id,
      status
    });

    // Add to pending updates for batching
    this._pendingUpdates.set(id, execution);

    // Schedule throttled emit if not already scheduled
    if (!this._throttleTimer) {
      this._throttleTimer = setTimeout(() => {
        this._flushPendingUpdates();
      }, this._throttleDelay);
    }
  }

  /**
   * Flush all pending updates
   * Emits batched update events
   * @private
   */
  private _flushPendingUpdates(): void {
    // Clear the timer
    this._throttleTimer = null;

    // Emit all pending updates
    for (const execution of this._pendingUpdates.values()) {
      this.emit('execution:update', execution);
    }

    // Clear pending updates
    this._pendingUpdates.clear();
  }

  /**
   * Mark a tool execution as complete with result
   * Completion events are NOT throttled for immediate feedback
   * 
   * @param id - Execution ID
   * @param result - Tool execution result
   */
  completeExecution(id: string, result: IToolResult): void {
    const execution = this._executions.get(id);

    if (!execution) {
      console.warn('[ToolExecutionTracker] Execution not found:', id);
      return;
    }

    execution.status = 'success';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    execution.result = result;

    console.log('[TQRAR-DEBUG] [ToolExecutionTracker] Completed execution:', {
      id,
      toolCallId: execution.toolCall.id,
      tool: execution.toolCall.function.name,
      duration: execution.duration
    });

    // Remove from pending updates if present
    this._pendingUpdates.delete(id);

    // Emit complete event immediately (not throttled)
    this.emit('execution:complete', execution);
  }

  /**
   * Mark a tool execution as failed with error
   * Error events are NOT throttled for immediate feedback
   * 
   * @param id - Execution ID
   * @param error - Error that occurred
   */
  failExecution(id: string, error: Error): void {
    const execution = this._executions.get(id);

    if (!execution) {
      console.warn('[ToolExecutionTracker] Execution not found:', id);
      return;
    }

    execution.status = 'error';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    // Sanitize error to remove sensitive paths, API keys, and escape HTML
    execution.error = sanitizeError({
      message: error.message,
      type: error.name,
      stack: error.stack
    });

    console.error('[TQRAR-DEBUG] [ToolExecutionTracker] Failed execution:', {
      id,
      toolCallId: execution.toolCall.id,
      tool: execution.toolCall.function.name,
      error: error.message
    });

    // Remove from pending updates if present
    this._pendingUpdates.delete(id);

    // Emit error event immediately (not throttled)
    this.emit('execution:error', execution);
  }

  /**
   * Get a specific tool execution by ID
   * 
   * @param id - Execution ID
   * @returns Tool execution event or undefined if not found
   */
  getExecution(id: string): IToolExecutionEvent | undefined {
    return this._executions.get(id);
  }

  /**
   * Get a tool execution by tool call ID
   * 
   * @param toolCallId - Tool call ID from the LLM
   * @returns Tool execution event or undefined if not found
   */
  getExecutionByToolCallId(toolCallId: string): IToolExecutionEvent | undefined {
    for (const execution of this._executions.values()) {
      if (execution.toolCall.id === toolCallId) {
        return execution;
      }
    }
    return undefined;
  }

  /**
   * Get all tool executions
   * 
   * @returns Array of all tool execution events
   */
  getAllExecutions(): IToolExecutionEvent[] {
    return Array.from(this._executions.values());
  }

  /**
   * Clear all stored executions
   * Useful when clearing conversation history
   */
  clear(): void {
    console.log('[ToolExecutionTracker] Clearing all executions');

    // Clear throttle timer if active
    if (this._throttleTimer) {
      clearTimeout(this._throttleTimer);
      this._throttleTimer = null;
    }

    // Clear all data
    this._executions.clear();
    this._pendingUpdates.clear();
    this._executionOrder = [];
    this._executionCounter = 0;
  }

  /**
   * Get the maximum number of executions that can be stored
   * 
   * @returns Maximum execution limit
   */
  get maxExecutions(): number {
    return this._maxExecutions;
  }

  /**
   * Set the maximum number of executions to store
   * If current count exceeds new limit, oldest executions are removed
   * 
   * @param limit - New maximum execution limit
   */
  set maxExecutions(limit: number) {
    if (limit < 1) {
      console.warn('[ToolExecutionTracker] Invalid limit, must be >= 1');
      return;
    }

    this._maxExecutions = limit;

    // Clear excess executions if current count exceeds new limit
    while (this._executions.size > this._maxExecutions) {
      this._clearOldestExecution();
    }

    console.log('[ToolExecutionTracker] Updated max executions to:', limit);
  }

  /**
   * Get the number of stored executions
   * 
   * @returns Number of executions
   */
  get executionCount(): number {
    return this._executions.size;
  }
}
