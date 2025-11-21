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
    <div className="tq-flex tq-gap-1 tq-mt-2 tq-opacity-0 tq-transition-opacity group-hover:tq-opacity-100">
      <button
        className="tq-btn-secondary"
        onClick={handleCopy}
        title="Copy message"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      
      {role === 'user' && onEdit && (
        <button
          className="tq-btn-secondary"
          onClick={onEdit}
          title="Edit message"
        >
          Edit
        </button>
      )}
      
      {role === 'assistant' && onRegenerate && (
        <button
          className="tq-btn-secondary"
          onClick={onRegenerate}
          title="Regenerate response"
        >
          Regenerate
        </button>
      )}
    </div>
  );
};
