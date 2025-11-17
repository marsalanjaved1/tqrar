/**
 * Debug Panel Component
 * Shows conversation flow in a user-readable format
 */

import React from 'react';
import { IMessage } from '../types';
import type { IToolExecutionEvent } from '../types';

interface IDebugPanelProps {
  messages: IMessage[];
  messageTools: Map<number, IToolExecutionEvent[]>;
  isOpen: boolean;
  onToggle: () => void;
}

export const DebugPanel: React.FC<IDebugPanelProps> = ({
  messages,
  messageTools,
  isOpen,
  onToggle
}) => {
  if (!isOpen) {
    return (
      <button className="jp-DebugPanel-toggle" onClick={onToggle}>
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="jp-DebugPanel">
      <div className="jp-DebugPanel-header">
        <h3>Conversation Flow</h3>
        <button onClick={onToggle}>✕</button>
      </div>
      <div className="jp-DebugPanel-content">
        {messages.map((message, index) => {
          if (message.role === 'system') return null;

          const tools = messageTools.get(index) || [];
          
          return (
            <div key={index} className="jp-DebugPanel-entry">
              <div className={`jp-DebugPanel-role jp-DebugPanel-role-${message.role}`}>
                {message.role === 'user' ? '👤 User' : '🤖 Assistant'}
              </div>
              
              <div className="jp-DebugPanel-message">
                {message.content.substring(0, 100)}
                {message.content.length > 100 ? '...' : ''}
              </div>

              {tools.length > 0 && (
                <div className="jp-DebugPanel-tools">
                  {tools.map((tool, toolIndex) => (
                    <div key={tool.id} className="jp-DebugPanel-tool">
                      <div className="jp-DebugPanel-toolHeader">
                        🔧 Tool Call: <strong>{tool.toolCall.function.name}</strong>
                        <span className={`jp-DebugPanel-status jp-DebugPanel-status-${tool.status}`}>
                          {tool.status}
                        </span>
                      </div>
                      
                      {tool.result && (
                        <div className="jp-DebugPanel-toolResult">
                          ✓ Result: {(() => {
                            const resultStr = typeof tool.result === 'string' 
                              ? tool.result 
                              : JSON.stringify(tool.result);
                            return resultStr.substring(0, 80) + (resultStr.length > 80 ? '...' : '');
                          })()}
                        </div>
                      )}
                      
                      {tool.error && (
                        <div className="jp-DebugPanel-toolError">
                          ✗ Error: {(() => {
                            const errorStr = typeof tool.error === 'string' 
                              ? tool.error 
                              : tool.error.message || JSON.stringify(tool.error);
                            return errorStr.substring(0, 80) + (errorStr.length > 80 ? '...' : '');
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
