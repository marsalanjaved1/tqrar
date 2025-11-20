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
  // Log render state
  console.log('🏷️ [TABS] Rendering:', {
    activeSessionId,
    sessionCount: sessions.length,
    sessions: sessions.map(s => ({ id: s.id, title: s.title }))
  });
  
  // Don't show tabs if no active session
  if (!activeSessionId || sessions.length === 0) {
    console.log('🚫 [TABS] Not rendering (no active session or empty sessions)');
    return null;
  }

  return (
    <div className="jp-SessionTabs">
      {sessions.map(session => (
        <div
          key={session.id}
          className={`jp-SessionTab ${session.id === activeSessionId ? 'jp-SessionTab-active' : ''}`}
          onClick={() => {
            console.log('👆 [TABS] Tab clicked:', session.id);
            onSessionSelect(session.id);
          }}
        >
          <span className="jp-SessionTab-title">{session.title}</span>
          <button
            className="jp-SessionTab-close"
            onClick={(e) => {
              e.stopPropagation();
              console.log('❌ [TABS] Close button clicked:', session.id);
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
