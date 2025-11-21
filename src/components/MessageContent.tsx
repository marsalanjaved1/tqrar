/**
 * Message Content Component with Markdown Formatting
 * Handles text formatting, code blocks, and inline code
 */

import React from 'react';

export interface IMessageContentProps {
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
}

export const MessageContent: React.FC<IMessageContentProps> = ({ content, role }) => {
  const formatContent = (text: string): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    let currentIndex = 0;
    let keyCounter = 0;

    // Match code blocks with optional language
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > currentIndex) {
        const beforeText = text.substring(currentIndex, match.index);
        elements.push(
          <span key={`text-${keyCounter++}`}>
            {formatInlineContent(beforeText)}
          </span>
        );
      }

      // Add code block
      const language = match[1] || 'code';
      const code = match[2].trim();
      elements.push(
        <CodeBlock key={`code-${keyCounter++}`} language={language} code={code} />
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      elements.push(
        <span key={`text-${keyCounter++}`}>
          {formatInlineContent(remainingText)}
        </span>
      );
    }

    return elements.length > 0 ? elements : [<span key="empty">{text}</span>];
  };

  const formatInlineContent = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    let keyCounter = 0;

    // Match inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      // Add text before inline code
      if (match.index > currentIndex) {
        const beforeText = text.substring(currentIndex, match.index);
        parts.push(...formatBoldText(beforeText, keyCounter));
        keyCounter += beforeText.split('**').length;
      }

      // Add inline code
      parts.push(
        <code key={`inline-${keyCounter++}`} className="tq-code-inline">
          {match[1]}
        </code>
      );

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      parts.push(...formatBoldText(remainingText, keyCounter));
    }

    return parts.length > 0 ? parts : [text];
  };

  const formatBoldText = (text: string, startKey: number): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    let keyCounter = startKey;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${keyCounter++}`}>{match[1]}</strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={`jp-ChatMessage-text jp-ChatMessage-text-${role}`}>
      {formatContent(content)}
    </div>
  );
};

interface ICodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<ICodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <pre className="tq-code-block">
      <div className="tq-code-header">
        <span className="tq-text-text-secondary">{language}</span>
        <button
          className="tq-text-text-secondary hover:tq-text-text-primary tq-transition-colors tq-cursor-pointer tq-bg-transparent tq-border-none tq-text-xs"
          onClick={handleCopy}
          title="Copy code"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <code className="tq-block tq-p-3 tq-font-mono tq-text-sm tq-text-text-primary tq-overflow-x-auto tq-whitespace-pre">{code}</code>
    </pre>
  );
};
