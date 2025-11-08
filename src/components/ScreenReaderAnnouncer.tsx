/**
 * Screen Reader Announcer Component
 * 
 * Provides live region announcements for screen readers
 * Used to announce dynamic content changes that are not otherwise announced
 */

import React, { useEffect, useRef } from 'react';

/**
 * Props for ScreenReaderAnnouncer component
 */
export interface IScreenReaderAnnouncerProps {
  /**
   * Message to announce to screen readers
   */
  message: string;

  /**
   * Politeness level for the announcement
   * - 'polite': Wait for current speech to finish (default)
   * - 'assertive': Interrupt current speech
   */
  politeness?: 'polite' | 'assertive';

  /**
   * Whether to clear the message after announcing
   * Useful for repeated announcements of the same message
   */
  clearAfterAnnounce?: boolean;

  /**
   * Delay in milliseconds before clearing the message
   */
  clearDelay?: number;
}

/**
 * ScreenReaderAnnouncer component
 * Announces messages to screen readers using ARIA live regions
 */
export const ScreenReaderAnnouncer: React.FC<IScreenReaderAnnouncerProps> = ({
  message,
  politeness = 'polite',
  clearAfterAnnounce = true,
  clearDelay = 1000
}) => {
  const [displayMessage, setDisplayMessage] = React.useState(message);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update the displayed message
    setDisplayMessage(message);

    // Clear the message after a delay if requested
    if (clearAfterAnnounce && message) {
      timeoutRef.current = setTimeout(() => {
        setDisplayMessage('');
      }, clearDelay);
    }

    // Cleanup timeout on unmount or message change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfterAnnounce, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="jp-sr-only"
    >
      {displayMessage}
    </div>
  );
};

/**
 * Hook for managing screen reader announcements
 * Provides a simple API for announcing messages
 * 
 * @returns Object with announce function
 */
export function useScreenReaderAnnouncer() {
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  }>({
    message: '',
    politeness: 'polite'
  });

  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite'): void => {
    setAnnouncement({ message, politeness });
  };

  const clear = (): void => {
    setAnnouncement({ message: '', politeness: 'polite' });
  };

  return {
    announcement,
    announce,
    clear
  };
}

/**
 * Export component and hook
 */
export default ScreenReaderAnnouncer;
