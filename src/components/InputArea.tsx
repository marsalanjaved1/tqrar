/**
 * Input Area Component
 * Simple input area with subtle model selector
 */

import React from 'react';

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
}

export const InputArea: React.FC<IInputAreaProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Ask Tqrar...',
  currentModel = { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  onModelChange
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
    <div className="jp-InputArea">
      <div className="jp-InputContainer">
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
        
        <div className="jp-InputArea-actions">
          <div className="jp-InputArea-modelWrapper">
            <button
              ref={modelButtonRef}
              className={`jp-InputArea-modelButton ${showModelSelector ? 'jp-InputArea-modelButton-active' : ''}`}
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
                className="jp-InputArea-modelDropdown"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  transform: 'translateY(-100%)'
                }}
              >
                <div className="jp-InputArea-modelGroup">
                  <div className="jp-InputArea-modelGroupTitle">Anthropic</div>
                  <button
                    className={`jp-InputArea-modelOption ${
                      currentModel.provider === 'anthropic' && currentModel.model === 'claude-3-5-sonnet-20241022'
                        ? 'jp-InputArea-modelOption-selected'
                        : ''
                    }`}
                    onClick={() => onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' })}
                  >
                    Claude Sonnet 4.5
                  </button>
                  <button
                    className={`jp-InputArea-modelOption ${
                      currentModel.provider === 'anthropic' && currentModel.model === 'claude-3-5-haiku-20241022'
                        ? 'jp-InputArea-modelOption-selected'
                        : ''
                    }`}
                    onClick={() => onModelChange?.({ provider: 'anthropic', model: 'claude-3-5-haiku-20241022' })}
                  >
                    Claude Haiku 4.5
                  </button>
                </div>

                <div className="jp-InputArea-modelGroup">
                  <div className="jp-InputArea-modelGroupTitle">OpenAI</div>
                  <button
                    className={`jp-InputArea-modelOption ${
                      currentModel.provider === 'openai' && currentModel.model === 'gpt-4o'
                        ? 'jp-InputArea-modelOption-selected'
                        : ''
                    }`}
                    onClick={() => onModelChange?.({ provider: 'openai', model: 'gpt-4o' })}
                  >
                    GPT-4o
                  </button>
                </div>
              </div>
            )}
          </div>

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
    </div>
  );
};
