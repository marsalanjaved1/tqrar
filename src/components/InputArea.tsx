/**
 * Input Area Component
 * Enhanced input with context pills and action buttons
 */

import React from 'react';
import { ContextPills, IContextItem } from './ContextPills';

export interface IInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  onAttachFile?: () => void;
  onAddContext?: () => void;
}

export const InputArea: React.FC<IInputAreaProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask Tqrar...',
  onAttachFile,
  onAddContext
}) => {
  const [contextItems, setContextItems] = React.useState<IContextItem[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const handleRemoveContext = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAttachFile = () => {
    // Demo: Add a sample file context
    const newItem: IContextItem = {
      id: `file-${Date.now()}`,
      type: 'file',
      name: 'notebook.ipynb',
      path: '/path/to/notebook.ipynb'
    };
    setContextItems(prev => [...prev, newItem]);
    onAttachFile?.();
  };

  const handleAddContext = () => {
    // Demo: Add a sample folder context
    const newItem: IContextItem = {
      id: `folder-${Date.now()}`,
      type: 'folder',
      name: 'data',
      path: '/path/to/data'
    };
    setContextItems(prev => [...prev, newItem]);
    onAddContext?.();
  };

  return (
    <div className="jp-InputArea">
      <ContextPills items={contextItems} onRemove={handleRemoveContext} />
      
      <div className="jp-InputContainer">
        <div className="jp-InputActions">
          <button
            className="jp-InputAction-button"
            onClick={handleAttachFile}
            title="Attach file"
            aria-label="Attach file"
            disabled={disabled}
          >
            📎
          </button>
          <button
            className="jp-InputAction-button"
            onClick={handleAddContext}
            title="Add context"
            aria-label="Add context"
            disabled={disabled}
          >
            @
          </button>
        </div>
        
        <textarea
          ref={textareaRef}
          className="jp-InputArea-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Message input"
        />
        
        <button
          className="jp-InputArea-send"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          title="Send message"
          aria-label="Send message"
        >
          <span className="jp-InputArea-sendIcon">↑</span>
        </button>
      </div>
    </div>
  );
};
