/**
 * Debug Panel Component
 * Shows conversation flow in a user-readable format
 */

import React from 'react';
import { IMessage } from '../types';
import type { IToolExecutionEvent } from '../types';
import { cn } from '../utils/classNames';

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
      <button 
        className="tq-fixed tq-bottom-4 tq-right-4 tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-md tq-px-3 tq-py-2 tq-text-text-primary tq-text-sm tq-cursor-pointer tq-transition-colors hover:tq-bg-bg-hover tq-shadow-card tq-z-40"
        onClick={onToggle}
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="tq-fixed tq-bottom-4 tq-right-4 tq-w-96 tq-max-h-[600px] tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-md tq-shadow-dropdown tq-flex tq-flex-col tq-z-40">
      <div className="tq-flex tq-items-center tq-justify-between tq-p-3 tq-border-b tq-border-border-default">
        <h3 className="tq-text-md tq-font-semibold tq-text-text-primary">Conversation Flow</h3>
        <button 
          className="tq-text-text-muted hover:tq-text-text-primary tq-transition-colors tq-text-xl tq-leading-none"
          onClick={onToggle}
        >
          ✕
        </button>
      </div>
      <div className="tq-flex-1 tq-overflow-y-auto tq-p-3 tq-space-y-3 tq-scrollbar">
        {messages.map((message, index) => {
          if (message.role === 'system') return null;

          const tools = messageTools.get(index) || [];
          
          return (
            <div key={index} className="tq-bg-bg-tertiary tq-border tq-border-border-default tq-rounded tq-p-2">
              <div className={cn(
                'tq-text-sm tq-font-semibold tq-mb-2 tq-flex tq-items-center tq-gap-2',
                message.role === 'user' ? 'tq-text-accent-blue' : 'tq-text-success'
              )}>
                {message.role === 'user' ? '👤 User' : '🤖 Assistant'}
              </div>
              
              <div className="tq-text-sm tq-text-text-primary tq-mb-2">
                {message.content.substring(0, 100)}
                {message.content.length > 100 ? '...' : ''}
              </div>

              {tools.length > 0 && (
                <div className="tq-space-y-2 tq-mt-2">
                  {tools.map((tool, toolIndex) => (
                    <div key={tool.id} className="tq-bg-bg-primary tq-border tq-border-border-default tq-rounded tq-p-2">
                      <div className="tq-flex tq-items-center tq-justify-between tq-mb-1">
                        <div className="tq-text-xs tq-text-text-primary">
                          🔧 Tool Call: <strong>{tool.toolCall.function.name}</strong>
                        </div>
                        <span className={cn(
                          'tq-text-xs tq-px-1.5 tq-py-0.5 tq-rounded tq-font-semibold',
                          tool.status === 'success' && 'tq-bg-success-bg tq-text-success',
                          tool.status === 'error' && 'tq-bg-error-bg tq-text-error',
                          tool.status === 'running' && 'tq-bg-warning-bg tq-text-warning',
                          tool.status === 'pending' && 'tq-bg-pending-bg tq-text-pending'
                        )}>
                          {tool.status}
                        </span>
                      </div>
                      
                      {tool.result && (
                        <div className="tq-text-xs tq-text-success tq-mt-1">
                          ✓ Result: {(() => {
                            const resultStr = typeof tool.result === 'string' 
                              ? tool.result 
                              : JSON.stringify(tool.result);
                            return resultStr.substring(0, 80) + (resultStr.length > 80 ? '...' : '');
                          })()}
                        </div>
                      )}
                      
                      {tool.error && (
                        <div className="tq-text-xs tq-text-error tq-mt-1">
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
