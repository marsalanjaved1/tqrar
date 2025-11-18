/**
 * Chat widget for AI Assistant with custom chat interface
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import React from 'react';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { ChatInterface } from './components/ChatInterface';
import { SessionTabs } from './components/SessionTabs';
import { HistorySidebar } from './components/HistorySidebar';
import { SessionManager, ISession } from './session';

// Import CSS
import '../style/widget.css';
import '../style/chat-interface.css';
import '../style/tool-execution.css';
import '../style/sessions.css';

/**
 * Options for creating a ChatWidget
 */
export interface IChatWidgetOptions {
  /**
   * Callback when settings button is clicked
   */
  onSettingsClick?: () => void;

  /**
   * Callback when a message is sent - returns an async generator for streaming
   */
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;

  /**
   * RenderMime registry for rendering rich content
   */
  rendermime?: IRenderMimeRegistry;

  /**
   * Tool execution tracker for monitoring tool calls
   */
  toolExecutionTracker?: ToolExecutionTracker;

  /**
   * Initial conversation history
   */
  initialMessages?: IMessage[];

  /**
   * Callback to subscribe to messages changes from conversation manager
   */
  onMessagesChange?: (callback: (messages: IMessage[]) => void) => void;

  /**
   * Session manager for handling multiple conversations
   */
  sessionManager?: SessionManager;

  /**
   * Callback when session changes
   */
  onSessionChange?: (sessionId: string) => void;

  /**
   * Callback when new session is created
   */
  onNewSession?: () => void;
}

/**
 * React component for the chat interface
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  toolExecutionTracker?: ToolExecutionTracker;
  initialMessages?: IMessage[];
  onMessagesChange?: (callback: (messages: IMessage[]) => void) => void;
  sessionManager?: SessionManager;
  onSessionChange?: (sessionId: string) => void;
  onNewSession?: () => void;
}> = ({ onSettingsClick, onMessageSend, toolExecutionTracker, initialMessages = [], onMessagesChange, sessionManager, onSessionChange, onNewSession }) => {
  const [messages, setMessages] = React.useState<IMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<string>('');
  const baseMessagesRef = React.useRef<IMessage[]>(initialMessages);
  const [activeSessions, setActiveSessions] = React.useState<ISession[]>([]);
  const [allSessions, setAllSessions] = React.useState<ISession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  // Load sessions list on mount (but don't auto-load any session)
  React.useEffect(() => {
    if (sessionManager) {
      const loadSessions = async () => {
        try {
          // Wait a bit for session manager to initialize
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const sessions = sessionManager.getAllSessions();
          setAllSessions(sessions);
          
          // Don't auto-load any session - start fresh
          // User can load from history sidebar if they want
          console.log('[ChatComponent] Loaded', sessions.length, 'sessions from history');
        } catch (error) {
          console.error('[ChatComponent] Failed to load sessions:', error);
        }
      };
      loadSessions();
      
      // Listen for session initialization events
      const handleSessionInit = async (event: any) => {
        const sessionId = event.detail?.sessionId;
        if (sessionId && sessionManager) {
          const session = await sessionManager.getSession(sessionId);
          if (session) {
            setActiveSessionId(sessionId);
            setActiveSessions([session]);
            setAllSessions(sessionManager.getAllSessions());
          }
        }
      };
      
      window.addEventListener('session-initialized', handleSessionInit);
      return () => {
        window.removeEventListener('session-initialized', handleSessionInit);
      };
    }
  }, [sessionManager]);

  // Subscribe to messages changes from conversation manager
  React.useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange((newMessages) => {
        console.log('[ChatComponent] Received messages update from conversation manager:', newMessages.length);
        baseMessagesRef.current = newMessages;
        // If not streaming, update messages directly
        if (!isStreaming) {
          setMessages(newMessages);
        }
        // Update session with new messages
        if (sessionManager && activeSessionId) {
          sessionManager.updateSession(activeSessionId, newMessages).catch(error => {
            console.error('[ChatComponent] Failed to update session:', error);
          });
          try {
            setAllSessions(sessionManager.getAllSessions());
          } catch (error) {
            console.error('[ChatComponent] Failed to get sessions:', error);
          }
        }
      });
    }
  }, [onMessagesChange, isStreaming, sessionManager, activeSessionId]);

  // Merge streaming content with base messages
  React.useEffect(() => {
    if (isStreaming && streamingContent) {
      const messagesWithStreaming = [...baseMessagesRef.current];
      const lastMessage = messagesWithStreaming[messagesWithStreaming.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant') {
        // Update existing assistant message with streaming content
        lastMessage.content = streamingContent;
      } else {
        // Add new assistant message with streaming content
        messagesWithStreaming.push({
          role: 'assistant',
          content: streamingContent,
          timestamp: new Date()
        });
      }
      
      setMessages(messagesWithStreaming);
    } else if (!isStreaming) {
      // When streaming ends, use base messages from conversation manager
      setMessages(baseMessagesRef.current);
    }
  }, [isStreaming, streamingContent]);

  const handleNewSession = async () => {
    // Just clear the UI - don't create session until user types
    setActiveSessionId(null);
    setMessages([]);
    baseMessagesRef.current = [];
    
    if (onNewSession) {
      onNewSession();
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    if (!sessionManager) return;
    
    const session = await sessionManager.getSession(sessionId);
    if (session) {
      console.log('[ChatComponent] Selecting session:', sessionId, 'Current active sessions:', activeSessions.length);
      setActiveSessionId(sessionId);
      await sessionManager.setActiveSession(sessionId);
      
      // Add to active sessions if not already there
      if (!activeSessions.find(s => s.id === sessionId)) {
        const newActiveSessions = [...activeSessions, session];
        console.log('[ChatComponent] Adding session to active sessions. New count:', newActiveSessions.length);
        setActiveSessions(newActiveSessions);
      }
      
      // Load session messages
      setMessages(session.messages);
      baseMessagesRef.current = session.messages;
      
      if (onSessionChange) {
        onSessionChange(sessionId);
      }
    }
  };

  const handleSessionClose = async (sessionId: string) => {
    setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
    
    // If closing active session, switch to another or create new
    if (sessionId === activeSessionId) {
      const remaining = activeSessions.filter(s => s.id !== sessionId);
      if (remaining.length > 0) {
        handleSessionSelect(remaining[0].id);
      } else {
        handleNewSession();
      }
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    if (!sessionManager) return;
    
    await sessionManager.deleteSession(sessionId);
    setAllSessions(sessionManager.getAllSessions());
    handleSessionClose(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    if (!onMessageSend) {
      // Add demo message if no handler
      const demoMessage: IMessage = {
        role: 'assistant',
        content: 'AI Assistant is not configured. Please click the settings icon to configure your API key.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, demoMessage]);
      return;
    }

    // Create new session if none is active (user clicked + and is now typing)
    if (!activeSessionId && sessionManager) {
      const newSession = await sessionManager.createSession();
      setActiveSessionId(newSession.id);
      setActiveSessions([...activeSessions, newSession]);
      setAllSessions(sessionManager.getAllSessions());
      await sessionManager.setActiveSession(newSession.id);
      console.log('[ChatComponent] Created new session on first message:', newSession.id);
    }

    // Add user message immediately
    const userMessage: IMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    baseMessagesRef.current = [...baseMessagesRef.current, userMessage];
    setMessages([...baseMessagesRef.current]);

    // Stream assistant response
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      const stream = await onMessageSend(content);
      let accumulatedContent = '';
      
      // Stream chunks and update UI in real-time
      for await (const chunk of stream) {
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }
    } catch (error) {
      console.error('[ChatComponent] Error streaming response:', error);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const hasMessages = messages.filter(m => m.role !== 'system').length > 0;

  return (
    <div className="jp-AIAssistant-container">
      {/* Header with buttons */}
      <div className="jp-AIAssistant-header">
        <div className="jp-AIAssistant-title">Tqrar</div>
        <div className="jp-AIAssistant-headerButtons">
          <button
            className="jp-AIAssistant-headerButton jp-AIAssistant-headerButton-new"
            title="New Chat"
            onClick={handleNewSession}
            disabled={!hasMessages}
          >
            +
          </button>
          <button
            className="jp-AIAssistant-headerButton"
            title="Chat History"
            onClick={() => setShowHistory(true)}
          >
            📋
          </button>
          <button
            className="jp-AIAssistant-settings-button jp-Button"
            title="Settings"
            onClick={() => onSettingsClick?.()}
            dangerouslySetInnerHTML={{ __html: settingsIcon.svgstr }}
          />
        </div>
      </div>

      {/* Session Tabs */}
      <SessionTabs
        sessions={activeSessions}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionClose={handleSessionClose}
      />

      {/* Chat interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
        toolExecutionTracker={toolExecutionTracker}
      />

      {/* History Sidebar */}
      <HistorySidebar
        sessions={allSessions}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
      />
    </div>
  );
};

/**
 * Chat widget using ReactWidget
 */
export class ChatWidget extends ReactWidget {
  private _onSettingsClick?: () => void;
  private _onMessageSend?: (content: string) => Promise<AsyncGenerator<string>>;
  private _toolExecutionTracker?: ToolExecutionTracker;
  private _initialMessages?: IMessage[];
  private _onMessagesChange?: (callback: (messages: IMessage[]) => void) => void;
  public _messagesCallback?: (messages: IMessage[]) => void;
  private _sessionManager?: SessionManager;
  private _onSessionChange?: (sessionId: string) => void;
  private _onNewSession?: () => void;

  /**
   * Construct a new chat widget
   */
  constructor(options: IChatWidgetOptions = {}) {
    super();

    this.addClass('jp-AIAssistant');
    this.id = 'ai-assistant-chat';
    this.title.label = 'AI Assistant';
    this.title.closable = true;

    this._onSettingsClick = options.onSettingsClick;
    this._onMessageSend = options.onMessageSend;
    this._toolExecutionTracker = options.toolExecutionTracker;
    this._initialMessages = options.initialMessages;
    this._sessionManager = options.sessionManager;
    this._onSessionChange = options.onSessionChange;
    this._onNewSession = options.onNewSession;
    this._onMessagesChange = (callback) => {
      this._messagesCallback = callback;
    };
  }

  /**
   * Render the React component
   */
  render(): JSX.Element {
    return (
      <ChatComponent
        onSettingsClick={this._onSettingsClick}
        onMessageSend={this._onMessageSend}
        toolExecutionTracker={this._toolExecutionTracker}
        initialMessages={this._initialMessages}
        onMessagesChange={this._onMessagesChange}
        sessionManager={this._sessionManager}
        onSessionChange={this._onSessionChange}
        onNewSession={this._onNewSession}
      />
    );
  }

  /**
   * Add a message to the conversation (for backward compatibility)
   */
  addMessage(message: IMessage): void {
    console.log('Message added:', message);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    if (this._toolExecutionTracker) {
      this._toolExecutionTracker.clear();
      console.log('[ChatWidget] Cleared tool execution history');
    }
    console.log('Clear messages');
  }

  /**
   * Get the conversation history
   */
  getMessages(): IMessage[] {
    console.log('Get messages');
    return [];
  }
}
