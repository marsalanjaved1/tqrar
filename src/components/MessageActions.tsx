/**
 * Message Actions Component
 * Copy, Edit, and Regenerate buttons for messages
 */

import React from 'react';

export interface IMessageActionsProps {
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export const MessageActions: React.FC<IMessageActionsProps> = ({
  content,
  role,
  onEdit,
  onRegenerate
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className="jp-ChatMessage-actions">
      <button
        className="jp-ChatMessage-actionButton"
        onClick={handleCopy}
        title="Copy message"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      
      {role === 'user' && onEdit && (
        <button
          className="jp-ChatMessage-actionButton"
          onClick={onEdit}
          title="Edit message"
        >
          Edit
        </button>
      )}
      
      {role === 'assistant' && onRegenerate && (
        <button
          className="jp-ChatMessage-actionButton"
          onClick={onRegenerate}
          title="Regenerate response"
        >
          Regenerate
        </button>
      )}
    </div>
  );
};
