/**
 * Collapsible Section Component
 * 
 * A reusable component for expandable/collapsible content sections
 * with smooth animations and full accessibility support
 */

import React, { useRef, useEffect, useState } from 'react';

/**
 * Props for CollapsibleSection component
 */
export interface ICollapsibleSectionProps {
  /**
   * Title text for the section header
   */
  title: string;

  /**
   * Content to display when expanded
   */
  children: React.ReactNode;

  /**
   * Whether the section is initially expanded (default: false)
   */
  defaultExpanded?: boolean;

  /**
   * Controlled expanded state (optional)
   */
  expanded?: boolean;

  /**
   * Callback when expanded state changes
   */
  onToggle?: (expanded: boolean) => void;

  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Optional CSS class name for the header
   */
  headerClassName?: string;

  /**
   * Optional CSS class name for the content
   */
  contentClassName?: string;

  /**
   * Optional icon to show when collapsed
   */
  collapsedIcon?: string;

  /**
   * Optional icon to show when expanded
   */
  expandedIcon?: string;

  /**
   * Whether to animate the expand/collapse (default: true)
   */
  animated?: boolean;

  /**
   * Animation duration in milliseconds (default: 200)
   */
  animationDuration?: number;

  /**
   * Unique ID for ARIA attributes (auto-generated if not provided)
   */
  id?: string;
}

/**
 * CollapsibleSection component
 * Provides an accessible, animated collapsible section
 */
export const CollapsibleSection: React.FC<ICollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  className = '',
  headerClassName = '',
  contentClassName = '',
  collapsedIcon = '▶',
  expandedIcon = '▼',
  animated = true,
  animationDuration = 200,
  id: providedId
}) => {
  // Generate unique ID for ARIA attributes
  const [id] = useState(() => providedId || `collapsible-${Math.random().toString(36).substr(2, 9)}`);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = controlledExpanded !== undefined;
  
  // Internal state for uncontrolled mode
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  
  // Use controlled or internal state
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  
  // Refs for animation
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Handle toggle button click
   */
  const handleToggle = (): void => {
    const newExpanded = !isExpanded;
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalExpanded(newExpanded);
    }
    
    // Call callback if provided
    if (onToggle) {
      onToggle(newExpanded);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    // Enter and Space toggle the section
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
    
    // Escape collapses the section
    if (event.key === 'Escape' && isExpanded) {
      event.preventDefault();
      handleToggle();
    }
  };

  /**
   * Measure content height for animation
   */
  useEffect(() => {
    if (!animated || !contentRef.current) {
      return;
    }

    const measureHeight = (): void => {
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight;
        setContentHeight(height);
      }
    };

    // Measure on mount and when children change
    measureHeight();

    // Re-measure on window resize
    window.addEventListener('resize', measureHeight);
    return () => window.removeEventListener('resize', measureHeight);
  }, [children, animated]);

  /**
   * Handle expand/collapse animation
   */
  useEffect(() => {
    if (!animated || !contentRef.current) {
      return;
    }

    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, animationDuration);

    return () => clearTimeout(timer);
  }, [isExpanded, animated, animationDuration]);

  /**
   * Get content style for animation
   */
  const getContentStyle = (): React.CSSProperties => {
    if (!animated) {
      return isExpanded ? {} : { display: 'none' };
    }

    const baseStyle: React.CSSProperties = {
      overflow: 'hidden',
      transition: `max-height ${animationDuration}ms ease-in-out, opacity ${animationDuration}ms ease-in-out`
    };

    if (isExpanded) {
      return {
        ...baseStyle,
        maxHeight: contentHeight === 'auto' ? '100vh' : `${contentHeight}px`,
        opacity: 1
      };
    } else {
      return {
        ...baseStyle,
        maxHeight: 0,
        opacity: 0
      };
    }
  };

  return (
    <div
      className={`jp-CollapsibleSection ${className} ${isExpanded ? 'jp-CollapsibleSection-expanded' : 'jp-CollapsibleSection-collapsed'}`}
      data-animating={isAnimating}
    >
      {/* Header button */}
      <button
        className={`jp-CollapsibleSection-header ${headerClassName}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-controls={`${id}-content`}
        type="button"
      >
        <span
          className="jp-CollapsibleSection-icon"
          aria-hidden="true"
        >
          {isExpanded ? expandedIcon : collapsedIcon}
        </span>
        <span className="jp-CollapsibleSection-title">
          {title}
        </span>
      </button>

      {/* Content area */}
      <div
        id={`${id}-content`}
        ref={contentRef}
        className={`jp-CollapsibleSection-content ${contentClassName}`}
        style={getContentStyle()}
        role="region"
        aria-labelledby={`${id}-header`}
        aria-hidden={!isExpanded}
      >
        <div className="jp-CollapsibleSection-contentInner">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing multiple collapsible sections
 * Useful for accordion-style behavior where only one section is open at a time
 * 
 * @param defaultOpenIndex - Index of the section that should be open by default
 * @returns Object with expanded states and toggle function
 */
export function useCollapsibleSections(defaultOpenIndex: number = -1) {
  const [openIndex, setOpenIndex] = useState<number>(defaultOpenIndex);

  const isExpanded = (index: number): boolean => {
    return openIndex === index;
  };

  const toggle = (index: number): void => {
    setOpenIndex(current => current === index ? -1 : index);
  };

  const expand = (index: number): void => {
    setOpenIndex(index);
  };

  const collapse = (): void => {
    setOpenIndex(-1);
  };

  const expandAll = (count: number): void => {
    // For accordion behavior, this doesn't make sense
    // But we can expand the first section
    setOpenIndex(0);
  };

  return {
    openIndex,
    isExpanded,
    toggle,
    expand,
    collapse,
    expandAll
  };
}

/**
 * Hook for managing independent collapsible sections
 * Each section can be opened/closed independently
 * 
 * @param count - Number of sections
 * @param defaultExpanded - Array of booleans indicating initial expanded state
 * @returns Object with expanded states and toggle functions
 */
export function useIndependentCollapsibleSections(
  count: number,
  defaultExpanded?: boolean[]
) {
  const [expandedStates, setExpandedStates] = useState<boolean[]>(() => {
    if (defaultExpanded && defaultExpanded.length === count) {
      return defaultExpanded;
    }
    return Array(count).fill(false);
  });

  const isExpanded = (index: number): boolean => {
    return expandedStates[index] || false;
  };

  const toggle = (index: number): void => {
    setExpandedStates(current => {
      const newStates = [...current];
      newStates[index] = !newStates[index];
      return newStates;
    });
  };

  const expand = (index: number): void => {
    setExpandedStates(current => {
      const newStates = [...current];
      newStates[index] = true;
      return newStates;
    });
  };

  const collapse = (index: number): void => {
    setExpandedStates(current => {
      const newStates = [...current];
      newStates[index] = false;
      return newStates;
    });
  };

  const expandAll = (): void => {
    setExpandedStates(Array(count).fill(true));
  };

  const collapseAll = (): void => {
    setExpandedStates(Array(count).fill(false));
  };

  return {
    expandedStates,
    isExpanded,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll
  };
}

/**
 * Export component and hooks
 */
export default CollapsibleSection;
