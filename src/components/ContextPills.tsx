/**
 * Context Pills Component
 * Displays attached files/folders as removable pills
 */

import React from 'react';
import { cn } from '../utils/classNames';

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
    <div className="tq-flex tq-flex-wrap tq-gap-1.5 tq-mb-2 tq-min-h-0">
      {items.map(item => (
        <div key={item.id} className="tq-context-pill">
          <span className="tq-text-text-secondary tq-text-xs tq-leading-none">
            {getIcon(item.type)}
          </span>
          <span 
            className="tq-max-w-[150px] tq-overflow-hidden tq-text-ellipsis tq-whitespace-nowrap" 
            title={item.path || item.name}
          >
            {item.name}
          </span>
          <button
            className={cn(
              'tq-bg-transparent tq-border-none tq-text-text-secondary tq-cursor-pointer',
              'tq-text-sm tq-leading-none tq-p-0 tq-ml-0.5 tq-transition-colors',
              'hover:tq-text-text-primary'
            )}
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
