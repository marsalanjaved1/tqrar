/**
 * Context Pills Component
 * Displays attached files/folders as removable pills
 */

import React from 'react';

export interface IContextItem {
  id: string;
  type: 'file' | 'folder';
  name: string;
  path?: string;
}

export interface IContextPillsProps {
  items: IContextItem[];
  onRemove: (id: string) => void;
}

export const ContextPills: React.FC<IContextPillsProps> = ({ items, onRemove }) => {
  if (items.length === 0) {
    return null;
  }

  const getIcon = (type: 'file' | 'folder'): string => {
    return type === 'file' ? '📄' : '📁';
  };

  return (
    <div className="jp-ContextPills">
      {items.map(item => (
        <div key={item.id} className="jp-ContextPill">
          <span className="jp-ContextPill-icon">{getIcon(item.type)}</span>
          <span className="jp-ContextPill-name" title={item.path || item.name}>
            {item.name}
          </span>
          <button
            className="jp-ContextPill-remove"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
