/**
 * Session Tabs Component
 * Shows active sessions as tabs
 */

import React from 'react';
import { ISession } from '../session';

export interface ISessionTabsProps {
  sessions: ISession[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onSessionClose: (id: string) => void;
}

export const SessionTabs: React.FC<ISessionTabsProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionClose
}) => {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="jp-SessionTabs">
      {sessions.map(session => (
        <div
          key={session.id}
          className={`jp-SessionTab ${session.id === activeSessionId ? 'jp-SessionTab-active' : ''}`}
          onClick={() => onSessionSelect(session.id)}
        >
          <span className="jp-SessionTab-title">{session.title}</span>
          <button
            className="jp-SessionTab-close"
            onClick={(e) => {
              e.stopPropagation();
              onSessionClose(session.id);
            }}
            title="Close session"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
