/**
 * History Sidebar Component
 * Shows list of all saved sessions
 */

import React from 'react';
import { ISession } from '../session';

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
    <div className="jp-HistorySidebar">
      <div className="jp-HistorySidebar-overlay" onClick={onClose} />
      <div className="jp-HistorySidebar-panel">
        <div className="jp-HistorySidebar-header">
          <h3>Chat History</h3>
          <button className="jp-HistorySidebar-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="jp-HistorySidebar-content">
          {sessions.length === 0 ? (
            <div className="jp-HistorySidebar-empty">
              No chat history yet
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className="jp-HistorySidebar-item"
                onClick={() => {
                  onSessionSelect(session.id);
                  onClose();
                }}
              >
                <div className="jp-HistorySidebar-itemHeader">
                  <span className="jp-HistorySidebar-itemTitle">{session.title}</span>
                  <button
                    className="jp-HistorySidebar-itemDelete"
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
                <div className="jp-HistorySidebar-itemMeta">
                  <span>{formatDate(session.updatedAt)}</span>
                  <span>{session.messageCount} messages</span>
                </div>
                {session.preview && (
                  <div className="jp-HistorySidebar-itemPreview">
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
