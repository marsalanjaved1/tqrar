/**
 * Conversation history storage and management
 * 
 * Handles persistence of conversation history using JupyterLab's StateDB
 */

import { IStateDB } from '@jupyterlab/statedb';
import { IMessage } from './types';

/**
 * Key prefix for storing conversation history in StateDB
 */
const HISTORY_KEY_PREFIX = 'ai-assistant:conversation-history';

/**
 * Maximum number of messages to keep in history
 * Prevents unbounded growth of stored data
 */
const MAX_HISTORY_SIZE = 1000;

/**
 * History storage manager
 * Provides methods to save and load conversation history
 */
export class HistoryStorage {
  private _stateDB: IStateDB;
  private _historyKey: string;

  /**
   * Create a new HistoryStorage instance
   * 
   * @param stateDB - JupyterLab state database
   * @param sessionId - Optional session identifier (defaults to 'default')
   */
  constructor(stateDB: IStateDB, sessionId: string = 'default') {
    this._stateDB = stateDB;
    this._historyKey = `${HISTORY_KEY_PREFIX}:${sessionId}`;
  }

  /**
   * Save conversation history to storage
   * 
   * @param messages - Array of messages to save
   * @returns Promise that resolves when save is complete
   */
  async save(messages: IMessage[]): Promise<void> {
    try {
      // Limit history size to prevent unbounded growth
      const messagesToSave = messages.slice(-MAX_HISTORY_SIZE);

      // Serialize messages for storage
      const serialized = messagesToSave.map(msg => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        timestamp: msg.timestamp.toISOString(),
        metadata: msg.metadata
      }));

      // Save to state database (cast to any to satisfy StateDB type requirements)
      await this._stateDB.save(this._historyKey, serialized as any);
      
      console.log('[HistoryStorage] Saved', messagesToSave.length, 'messages to storage');
    } catch (error) {
      console.error('[HistoryStorage] Failed to save history:', error);
      throw error;
    }
  }

  /**
   * Load conversation history from storage
   * 
   * @returns Promise that resolves with array of messages, or empty array if none found
   */
  async load(): Promise<IMessage[]> {
    try {
      const data = await this._stateDB.fetch(this._historyKey);
      
      if (!data) {
        console.log('[HistoryStorage] No saved history found');
        return [];
      }

      // Deserialize messages
      const messages = (data as any[]).map(msg => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata
      }));

      console.log('[HistoryStorage] Loaded', messages.length, 'messages from storage');
      return messages;
    } catch (error) {
      console.error('[HistoryStorage] Failed to load history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history from storage
   * 
   * @returns Promise that resolves when clear is complete
   */
  async clear(): Promise<void> {
    try {
      await this._stateDB.remove(this._historyKey);
      console.log('[HistoryStorage] Cleared history from storage');
    } catch (error) {
      console.error('[HistoryStorage] Failed to clear history:', error);
      throw error;
    }
  }

  /**
   * Check if conversation history exists in storage
   * 
   * @returns Promise that resolves with true if history exists, false otherwise
   */
  async exists(): Promise<boolean> {
    try {
      const data = await this._stateDB.fetch(this._historyKey);
      return data !== undefined && data !== null;
    } catch (error) {
      console.error('[HistoryStorage] Failed to check history existence:', error);
      return false;
    }
  }

  /**
   * Get the size of stored history
   * 
   * @returns Promise that resolves with the number of messages in storage
   */
  async size(): Promise<number> {
    try {
      const messages = await this.load();
      return messages.length;
    } catch (error) {
      console.error('[HistoryStorage] Failed to get history size:', error);
      return 0;
    }
  }
}

/**
 * Debounce utility for throttling save operations
 * Prevents excessive writes to storage
 */
export class DebouncedHistorySaver {
  private _storage: HistoryStorage;
  private _timeout: number | null = null;
  private _delay: number;

  /**
   * Create a new DebouncedHistorySaver
   * 
   * @param storage - History storage instance
   * @param delay - Delay in milliseconds before saving (default: 1000ms)
   */
  constructor(storage: HistoryStorage, delay: number = 1000) {
    this._storage = storage;
    this._delay = delay;
  }

  /**
   * Schedule a save operation
   * Cancels any pending save and schedules a new one
   * 
   * @param messages - Messages to save
   */
  save(messages: IMessage[]): void {
    // Cancel any pending save
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
    }

    // Schedule new save
    this._timeout = window.setTimeout(() => {
      this._storage.save(messages).catch(error => {
        console.error('[DebouncedHistorySaver] Failed to save:', error);
      });
      this._timeout = null;
    }, this._delay);
  }

  /**
   * Force immediate save, canceling any pending save
   * 
   * @param messages - Messages to save
   * @returns Promise that resolves when save is complete
   */
  async saveNow(messages: IMessage[]): Promise<void> {
    // Cancel any pending save
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    // Save immediately
    await this._storage.save(messages);
  }

  /**
   * Cancel any pending save operation
   */
  cancel(): void {
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
}
