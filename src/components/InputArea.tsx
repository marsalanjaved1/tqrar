/**
 * Input Area Component
 * Simple input area with subtle model selector and execution mode controls
 */

import React from 'react';
import { IExecutionSettings } from '../types';
import { ModeToggle } from './ModeToggle';
import { AutoModeCheckbox } from './AutoModeCheckbox';
import { cn } from '../utils/classNames';

export interface IModelConfig {
  provider: 'openrouter' | 'openai' | 'anthropic';
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
  onExecutionSettingsChange
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
        top: rect.top - 8, // Position above button with small gap
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

  return (
    <div className="tq-border-t tq-border-border-default tq-p-4 tq-pb-2 tq-bg-bg-primary tq-flex-shrink-0 tq-flex tq-flex-col tq-w-full tq-box-border">
      <div className="tq-input-container">
        <textarea
          ref={textareaRef}
          className="tq-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Message input"
        />
        
        <div className="tq-flex tq-items-center tq-justify-between tq-gap-2 tq-mt-1">
          <div className="tq-flex tq-items-center tq-gap-2">
            {/* Mode Toggle */}
            <ModeToggle
              mode={executionSettings.mode}
              onChange={(mode) => {
                if (onExecutionSettingsChange) {
                  onExecutionSettingsChange({ ...executionSettings, mode });
                }
              }}
              disabled={disabled}
            />
            
            {/* Auto Mode Checkbox - only visible in Act mode */}
            {executionSettings.mode === 'act' && (
              <AutoModeCheckbox
                checked={executionSettings.autoMode}
                onChange={(autoMode) => {
                  if (onExecutionSettingsChange) {
                    onExecutionSettingsChange({ ...executionSettings, autoMode });
                  }
                }}
                disabled={disabled}
              />
            )}
          </div>

          <div className="tq-flex tq-items-center tq-gap-2">
            <div className="tq-relative">
              <button
                ref={modelButtonRef}
                className={cn(
                  'tq-bg-transparent tq-border-none tq-text-text-secondary tq-text-xs tq-px-2.5 tq-py-2 tq-cursor-pointer tq-rounded tq-transition-all tq-font-mono tq-whitespace-nowrap tq-h-8 tq-flex tq-items-center tq-mr-1',
                  showModelSelector && 'tq-bg-bg-active tq-text-accent-blue',
                  !showModelSelector && 'hover:tq-bg-bg-active hover:tq-text-text-primary',
                  disabled && 'tq-opacity-50 tq-cursor-not-allowed'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelSelector(!showModelSelector);
                }}
                disabled={disabled}
                title="Select model"
              >
                {getModelDisplayText()}
              </button>

              {showModelSelector && (
                <div 
                  ref={dropdownRef}
                  className="tq-fixed tq-bg-bg-secondary tq-border tq-border-border-default tq-rounded-md tq-shadow-dropdown tq-min-w-[180px] tq-z-[99999] tq-py-1"
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
                          : 'hover:tq-bg-bg-active'
                      )}
                      onClick={() => onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' })}
                    >
                      Claude Sonnet 4.5
                    </button>
                    <button
                      className={cn(
                        'tq-w-full tq-bg-transparent tq-border-none tq-px-3 tq-py-1.5 tq-text-text-primary tq-text-left tq-cursor-pointer tq-text-sm tq-transition-colors tq-block',
                        currentModel.provider === 'anthropic' && currentModel.model === 'claude-3-5-haiku-20241022'
                          ? 'tq-bg-accent-blue tq-text-white hover:tq-bg-accent-blue-hover'
                          : 'hover:tq-bg-bg-active'
                      )}
                      onClick={() => onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-haiku-20241022' })}
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
                          : 'hover:tq-bg-bg-active'
                      )}
                      onClick={() => onModelChange?.({ provider: 'openai', model: 'gpt-4o' })}
                    >
                      GPT-4o
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="tq-btn-primary"
              onClick={onSubmit}
              disabled={!value.trim() || disabled}
              title="Send message"
              aria-label="Send message"
            >
              <span className="tq-text-lg tq-leading-none">↑</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
