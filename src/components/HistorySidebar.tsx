/**
 * History Sidebar Component
 * Shows list of all saved sessions
 */

import React from 'react';
import { ISession } from '../session';
import { cn } from '../utils/classNames';

export interface IHistorySidebarProps {
  sessions: ISession[];
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (id: string) => void;
  onSessionDelete: (id: string) => void;
}

export const HistorySidebar: React.FC<IHistorySidebarProps> = ({
  sessions,
  isOpen,
  onClose,
  onSessionSelect,
  onSessionDelete
}) => {
  if (!isOpen) {
    return null;
  }

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="tq-fixed tq-inset-0 tq-z-50 tq-flex tq-justify-end">
      <div 
        className="tq-absolute tq-inset-0 tq-bg-black tq-bg-opacity-50 tq-animate-fade-in" 
        onClick={onClose} 
      />
      <div className="tq-relative tq-w-80 tq-h-full tq-bg-bg-secondary tq-shadow-dropdown tq-flex tq-flex-col tq-animate-slide-in">
        <div className="tq-flex tq-items-center tq-justify-between tq-p-4 tq-border-b tq-border-border-default">
          <h3 className="tq-text-lg tq-font-semibold tq-text-text-primary">Chat History</h3>
          <button 
            className="tq-text-text-muted hover:tq-text-text-primary tq-transition-colors tq-text-2xl tq-leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="tq-flex-1 tq-overflow-y-auto tq-p-2 tq-scrollbar">
          {sessions.length === 0 ? (
            <div className="tq-text-center tq-text-text-muted tq-py-8">
              No chat history yet
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className="tq-p-3 tq-mb-2 tq-bg-bg-tertiary tq-rounded tq-cursor-pointer tq-transition-colors hover:tq-bg-bg-hover tq-border tq-border-border-default"
                onClick={() => {
                  onSessionSelect(session.id);
                  onClose();
                }}
              >
                <div className="tq-flex tq-items-start tq-justify-between tq-mb-2">
                  <span className="tq-text-text-primary tq-font-medium tq-flex-1 tq-truncate">{session.title}</span>
                  <button
                    className="tq-text-text-muted hover:tq-text-error tq-transition-colors tq-ml-2 tq-flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${session.title}"?`)) {
                        onSessionDelete(session.id);
                      }
                    }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
                <div className="tq-flex tq-gap-3 tq-text-xs tq-text-text-secondary tq-mb-2">
                  <span>{formatDate(session.updatedAt)}</span>
                  <span>{session.messageCount} messages</span>
                </div>
                {session.preview && (
                  <div className="tq-text-sm tq-text-text-muted tq-truncate">
                    {session.preview}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
