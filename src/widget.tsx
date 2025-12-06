/**
 * Chat widget for AI Assistant with custom chat interface
 */

import { ReactWidget } from '@jupyterlab/apputils';
import { IMessage, IExecutionSettings, ExecutionMode, IToolCall } from './types';
import { settingsIcon } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IStateDB } from '@jupyterlab/statedb';
import React from 'react';
import { ToolExecutionTracker } from './tools/ToolExecutionTracker';
import { ChatInterface } from './components/ChatInterface';
import { SessionTabs } from './components/SessionTabs';
import { HistorySidebar } from './components/HistorySidebar';
import { SessionManager, ISession } from './session';

// CSS is imported via style/index.js (Tailwind-generated)
// Import CSS
// import '../style/widget.css';
// import '../style/chat-interface.css';
// import '../style/tool-execution.css';
// import '../style/sessions.css';

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
  onMessageSend?: (content: string, executionSettings: IExecutionSettings) => Promise<AsyncGenerator<string>>;

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

  /**
   * StateDB for persisting execution settings
   */
  stateDB?: IStateDB;

  /**
   * Callback to subscribe to pending tools changes (for manual mode approval)
   */
  onPendingToolsChange?: (callback: (toolCalls: IToolCall[] | null) => void) => void;

  /**
   * Callback to approve pending tools
   */
  onApprovePendingTools?: () => void;

  /**
   * Callback to reject pending tools
   */
  onRejectPendingTools?: () => void;

  /**
   * Callback when model is changed
   */
  onModelChange?: (config: { provider: string; model: string }) => void;

  /**
   * Get current model config
   */
  getCurrentModel?: () => { provider: string; model: string };
}

/**
 * React component for the chat interface
 */
const ChatComponent: React.FC<{
  onSettingsClick?: () => void;
  onMessageSend?: (content: string, executionSettings: IExecutionSettings) => Promise<AsyncGenerator<string>>;
  toolExecutionTracker?: ToolExecutionTracker;
  initialMessages?: IMessage[];
  onMessagesChange?: (callback: (messages: IMessage[]) => void) => void;
  sessionManager?: SessionManager;
  onSessionChange?: (sessionId: string) => void;
  onNewSession?: () => void;
  executionSettings?: IExecutionSettings;
  onExecutionSettingsChange?: (settings: IExecutionSettings) => void;
  onPendingToolsChange?: (callback: (toolCalls: IToolCall[] | null) => void) => void;
  onApprovePendingTools?: () => void;
  onRejectPendingTools?: () => void;
  onModelChange?: (config: { provider: string; model: string }) => void;
  getCurrentModel?: () => { provider: string; model: string };
  initialModel?: { provider: string; model: string };
  onModelCallbackRegister?: (callback: (model: { provider: string; model: string }) => void) => void;
}> = ({ 
  onSettingsClick, 
  onMessageSend, 
  toolExecutionTracker, 
  initialMessages = [], 
  onMessagesChange, 
  sessionManager, 
  onSessionChange, 
  onNewSession, 
  executionSettings, 
  onExecutionSettingsChange,
  onPendingToolsChange,
  onApprovePendingTools,
  onRejectPendingTools,
  onModelChange,
  getCurrentModel,
  initialModel,
  onModelCallbackRegister
}) => {
  const [messages, setMessages] = React.useState<IMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<string>('');
  const [streamingSessionId, setStreamingSessionId] = React.useState<string | null>(null); // Which session is streaming
  const baseMessagesRef = React.useRef<IMessage[]>(initialMessages);
  const [allSessions, setAllSessions] = React.useState<ISession[]>([]);
  const [openSessions, setOpenSessions] = React.useState<ISession[]>([]); // Multiple open tabs
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [pendingToolCalls, setPendingToolCalls] = React.useState<IToolCall[] | null>(null);
  const [currentModel, setCurrentModel] = React.useState<{ provider: string; model: string }>(
    initialModel || { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
  );
  
  // Store messages for each open session
  const sessionMessagesRef = React.useRef<Map<string, IMessage[]>>(new Map());
  
  // Check if current active session is streaming
  const isActiveSessionStreaming = isStreaming && streamingSessionId === activeSessionId;

  // Subscribe to pending tools changes for manual mode approval
  React.useEffect(() => {
    if (onPendingToolsChange) {
      onPendingToolsChange((toolCalls) => {
        console.log('[ChatComponent] Pending tools changed:', toolCalls?.length || 0);
        setPendingToolCalls(toolCalls);
      });
    }
  }, [onPendingToolsChange]);

  // Register model change callback to receive updates from widget
  React.useEffect(() => {
    if (onModelCallbackRegister) {
      onModelCallbackRegister((model) => {
        console.log('[ChatComponent] Model updated from widget:', model);
        setCurrentModel(model);
      });
    }
  }, [onModelCallbackRegister]);

  // Handle model change
  const handleModelChange = React.useCallback((config: { provider: string; model: string }) => {
    console.log('[ChatComponent] Model changed:', config);
    setCurrentModel(config);
    onModelChange?.(config);
  }, [onModelChange]);

  // Handle tool approval
  const handleApproveToolCall = React.useCallback((toolCallId: string) => {
    console.log('[ChatComponent] Approving tool:', toolCallId);
    // For now, approve all - individual approval would need more complex state
    onApprovePendingTools?.();
  }, [onApprovePendingTools]);

  const handleRejectToolCall = React.useCallback((toolCallId: string) => {
    console.log('[ChatComponent] Rejecting tool:', toolCallId);
    // For now, reject all - individual rejection would need more complex state
    onRejectPendingTools?.();
  }, [onRejectPendingTools]);

  const handleApproveAllToolCalls = React.useCallback(() => {
    console.log('[ChatComponent] Approving all tools');
    onApprovePendingTools?.();
  }, [onApprovePendingTools]);

  const handleRejectAllToolCalls = React.useCallback(() => {
    console.log('[ChatComponent] Rejecting all tools');
    onRejectPendingTools?.();
  }, [onRejectPendingTools]);

  // Helper to refresh sessions list
  const refreshSessions = React.useCallback(() => {
    if (sessionManager) {
      const sessions = sessionManager.getAllSessions();
      setAllSessions(sessions);
      console.log('🔄 [SESSION] Refreshed sessions list:', {
        count: sessions.length,
        sessions: sessions.map(s => ({ id: s.id, title: s.title, messageCount: s.messageCount }))
      });
    }
  }, [sessionManager]);

  // Load sessions list on mount and restore active session if exists
  React.useEffect(() => {
    console.log('🚀 [SESSION] Component mounted, initializing...');
    if (sessionManager) {
      const loadSessions = async () => {
        try {
          console.log('⏳ [SESSION] Waiting for session manager to initialize...');
          // Wait a bit for session manager to initialize
          await new Promise(resolve => setTimeout(resolve, 300));
          
          console.log('📂 [SESSION] Loading sessions from storage...');
          refreshSessions();
          
          // Check if there's an active session to restore
          const activeId = sessionManager.getActiveSessionId();
          if (activeId) {
            console.log('🔄 [SESSION] Found active session to restore:', activeId);
            // Load the session and open it as a tab
            await handleSessionSelect(activeId);
          } else {
            console.log('✅ [SESSION] Initial load complete - no active session to restore');
          }
        } catch (error) {
          console.error('❌ [SESSION] Failed to load sessions:', error);
        }
      };
      loadSessions();
    } else {
      console.warn('⚠️ [SESSION] No session manager available');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionManager]);

  // Subscribe to messages changes from conversation manager
  React.useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange((newMessages) => {
        console.log('💬 [SESSION] Messages updated:', {
          count: newMessages.length,
          activeSessionId,
          isStreaming,
          streamingSessionId
        });
        baseMessagesRef.current = newMessages;
        
        // Cache messages for the active session
        if (activeSessionId) {
          sessionMessagesRef.current.set(activeSessionId, newMessages);
          console.log('💾 [SESSION] Cached messages for session:', activeSessionId);
        }
        
        // If not streaming for this session, update messages directly
        if (!isActiveSessionStreaming) {
          setMessages(newMessages);
        }
        
        // Update session with new messages ONLY if there's an active session
        // This prevents saving empty messages when closing tabs
        if (sessionManager && activeSessionId) {
          console.log('💾 [SESSION] Saving messages to session:', activeSessionId);
          sessionManager.updateSession(activeSessionId, newMessages)
            .then(() => {
              console.log('✅ [SESSION] Session updated successfully');
              // Refresh sessions list to update metadata (title, preview, message count)
              refreshSessions();
              
              // Update the session in openSessions array to reflect new title
              setOpenSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                  const updated = allSessions.find(as => as.id === activeSessionId);
                  return updated || s;
                }
                return s;
              }));
            })
            .catch(error => {
              console.error('❌ [SESSION] Failed to update session:', error);
            });
        } else if (!activeSessionId && newMessages.length > 0) {
          console.warn('⚠️ [SESSION] Messages updated but no active session - not saving');
        }
      });
    }
  }, [onMessagesChange, isActiveSessionStreaming, sessionManager, activeSessionId, refreshSessions, allSessions]);

  // Merge streaming content with base messages (only for active session)
  React.useEffect(() => {
    if (isActiveSessionStreaming && streamingContent) {
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
  }, [isActiveSessionStreaming, streamingContent, isStreaming]);

  const handleNewSession = async () => {
    console.log('➕ [SESSION] New session button clicked');
    
    if (!sessionManager) {
      console.warn('⚠️ [SESSION] No session manager - clearing UI only');
      // No session manager - just clear UI
      setActiveSessionId(null);
      setMessages([]);
      baseMessagesRef.current = [];
      
      if (onNewSession) {
        onNewSession();
      }
      return;
    }
    
    console.log('🆕 [SESSION] Creating new session...');
    // Create new session immediately
    const newSession = await sessionManager.createSession('New Chat');
    console.log('✅ [SESSION] New session created:', {
      id: newSession.id,
      title: newSession.title
    });
    
    // Add to open sessions
    setOpenSessions(prev => [...prev, newSession]);
    console.log('📂 [SESSION] Added to open sessions, total:', openSessions.length + 1);
    
    // Initialize empty messages for this session
    sessionMessagesRef.current.set(newSession.id, []);
    
    // Set as active
    setActiveSessionId(newSession.id);
    await sessionManager.setActiveSession(newSession.id);
    console.log('🎯 [SESSION] Set as active session');
    
    // Clear messages
    setMessages([]);
    baseMessagesRef.current = [];
    console.log('🧹 [SESSION] Cleared messages');
    
    // Refresh sessions list
    refreshSessions();
    
    if (onNewSession) {
      onNewSession();
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    console.log('🔍 [SESSION] Selecting session:', sessionId);
    
    if (!sessionManager) {
      console.warn('⚠️ [SESSION] No session manager available');
      return;
    }
    
    // Check if session is already open
    const isAlreadyOpen = openSessions.find(s => s.id === sessionId);
    
    if (isAlreadyOpen) {
      // Just switch to it
      console.log('↪️ [SESSION] Session already open, switching to it');
      setActiveSessionId(sessionId);
      await sessionManager.setActiveSession(sessionId);
      
      // Load messages for this session
      const cachedMessages = sessionMessagesRef.current.get(sessionId) || [];
      setMessages(cachedMessages);
      baseMessagesRef.current = cachedMessages;
      
      if (onSessionChange) {
        onSessionChange(sessionId);
      }
      return;
    }
    
    // Load session from storage
    console.log('📖 [SESSION] Loading session from storage...');
    const session = await sessionManager.getSession(sessionId);
    if (session) {
      console.log('✅ [SESSION] Session loaded:', {
        id: session.id,
        title: session.title,
        messageCount: session.messages.length
      });
      
      // Add to open sessions
      setOpenSessions(prev => [...prev, session]);
      console.log('📂 [SESSION] Added to open sessions, total:', openSessions.length + 1);
      
      // Cache messages for this session
      sessionMessagesRef.current.set(sessionId, session.messages);
      
      // Set as active
      setActiveSessionId(sessionId);
      await sessionManager.setActiveSession(sessionId);
      console.log('🎯 [SESSION] Set as active session');
      
      // Load session messages
      setMessages(session.messages);
      baseMessagesRef.current = session.messages;
      console.log('💬 [SESSION] Loaded messages into UI');
      
      // Refresh sessions to ensure UI is in sync
      refreshSessions();
      
      if (onSessionChange) {
        onSessionChange(sessionId);
      }
    } else {
      console.error('❌ [SESSION] Session not found:', sessionId);
    }
  };

  const handleSessionClose = async (sessionId: string) => {
    console.log('❌ [SESSION] Closing session tab:', sessionId);
    
    // Remove from open sessions
    setOpenSessions(prev => prev.filter(s => s.id !== sessionId));
    console.log('📂 [SESSION] Removed from open sessions');
    
    // Remove cached messages
    sessionMessagesRef.current.delete(sessionId);
    
    // If closing active session, switch to another or show welcome
    if (sessionId === activeSessionId) {
      console.log('🔄 [SESSION] Closing active session, need to switch...');
      
      // Find other open sessions
      const otherOpenSessions = openSessions.filter(s => s.id !== sessionId);
      
      if (otherOpenSessions.length > 0) {
        // Switch to the first other open session
        console.log('↪️ [SESSION] Switching to other open session:', otherOpenSessions[0].id);
        await handleSessionSelect(otherOpenSessions[0].id);
      } else {
        // No other open sessions - clear UI
        console.log('🧹 [SESSION] No other open sessions, clearing UI...');
        
        // Clear active session FIRST
        setActiveSessionId(null);
        
        // Notify conversation manager to clear
        if (onNewSession) {
          onNewSession();
        }
        
        // Clear messages in UI
        setMessages([]);
        baseMessagesRef.current = [];
        
        console.log('✅ [SESSION] All tabs closed, showing welcome screen');
      }
    }
    
    // Note: We don't delete the session here, just close the tab
    // Session remains in history and can be reopened
  };

  const handleSessionDelete = async (sessionId: string) => {
    console.log('🗑️ [SESSION] Deleting session:', sessionId);
    
    if (!sessionManager) {
      console.warn('⚠️ [SESSION] No session manager available');
      return;
    }
    
    await sessionManager.deleteSession(sessionId);
    console.log('✅ [SESSION] Session deleted from storage');
    
    // Refresh sessions list
    refreshSessions();
    
    // Close the session tab if it was open
    await handleSessionClose(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    console.log('📤 [SESSION] Sending message:', content.substring(0, 50) + '...');
    
    if (!onMessageSend) {
      console.warn('⚠️ [SESSION] No message handler configured');
      // Add demo message if no handler
      const demoMessage: IMessage = {
        role: 'assistant',
        content: 'AI Assistant is not configured. Please click the settings icon to configure your API key.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, demoMessage]);
      return;
    }

    // Create new session if none is active (shouldn't happen, but safety check)
    if (!activeSessionId && sessionManager) {
      console.log('⚠️ [SESSION] No active session, creating one...');
      await handleNewSession();
    }

    // Store which session is streaming
    const currentSessionId = activeSessionId;
    console.log('🎯 [SESSION] Streaming for session:', currentSessionId);

    console.log('💬 [SESSION] Adding user message to UI');
    // Add user message immediately
    const userMessage: IMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    baseMessagesRef.current = [...baseMessagesRef.current, userMessage];
    setMessages([...baseMessagesRef.current]);

    // Stream assistant response
    console.log('🌊 [SESSION] Starting streaming response...');
    setIsStreaming(true);
    setStreamingSessionId(currentSessionId);
    setStreamingContent('');
    
    try {
      const stream = await onMessageSend(content, executionSettings || { mode: 'act', autoMode: true });
      let accumulatedContent = '';
      
      // Stream chunks and update UI in real-time
      for await (const chunk of stream) {
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }
      console.log('✅ [SESSION] Streaming complete');
    } catch (error) {
      console.error('❌ [SESSION] Error streaming response:', error);
    } finally {
      setIsStreaming(false);
      setStreamingSessionId(null);
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

      {/* Session Tabs - show all open sessions */}
      <SessionTabs
        sessions={openSessions}
        activeSessionId={activeSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionClose={handleSessionClose}
      />

      {/* Chat interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isStreaming={isActiveSessionStreaming}
        toolExecutionTracker={toolExecutionTracker}
        executionSettings={executionSettings}
        onExecutionSettingsChange={onExecutionSettingsChange}
        // Pending tool approvals (when autopilot is off)
        pendingToolCalls={pendingToolCalls || []}
        onApproveToolCall={handleApproveToolCall}
        onRejectToolCall={handleRejectToolCall}
        onApproveAllToolCalls={handleApproveAllToolCalls}
        onRejectAllToolCalls={handleRejectAllToolCalls}
        // Model selection
        currentModel={currentModel}
        onModelChange={handleModelChange}
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
  private _onMessageSend?: (content: string, executionSettings: IExecutionSettings) => Promise<AsyncGenerator<string>>;
  private _toolExecutionTracker?: ToolExecutionTracker;
  private _initialMessages?: IMessage[];
  private _onMessagesChange?: (callback: (messages: IMessage[]) => void) => void;
  public _messagesCallback?: (messages: IMessage[]) => void;
  private _sessionManager?: SessionManager;
  private _onSessionChange?: (sessionId: string) => void;
  private _onNewSession?: () => void;
  private _stateDB?: IStateDB;
  private _executionSettings: IExecutionSettings = {
    mode: 'act',
    autoMode: true
  };
  
  // Pending tools approval callbacks
  private _onPendingToolsChange?: (callback: (toolCalls: IToolCall[] | null) => void) => void;
  private _pendingToolsCallback?: (toolCalls: IToolCall[] | null) => void;
  private _onApprovePendingTools?: () => void;
  private _onRejectPendingTools?: () => void;
  private _onModelChange?: (config: { provider: string; model: string }) => void;
  private _getCurrentModel?: () => { provider: string; model: string };
  
  // Current model state (persisted)
  private _currentModel: { provider: string; model: string } = {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022'
  };
  private _modelChangeCallback?: (model: { provider: string; model: string }) => void;

  /**
   * StateDB key for storing execution settings
   */
  private static readonly EXECUTION_SETTINGS_KEY = 'ai-assistant:execution-settings';
  
  /**
   * StateDB key for storing model selection
   */
  private static readonly MODEL_SETTINGS_KEY = 'ai-assistant:model-settings';

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
    this._stateDB = options.stateDB;
    this._onMessagesChange = (callback) => {
      this._messagesCallback = callback;
    };
    
    // Pending tools approval callbacks
    this._onPendingToolsChange = options.onPendingToolsChange ? (callback) => {
      this._pendingToolsCallback = callback;
      options.onPendingToolsChange!(callback);
    } : (callback) => {
      this._pendingToolsCallback = callback;
    };
    this._onApprovePendingTools = options.onApprovePendingTools;
    this._onRejectPendingTools = options.onRejectPendingTools;
    
    // Model change - wrap to also persist and update internal state
    this._onModelChange = (config) => {
      console.log('[ChatWidget] Model change requested:', config);
      this._currentModel = config;
      this._saveModelSettings().catch(err => console.error('[ChatWidget] Failed to save model:', err));
      options.onModelChange?.(config);
      // Notify UI of model change
      this._modelChangeCallback?.(config);
    };
    
    // Get current model - return our persisted state
    this._getCurrentModel = () => {
      // Try to get from conversation manager first (if available)
      const fromManager = options.getCurrentModel?.();
      if (fromManager && fromManager.model) {
        return fromManager;
      }
      return this._currentModel;
    };

    // Load execution settings and model from StateDB
    this._loadExecutionSettings().catch(error => {
      console.error('[ChatWidget] Failed to load execution settings:', error);
    });
    this._loadModelSettings().catch(error => {
      console.error('[ChatWidget] Failed to load model settings:', error);
    });
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
        executionSettings={this._executionSettings}
        onExecutionSettingsChange={(settings) => this._handleExecutionSettingsChange(settings)}
        onPendingToolsChange={this._onPendingToolsChange}
        onApprovePendingTools={this._onApprovePendingTools}
        onRejectPendingTools={this._onRejectPendingTools}
        onModelChange={this._onModelChange}
        getCurrentModel={this._getCurrentModel}
        initialModel={this._currentModel}
        onModelCallbackRegister={(cb) => this.setModelChangeCallback(cb)}
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

  /**
   * Get current execution settings
   */
  getExecutionSettings(): IExecutionSettings {
    return { ...this._executionSettings };
  }

  /**
   * Update execution settings
   */
  async updateExecutionSettings(settings: Partial<IExecutionSettings>): Promise<void> {
    this._executionSettings = {
      ...this._executionSettings,
      ...settings
    };

    console.log('[ChatWidget] Execution settings updated:', this._executionSettings);

    // Persist to StateDB
    await this._saveExecutionSettings();

    // Trigger re-render if needed
    this.update();
  }

  /**
   * Handle execution settings changes from ChatInterface
   */
  private _handleExecutionSettingsChange(settings: IExecutionSettings): void {
    this._executionSettings = settings;
    console.log('[ChatWidget] Execution settings changed from UI:', this._executionSettings);

    // Persist to StateDB
    this._saveExecutionSettings().catch(error => {
      console.error('[ChatWidget] Failed to save execution settings:', error);
    });

    // Trigger re-render to update UI
    this.update();
  }

  /**
   * Load execution settings from StateDB
   */
  private async _loadExecutionSettings(): Promise<void> {
    if (!this._stateDB) {
      console.log('[ChatWidget] No StateDB available, using default execution settings');
      return;
    }

    try {
      const data = await this._stateDB.fetch(ChatWidget.EXECUTION_SETTINGS_KEY);
      
      if (data && typeof data === 'object' && data !== null) {
        const settings = data as any;
        // Validate and extract execution settings
        if ('mode' in settings && 'autoMode' in settings) {
          this._executionSettings = {
            mode: settings.mode as ExecutionMode,
            autoMode: Boolean(settings.autoMode)
          };
          console.log('[ChatWidget] Loaded execution settings from StateDB:', this._executionSettings);
        } else {
          console.log('[ChatWidget] Invalid execution settings format, using defaults');
        }
      } else {
        console.log('[ChatWidget] No saved execution settings, using defaults');
      }
    } catch (error) {
      console.error('[ChatWidget] Failed to load execution settings:', error);
      // Continue with default settings
    }
  }

  /**
   * Save execution settings to StateDB
   */
  private async _saveExecutionSettings(): Promise<void> {
    if (!this._stateDB) {
      console.log('[ChatWidget] No StateDB available, skipping save');
      return;
    }

    try {
      await this._stateDB.save(ChatWidget.EXECUTION_SETTINGS_KEY, this._executionSettings as any);
      console.log('[ChatWidget] Saved execution settings to StateDB');
    } catch (error) {
      console.error('[ChatWidget] Failed to save execution settings:', error);
      // Continue with in-memory state
    }
  }

  /**
   * Load model settings from StateDB
   */
  private async _loadModelSettings(): Promise<void> {
    if (!this._stateDB) {
      console.log('[ChatWidget] No StateDB available, using default model');
      return;
    }

    try {
      const data = await this._stateDB.fetch(ChatWidget.MODEL_SETTINGS_KEY);
      
      if (data && typeof data === 'object' && data !== null) {
        const settings = data as any;
        if ('provider' in settings && 'model' in settings) {
          this._currentModel = {
            provider: settings.provider,
            model: settings.model
          };
          console.log('[ChatWidget] Loaded model settings from StateDB:', this._currentModel);
          // Notify UI of loaded model
          this._modelChangeCallback?.(this._currentModel);
        }
      }
    } catch (error) {
      console.error('[ChatWidget] Failed to load model settings:', error);
    }
  }

  /**
   * Save model settings to StateDB
   */
  private async _saveModelSettings(): Promise<void> {
    if (!this._stateDB) {
      console.log('[ChatWidget] No StateDB available, skipping model save');
      return;
    }

    try {
      await this._stateDB.save(ChatWidget.MODEL_SETTINGS_KEY, this._currentModel as any);
      console.log('[ChatWidget] Saved model settings to StateDB:', this._currentModel);
    } catch (error) {
      console.error('[ChatWidget] Failed to save model settings:', error);
    }
  }

  /**
   * Set callback for model changes (called from React component)
   */
  setModelChangeCallback(callback: (model: { provider: string; model: string }) => void): void {
    this._modelChangeCallback = callback;
    // Immediately notify with current model
    callback(this._currentModel);
  }

  /**
   * Get current model
   */
  getCurrentModel(): { provider: string; model: string } {
    return { ...this._currentModel };
  }
}
