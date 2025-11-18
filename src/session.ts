/**
 * Session Management for AI Assistant
 * Handles multiple conversation sessions with history
 */

import { IStateDB } from '@jupyterlab/statedb';
import { IMessage } from './types';

/**
 * Session metadata
 */
export interface ISession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string; // First user message as preview
}

/**
 * Session with full conversation history
 */
export interface ISessionWithHistory extends ISession {
  messages: IMessage[];
}

/**
 * Key prefix for storing sessions in StateDB
 */
const SESSION_KEY_PREFIX = 'ai-assistant:session';
const SESSION_LIST_KEY = 'ai-assistant:session-list';

/**
 * Session Manager
 * Manages multiple conversation sessions with persistence
 */
export class SessionManager {
  private _stateDB: IStateDB;
  private _sessions: Map<string, ISessionWithHistory> = new Map();
  private _activeSessionId: string | null = null;

  constructor(stateDB: IStateDB) {
    this._stateDB = stateDB;
  }

  /**
   * Initialize session manager and load sessions
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSessionList();
      console.log('[SessionManager] Initialized with', this._sessions.size, 'sessions');
    } catch (error) {
      console.error('[SessionManager] Failed to initialize:', error);
      // Continue with empty sessions rather than blocking
      this._sessions.clear();
    }
  }

  /**
   * Create a new session
   */
  async createSession(title?: string): Promise<ISession> {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const session: ISessionWithHistory = {
      id,
      title: title || 'New Chat',
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      messages: []
    };

    this._sessions.set(id, session);
    await this.saveSession(session);
    await this.saveSessionList();

    console.log('[SessionManager] Created session:', id);
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(id: string): Promise<ISessionWithHistory | null> {
    if (this._sessions.has(id)) {
      return this._sessions.get(id)!;
    }

    // Try loading from storage
    try {
      const key = `${SESSION_KEY_PREFIX}:${id}`;
      const data = await this._stateDB.fetch(key);
      
      if (data) {
        const session = this.deserializeSession(data as any);
        this._sessions.set(id, session);
        return session;
      }
    } catch (error) {
      console.error('[SessionManager] Failed to load session:', error);
    }

    return null;
  }

  /**
   * Update session messages
   */
  async updateSession(id: string, messages: IMessage[]): Promise<void> {
    const session = await this.getSession(id);
    if (!session) {
      console.error('[SessionManager] Session not found:', id);
      return;
    }

    session.messages = messages;
    session.messageCount = messages.filter(m => m.role !== 'system').length;
    session.updatedAt = new Date();

    // Update title from first user message if still "New Chat"
    if (session.title === 'New Chat' && messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        session.title = firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
        session.preview = firstUserMsg.content.substring(0, 100);
      }
    }

    await this.saveSession(session);
    await this.saveSessionList();
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<void> {
    this._sessions.delete(id);
    
    try {
      const key = `${SESSION_KEY_PREFIX}:${id}`;
      await this._stateDB.remove(key);
      await this.saveSessionList();
      console.log('[SessionManager] Deleted session:', id);
    } catch (error) {
      console.error('[SessionManager] Failed to delete session:', error);
    }
  }

  /**
   * Get all sessions (metadata only)
   */
  getAllSessions(): ISession[] {
    return Array.from(this._sessions.values())
      .map(s => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messageCount,
        preview: s.preview
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Set active session
   */
  setActiveSession(id: string): void {
    this._activeSessionId = id;
  }

  /**
   * Get active session ID
   */
  getActiveSessionId(): string | null {
    return this._activeSessionId;
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: ISessionWithHistory): Promise<void> {
    try {
      const key = `${SESSION_KEY_PREFIX}:${session.id}`;
      const serialized = this.serializeSession(session);
      await this._stateDB.save(key, serialized as any);
    } catch (error) {
      console.error('[SessionManager] Failed to save session:', error);
    }
  }

  /**
   * Save session list (metadata only)
   */
  private async saveSessionList(): Promise<void> {
    try {
      const sessionList = this.getAllSessions();
      await this._stateDB.save(SESSION_LIST_KEY, sessionList as any);
    } catch (error) {
      console.error('[SessionManager] Failed to save session list:', error);
    }
  }

  /**
   * Load session list from storage
   */
  private async loadSessionList(): Promise<void> {
    try {
      const data = await this._stateDB.fetch(SESSION_LIST_KEY);
      
      if (data) {
        const sessions = data as any[];
        for (const sessionData of sessions) {
          const session: ISessionWithHistory = {
            id: sessionData.id,
            title: sessionData.title,
            createdAt: new Date(sessionData.createdAt),
            updatedAt: new Date(sessionData.updatedAt),
            messageCount: sessionData.messageCount,
            preview: sessionData.preview,
            messages: [] // Load messages lazily when needed
          };
          this._sessions.set(session.id, session);
        }
      }
    } catch (error) {
      console.error('[SessionManager] Failed to load session list:', error);
    }
  }

  /**
   * Serialize session for storage
   */
  private serializeSession(session: ISessionWithHistory): any {
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messageCount,
      preview: session.preview,
      messages: session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        timestamp: msg.timestamp.toISOString(),
        metadata: msg.metadata,
        finalContent: msg.finalContent
      }))
    };
  }

  /**
   * Deserialize session from storage
   */
  private deserializeSession(data: any): ISessionWithHistory {
    return {
      id: data.id,
      title: data.title,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      messageCount: data.messageCount,
      preview: data.preview,
      messages: (data.messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        timestamp: new Date(msg.timestamp),
        metadata: msg.metadata,
        finalContent: msg.finalContent
      }))
    };
  }

  /**
   * Clear all sessions (for testing/reset)
   */
  async clearAll(): Promise<void> {
    const sessionIds = Array.from(this._sessions.keys());
    for (const id of sessionIds) {
      await this.deleteSession(id);
    }
    this._sessions.clear();
    this._activeSessionId = null;
    console.log('[SessionManager] Cleared all sessions');
  }
}
