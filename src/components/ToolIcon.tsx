/**
 * Tool Icon Component
 * 
 * Displays an icon for a tool based on its name and type
 * Uses JupyterLab icon set with fallback support
 */

import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import { cn } from '../utils/classNames';

/**
 * Props for ToolIcon component
 */
export interface IToolIconProps {
  /**
   * Name of the tool
   */
  toolName: string;

  /**
   * Optional custom icon (SVG string or LabIcon)
   */
  customIcon?: string | LabIcon;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Tool category for styling
 */
export type ToolCategory = 'notebook' | 'file' | 'inspection' | 'other';

/**
 * Tool icon mapping configuration
 */
interface IToolIconConfig {
  /**
   * Icon symbol (emoji or character)
   */
  symbol: string;

  /**
   * Tool category for styling
   */
  category: ToolCategory;

  /**
   * Optional JupyterLab icon name
   */
  labIcon?: string;
}

/**
 * Default icon mapping for common tools
 */
const TOOL_ICON_MAP: Record<string, IToolIconConfig> = {
  // Notebook operations
  createCell: { symbol: '📝', category: 'notebook', labIcon: 'ui-components:add' },
  updateCell: { symbol: '✏️', category: 'notebook', labIcon: 'ui-components:edit' },
  deleteCell: { symbol: '🗑️', category: 'notebook', labIcon: 'ui-components:delete' },
  getCells: { symbol: '📋', category: 'notebook', labIcon: 'ui-components:list' },
  executeCell: { symbol: '▶️', category: 'notebook', labIcon: 'ui-components:run' },
  
  // File operations
  readFile: { symbol: '📄', category: 'file', labIcon: 'ui-components:file' },
  writeFile: { symbol: '💾', category: 'file', labIcon: 'ui-components:save' },
  listFiles: { symbol: '📁', category: 'file', labIcon: 'ui-components:folder' },
  deleteFile: { symbol: '🗑️', category: 'file', labIcon: 'ui-components:delete' },
  
  // Inspection operations
  getCompletions: { symbol: '💡', category: 'inspection', labIcon: 'ui-components:lightbulb' },
  getDocumentation: { symbol: '📖', category: 'inspection', labIcon: 'ui-components:book' },
  inspectVariable: { symbol: '🔍', category: 'inspection', labIcon: 'ui-components:search' },
  getSignature: { symbol: '📝', category: 'inspection', labIcon: 'ui-components:info' }
};

/**
 * Fallback icon configuration
 */
const FALLBACK_ICON: IToolIconConfig = {
  symbol: '🔧',
  category: 'other',
  labIcon: 'ui-components:settings'
};

/**
 * Get icon configuration for a tool
 * @param toolName - Name of the tool
 * @returns Icon configuration
 */
export function getToolIconConfig(toolName: string): IToolIconConfig {
  // Check for exact match
  if (TOOL_ICON_MAP[toolName]) {
    return TOOL_ICON_MAP[toolName];
  }

  // Check for partial matches based on tool name patterns
  const lowerName = toolName.toLowerCase();

  // Notebook operations
  if (lowerName.includes('cell')) {
    if (lowerName.includes('create') || lowerName.includes('add')) {
      return { symbol: '📝', category: 'notebook', labIcon: 'ui-components:add' };
    }
    if (lowerName.includes('update') || lowerName.includes('edit') || lowerName.includes('modify')) {
      return { symbol: '✏️', category: 'notebook', labIcon: 'ui-components:edit' };
    }
    if (lowerName.includes('delete') || lowerName.includes('remove')) {
      return { symbol: '🗑️', category: 'notebook', labIcon: 'ui-components:delete' };
    }
    if (lowerName.includes('execute') || lowerName.includes('run')) {
      return { symbol: '▶️', category: 'notebook', labIcon: 'ui-components:run' };
    }
    if (lowerName.includes('get') || lowerName.includes('list')) {
      return { symbol: '📋', category: 'notebook', labIcon: 'ui-components:list' };
    }
    return { symbol: '📓', category: 'notebook', labIcon: 'ui-components:notebook' };
  }

  // File operations
  if (lowerName.includes('file') || lowerName.includes('read') || lowerName.includes('write')) {
    if (lowerName.includes('read') || lowerName.includes('get')) {
      return { symbol: '📄', category: 'file', labIcon: 'ui-components:file' };
    }
    if (lowerName.includes('write') || lowerName.includes('save') || lowerName.includes('create')) {
      return { symbol: '💾', category: 'file', labIcon: 'ui-components:save' };
    }
    if (lowerName.includes('list') || lowerName.includes('directory') || lowerName.includes('folder')) {
      return { symbol: '📁', category: 'file', labIcon: 'ui-components:folder' };
    }
    if (lowerName.includes('delete') || lowerName.includes('remove')) {
      return { symbol: '🗑️', category: 'file', labIcon: 'ui-components:delete' };
    }
    return { symbol: '📄', category: 'file', labIcon: 'ui-components:file' };
  }

  // Inspection operations
  if (lowerName.includes('get') || lowerName.includes('inspect') || lowerName.includes('completion') || lowerName.includes('documentation')) {
    if (lowerName.includes('completion')) {
      return { symbol: '💡', category: 'inspection', labIcon: 'ui-components:lightbulb' };
    }
    if (lowerName.includes('documentation') || lowerName.includes('doc') || lowerName.includes('help')) {
      return { symbol: '📖', category: 'inspection', labIcon: 'ui-components:book' };
    }
    if (lowerName.includes('inspect') || lowerName.includes('variable') || lowerName.includes('search')) {
      return { symbol: '🔍', category: 'inspection', labIcon: 'ui-components:search' };
    }
    if (lowerName.includes('signature') || lowerName.includes('info')) {
      return { symbol: 'ℹ️', category: 'inspection', labIcon: 'ui-components:info' };
    }
    return { symbol: '🔍', category: 'inspection', labIcon: 'ui-components:search' };
  }

  // Default fallback
  return FALLBACK_ICON;
}

/**
 * Get CSS class for tool category
 * @param category - Tool category
 * @returns CSS class name
 */
export function getToolCategoryClass(category: ToolCategory): string {
  // Map categories to Tailwind color classes
  const categoryColors: Record<ToolCategory, string> = {
    notebook: 'tq-text-accent-blue',
    file: 'tq-text-success',
    inspection: 'tq-text-warning',
    other: 'tq-text-text-secondary'
  };
  return categoryColors[category];
}

/**
 * ToolIcon component
 * Displays an icon for a tool with appropriate styling
 */
export const ToolIcon: React.FC<IToolIconProps> = ({
  toolName,
  customIcon,
  className = ''
}) => {
  // If custom icon is provided, use it
  if (customIcon) {
    if (typeof customIcon === 'string') {
      // Custom SVG string
      return (
        <span
          className={cn('tq-text-lg tq-flex tq-items-center tq-justify-center', className)}
          dangerouslySetInnerHTML={{ __html: customIcon }}
        />
      );
    } else {
      // LabIcon instance
      return (
        <customIcon.react
          className={cn('tq-text-lg tq-flex tq-items-center tq-justify-center', className)}
          tag="span"
        />
      );
    }
  }

  // Get icon configuration for the tool
  const config = getToolIconConfig(toolName);
  const categoryClass = getToolCategoryClass(config.category);

  // Use emoji symbol as fallback (always available)
  return (
    <span
      className={cn('tq-text-lg tq-flex tq-items-center tq-justify-center', categoryClass, className)}
      title={toolName}
      role="img"
      aria-label={`${toolName} tool icon`}
    >
      {config.symbol}
    </span>
  );
};

/**
 * Export utility functions for use in other components
 */
export { TOOL_ICON_MAP, FALLBACK_ICON };
