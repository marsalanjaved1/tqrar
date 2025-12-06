/**
 * Input Area Component - Kiro Style
 * Clean input area with autopilot toggle, checkpoint, and review buttons
 */

import React from 'react';
import { IExecutionSettings } from '../types';
import { AutopilotToggle } from './AutopilotToggle';
import { CheckpointButton, ICheckpoint } from './CheckpointButton';
import { ReviewButton, IChange } from './ReviewButton';
import { cn } from '../utils/classNames';

export interface IModelConfig {
  provider: 'openrouter' | 'openai' | 'anthropic' | string;
  model: string;
}

export interface IInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  currentModel?: IModelConfig;
  onModelChange?: (config: IModelConfig) => void;
  executionSettings?: IExecutionSettings;
  onExecutionSettingsChange?: (settings: IExecutionSettings) => void;
  // Checkpoint props
  checkpoints?: ICheckpoint[];
  onCreateCheckpoint?: () => void;
  onRestoreCheckpoint?: (checkpointId: string) => void;
  hasUnsavedChanges?: boolean;
  // Review props
  changes?: IChange[];
  onViewChange?: (changeId: string) => void;
  onAcceptAllChanges?: () => void;
  onRevertAllChanges?: () => void;
}

export const InputArea: React.FC<IInputAreaProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask Tqrar...',
  currentModel = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  onModelChange,
  executionSettings = { mode: 'act', autoMode: true },
  onExecutionSettingsChange,
  checkpoints = [],
  onCreateCheckpoint,
  onRestoreCheckpoint,
  hasUnsavedChanges = false,
  changes = [],
  onViewChange,
  onAcceptAllChanges,
  onRevertAllChanges
}) => {
  const [showModelSelector, setShowModelSelector] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const modelButtonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [value]);

  // Calculate dropdown position and close on outside click
  React.useEffect(() => {
    if (showModelSelector && modelButtonRef.current) {
      const rect = modelButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 8,
        left: rect.left
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modelButtonRef.current && 
        !modelButtonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowModelSelector(false);
      }
    };

    if (showModelSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelSelector]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  const getModelDisplayText = (): string => {
    const modelMap: Record<string, string> = {
      'claude-3-5-sonnet-20241022': 'Claude Sonnet 4.5',
      'claude-3-5-haiku-20241022': 'Claude Haiku 4.5',
      'claude-3-opus-20240229': 'Claude Opus',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };
    
    return modelMap[currentModel.model] || currentModel.model;
  };

  const handleAutopilotChange = (enabled: boolean) => {
    if (onExecutionSettingsChange) {
      onExecutionSettingsChange({
        ...executionSettings,
        autoMode: enabled,
        // When autopilot is on, always use 'act' mode
        mode: enabled ? 'act' : executionSettings.mode
      });
    }
  };

  return (
    <div className="kiro-input-area tq-border-t tq-border-border-default tq-bg-bg-primary tq-flex-shrink-0">
      {/* Top toolbar with controls */}
      <div className="tq-flex tq-items-center tq-justify-between tq-px-4 tq-py-2 tq-border-b tq-border-border-default tq-bg-bg-secondary">
        <div className="tq-flex tq-items-center tq-gap-2">
          {/* Autopilot Toggle - Kiro style */}
          <AutopilotToggle
            enabled={executionSettings.autoMode}
            onChange={handleAutopilotChange}
            disabled={disabled}
          />
        </div>

        <div className="tq-flex tq-items-center tq-gap-2">
          {/* Review Button - only show if there are changes */}
          {changes.length > 0 && onViewChange && onAcceptAllChanges && onRevertAllChanges && (
            <ReviewButton
              changes={changes}
              onViewChange={onViewChange}
              onAcceptAll={onAcceptAllChanges}
              onRevertAll={onRevertAllChanges}
              isLoading={disabled}
            />
          )}

          {/* Checkpoint Button */}
          {onCreateCheckpoint && onRestoreCheckpoint && (
            <CheckpointButton
              checkpoints={checkpoints}
              onCreateCheckpoint={onCreateCheckpoint}
              onRestoreCheckpoint={onRestoreCheckpoint}
              hasChanges={hasUnsavedChanges}
              isLoading={disabled}
            />
          )}
        </div>
      </div>

      {/* Input container */}
      <div className="tq-p-4 tq-pb-2">
        <div className="kiro-input-container tq-flex tq-flex-col tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-transition-all focus-within:tq-border-accent-blue">
          <textarea
            ref={textareaRef}
            className="kiro-textarea tq-w-full tq-bg-transparent tq-border-none tq-text-text-primary tq-text-md tq-font-sans tq-resize-none tq-min-h-[44px] tq-max-h-[200px] tq-leading-relaxed tq-p-3 tq-pb-0 tq-outline-none"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            aria-label="Message input"
          />
          
          {/* Bottom bar with model selector and send button */}
          <div className="tq-flex tq-items-center tq-justify-between tq-px-3 tq-py-2">
            {/* Model selector */}
            <div className="tq-relative">
              <button
                ref={modelButtonRef}
                className={cn(
                  'kiro-model-btn',
                  'tq-flex tq-items-center tq-gap-1 tq-px-2 tq-py-1 tq-rounded',
                  'tq-text-xs tq-text-text-muted tq-font-mono',
                  'tq-bg-transparent tq-border-none tq-cursor-pointer',
                  'hover:tq-text-text-secondary hover:tq-bg-bg-hover',
                  'tq-transition-colors',
                  showModelSelector && 'tq-text-text-secondary tq-bg-bg-hover',
                  disabled && 'tq-opacity-50 tq-cursor-not-allowed'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelSelector(!showModelSelector);
                }}
                disabled={disabled}
                title="Select model"
              >
                <span>{getModelDisplayText()}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" className="tq-text-current">
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>

              {/* Model dropdown */}
              {showModelSelector && (
                <div 
                  ref={dropdownRef}
                  className="tq-fixed tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-lg tq-shadow-dropdown tq-min-w-[180px] tq-z-[99999] tq-py-1 tq-animate-fade-in"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    transform: 'translateY(-100%)'
                  }}
                >
                  <div className="tq-py-1 tq-border-b tq-border-border-default">
                    <div className="tq-px-3 tq-py-1 tq-text-[10px] tq-font-semibold tq-text-text-muted tq-uppercase tq-tracking-wide">Anthropic</div>
                    <button
                      className={cn(
                        'tq-w-full tq-bg-transparent tq-border-none tq-px-3 tq-py-1.5 tq-text-text-primary tq-text-left tq-cursor-pointer tq-text-sm tq-transition-colors tq-block',
                        currentModel.provider === 'anthropic' && currentModel.model === 'claude-3-5-sonnet-20241022'
                          ? 'tq-bg-accent-blue tq-text-white hover:tq-bg-accent-blue-hover'
                          : 'hover:tq-bg-bg-hover'
                      )}
                      onClick={() => {
                        onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' });
                        setShowModelSelector(false);
                      }}
                    >
                      Claude Sonnet 4.5
                    </button>
                    <button
                      className={cn(
                        'tq-w-full tq-bg-transparent tq-border-none tq-px-3 tq-py-1.5 tq-text-text-primary tq-text-left tq-cursor-pointer tq-text-sm tq-transition-colors tq-block',
                        currentModel.provider === 'anthropic' && currentModel.model === 'claude-3-5-haiku-20241022'
                          ? 'tq-bg-accent-blue tq-text-white hover:tq-bg-accent-blue-hover'
                          : 'hover:tq-bg-bg-hover'
                      )}
                      onClick={() => {
                        onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-haiku-20241022' });
                        setShowModelSelector(false);
                      }}
                    >
                      Claude Haiku 4.5
                    </button>
                  </div>

                  <div className="tq-py-1">
                    <div className="tq-px-3 tq-py-1 tq-text-[10px] tq-font-semibold tq-text-text-muted tq-uppercase tq-tracking-wide">OpenAI</div>
                    <button
                      className={cn(
                        'tq-w-full tq-bg-transparent tq-border-none tq-px-3 tq-py-1.5 tq-text-text-primary tq-text-left tq-cursor-pointer tq-text-sm tq-transition-colors tq-block',
                        currentModel.provider === 'openai' && currentModel.model === 'gpt-4o'
                          ? 'tq-bg-accent-blue tq-text-white hover:tq-bg-accent-blue-hover'
                          : 'hover:tq-bg-bg-hover'
                      )}
                      onClick={() => {
                        onModelChange?.({ provider: 'openai', model: 'gpt-4o' });
                        setShowModelSelector(false);
                      }}
                    >
                      GPT-4o
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              className={cn(
                'kiro-send-btn',
                'tq-flex tq-items-center tq-justify-center',
                'tq-w-8 tq-h-8 tq-rounded-lg',
                'tq-bg-accent-blue tq-text-white',
                'tq-border-none tq-cursor-pointer',
                'tq-transition-all',
                'hover:tq-bg-accent-blue-hover',
                'active:tq-scale-95',
                'disabled:tq-bg-bg-hover disabled:tq-text-text-muted disabled:tq-cursor-not-allowed disabled:tq-opacity-50'
              )}
              onClick={onSubmit}
              disabled={!value.trim() || disabled}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 12V4M8 4L4 8M8 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
