/**
 * Settings dialog for AI Assistant configuration
 */

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget } from '@lumino/widgets';
import { ISettings } from './types';
import { ApiKeyEncryption, SecurityEventType, SecurityLogger, UrlValidator } from './utils/security';

/**
 * Popular OpenRouter models with function calling support
 */
const OPENROUTER_MODELS = [
  // Free models (requires OpenRouter account with free tier enabled)
  { value: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek V3.1 (Free - $0)' },
  { value: 'google/gemini-flash-1.5:free', label: 'Gemini 1.5 Flash (Free - $0)' },
  { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (Free - $0)' },

  // Low-cost models
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat (Paid - Very Cheap)' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (Low Cost)' },
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude 4.5 Haiku (Low Cost)' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Low Cost)' },

  // Premium models
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'openai/gpt-4', label: 'GPT-4' },
  { value: 'google/gemini-pro', label: 'Gemini Pro' },
  { value: 'meta-llama/llama-3-70b-instruct', label: 'Llama 3 70B' }
];

/**
 * Settings dialog body widget
 */
class SettingsDialogBody extends Widget {
  private _providerSelect: HTMLSelectElement;
  private _apiKeyInput: HTMLInputElement;
  private _modelSelect: HTMLSelectElement;
  private _modelContainer: HTMLDivElement;
  private _baseUrlInput: HTMLInputElement;
  private _baseUrlContainer: HTMLDivElement;
  private _temperatureInput: HTMLInputElement;
  private _maxTokensInput: HTMLInputElement;
  private _validationMessage: HTMLDivElement;

  constructor(currentSettings: Partial<ISettings>) {
    super();
    this.addClass('jp-AIAssistant-settings-dialog');

    const form = document.createElement('div');
    form.className = 'jp-AIAssistant-settings-form';

    // Provider selection
    const providerGroup = this.createFormGroup(
      'Provider',
      'Select your LLM provider'
    );
    this._providerSelect = document.createElement('select');
    this._providerSelect.className = 'jp-mod-styled';
    const providers = [
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'local', label: 'Local Model' }
    ];
    providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.value;
      option.textContent = provider.label;
      if (provider.value === currentSettings.provider) {
        option.selected = true;
      }
      this._providerSelect.appendChild(option);
    });
    this._providerSelect.addEventListener('change', () => {
      this.updateProviderFields();
    });
    providerGroup.appendChild(this._providerSelect);
    form.appendChild(providerGroup);

    // API Key input
    const apiKeyGroup = this.createFormGroup(
      'API Key',
      'Enter your API key for the selected provider'
    );
    this._apiKeyInput = document.createElement('input');
    this._apiKeyInput.type = 'password';
    this._apiKeyInput.className = 'jp-mod-styled';
    this._apiKeyInput.placeholder = 'sk-...';
    this._apiKeyInput.value = currentSettings.apiKey || '';
    apiKeyGroup.appendChild(this._apiKeyInput);
    form.appendChild(apiKeyGroup);

    // Model selection (for OpenRouter)
    this._modelContainer = this.createFormGroup(
      'Model',
      'Select the model to use'
    );
    this._modelSelect = document.createElement('select');
    this._modelSelect.className = 'jp-mod-styled';
    OPENROUTER_MODELS.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      if (model.value === currentSettings.model) {
        option.selected = true;
      }
      this._modelSelect.appendChild(option);
    });
    this._modelContainer.appendChild(this._modelSelect);
    form.appendChild(this._modelContainer);

    // Base URL (for local models)
    this._baseUrlContainer = this.createFormGroup(
      'Base URL',
      'Enter the base URL for your local model endpoint'
    );
    this._baseUrlInput = document.createElement('input');
    this._baseUrlInput.type = 'text';
    this._baseUrlInput.className = 'jp-mod-styled';
    this._baseUrlInput.placeholder = 'http://localhost:8000/v1';
    this._baseUrlInput.value = currentSettings.baseUrl || '';
    this._baseUrlContainer.appendChild(this._baseUrlInput);
    form.appendChild(this._baseUrlContainer);

    // Temperature
    const temperatureGroup = this.createFormGroup(
      'Temperature',
      'Sampling temperature (0.0 = deterministic, 2.0 = very random)'
    );
    this._temperatureInput = document.createElement('input');
    this._temperatureInput.type = 'number';
    this._temperatureInput.className = 'jp-mod-styled';
    this._temperatureInput.min = '0';
    this._temperatureInput.max = '2';
    this._temperatureInput.step = '0.1';
    this._temperatureInput.value = String(currentSettings.temperature ?? 0.7);
    temperatureGroup.appendChild(this._temperatureInput);
    form.appendChild(temperatureGroup);

    // Max Tokens
    const maxTokensGroup = this.createFormGroup(
      'Max Tokens',
      'Maximum number of tokens to generate'
    );
    this._maxTokensInput = document.createElement('input');
    this._maxTokensInput.type = 'number';
    this._maxTokensInput.className = 'jp-mod-styled';
    this._maxTokensInput.min = '1';
    this._maxTokensInput.max = '32768';
    this._maxTokensInput.step = '1';
    this._maxTokensInput.value = String(currentSettings.maxTokens ?? 4096);
    maxTokensGroup.appendChild(this._maxTokensInput);
    form.appendChild(maxTokensGroup);

    // Validation message
    this._validationMessage = document.createElement('div');
    this._validationMessage.className = 'jp-AIAssistant-validation-message';
    this._validationMessage.style.display = 'none';
    form.appendChild(this._validationMessage);

    this.node.appendChild(form);

    // Update visibility based on initial provider
    this.updateProviderFields();
  }

  /**
   * Create a form group with label and description
   */
  private createFormGroup(label: string, description: string): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'jp-AIAssistant-form-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'jp-AIAssistant-form-label';
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const descEl = document.createElement('div');
    descEl.className = 'jp-AIAssistant-form-description';
    descEl.textContent = description;
    group.appendChild(descEl);

    return group;
  }

  /**
   * Update field visibility based on selected provider
   */
  private updateProviderFields(): void {
    const provider = this._providerSelect.value;

    // Show/hide model selection for OpenRouter
    this._modelContainer.style.display =
      provider === 'openrouter' ? 'block' : 'none';

    // Show/hide base URL for local models
    this._baseUrlContainer.style.display =
      provider === 'local' ? 'block' : 'none';
  }

  /**
   * Get the current settings from the form
   */
  getValue(): ISettings {
    return {
      provider: this._providerSelect.value as ISettings['provider'],
      apiKey: this._apiKeyInput.value,
      model: this._modelSelect.value,
      baseUrl: this._baseUrlInput.value,
      temperature: parseFloat(this._temperatureInput.value),
      maxTokens: parseInt(this._maxTokensInput.value, 10)
    };
  }

  /**
   * Show validation message
   */
  showValidationMessage(message: string, isError: boolean): void {
    this._validationMessage.textContent = message;
    this._validationMessage.className = isError
      ? 'jp-AIAssistant-validation-message jp-mod-error'
      : 'jp-AIAssistant-validation-message jp-mod-success';
    this._validationMessage.style.display = 'block';
  }

  /**
   * Hide validation message
   */
  hideValidationMessage(): void {
    this._validationMessage.style.display = 'none';
  }
}

/**
 * Show the settings dialog
 */
export async function showSettingsDialog(
  currentSettings: Partial<ISettings>
): Promise<ISettings | null> {
  const body = new SettingsDialogBody(currentSettings);

  const dialog = new Dialog({
    title: 'AI Assistant Settings',
    body,
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: 'Save' })
    ]
  });

  const result = await dialog.launch();

  if (result.button.accept) {
    return body.getValue();
  }

  return null;
}

/**
 * Validate API key by making a test request
 */
export async function validateApiKey(
  provider: string,
  apiKey: string,
  model?: string,
  baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }

  try {
    // Determine the base URL based on provider
    let url: string;
    switch (provider) {
      case 'openrouter':
        // OpenRouter blocks CORS requests from browsers
        // Just validate the key format instead
        if (!apiKey.startsWith('sk-or-')) {
          SecurityLogger.logEvent(
            SecurityEventType.API_KEY_VALIDATION,
            'Invalid OpenRouter API key format',
            'medium'
          );
          return {
            valid: false,
            error: 'Invalid OpenRouter API key format (should start with sk-or-)'
          };
        }
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'OpenRouter API key format validated',
          'low'
        );
        return { valid: true };
      case 'openai':
        url = 'https://api.openai.com/v1/models';
        break;
      case 'openai':
        url = 'https://api.openai.com/v1/models';
        break;
      case 'anthropic':
        // Anthropic doesn't have a simple validation endpoint
        // We'll just check if the key format is correct
        if (!apiKey.startsWith('sk-ant-')) {
          SecurityLogger.logEvent(
            SecurityEventType.API_KEY_VALIDATION,
            'Invalid Anthropic API key format',
            'medium'
          );
          return {
            valid: false,
            error: 'Invalid Anthropic API key format (should start with sk-ant-)'
          };
        }
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'Anthropic API key format validated',
          'low'
        );
        return { valid: true };
      case 'local': {
        if (!baseUrl) {
          return { valid: false, error: 'Base URL is required for local models' };
        }

        // Validate base URL security
        const urlValidation = UrlValidator.validateSecureUrl(baseUrl);
        if (!urlValidation.valid) {
          SecurityLogger.logEvent(
            SecurityEventType.INSECURE_CONNECTION,
            `Invalid base URL: ${urlValidation.error}`,
            'high'
          );
          return { valid: false, error: urlValidation.error };
        }

        url = `${baseUrl}/models`;
        break;
      }
      default:
        return { valid: false, error: 'Unknown provider' };
    }

    // Make a test request
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors' // Explicitly set CORS mode
    });

    if (response.ok) {
      SecurityLogger.logEvent(
        SecurityEventType.API_KEY_VALIDATION,
        `API key validated successfully for provider: ${provider}`,
        'low'
      );
      return { valid: true };
    } else {
      const errorText = await response.text();
      let errorMessage = 'API key validation failed';

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // If not JSON, use status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }

      SecurityLogger.logEvent(
        SecurityEventType.API_KEY_VALIDATION,
        `API key validation failed for provider ${provider}: ${errorMessage}`,
        'medium'
      );

      return { valid: false, error: errorMessage };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    SecurityLogger.logEvent(
      SecurityEventType.API_KEY_VALIDATION,
      `API key validation error: ${errorMsg}`,
      'medium'
    );
    return {
      valid: false,
      error: `Network error: ${errorMsg}`
    };
  }
}

/**
 * Load settings from the settings registry
 */
export async function loadSettings(
  settingRegistry: ISettingRegistry,
  pluginId: string
): Promise<Partial<ISettings>> {
  try {
    const settings = await settingRegistry.load(pluginId);
    const composite = settings.composite as Partial<ISettings>;

    // Decrypt API key if it's encrypted
    if (composite.apiKey && ApiKeyEncryption.isEncrypted(composite.apiKey)) {
      try {
        composite.apiKey = ApiKeyEncryption.decrypt(composite.apiKey);
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'API key decrypted successfully',
          'low'
        );
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'Failed to decrypt API key',
          'high'
        );
        // Clear invalid encrypted key
        composite.apiKey = '';
      }
    }

    return composite;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {};
  }
}

/**
 * Save settings to the settings registry
 */
export async function saveSettings(
  settingRegistry: ISettingRegistry,
  pluginId: string,
  settings: ISettings
): Promise<void> {
  try {
    // Encrypt API key before storage
    let encryptedApiKey = settings.apiKey;
    if (settings.apiKey && !ApiKeyEncryption.isEncrypted(settings.apiKey)) {
      try {
        encryptedApiKey = ApiKeyEncryption.encrypt(settings.apiKey);
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'API key encrypted for storage',
          'low'
        );
      } catch (error) {
        console.error('Failed to encrypt API key:', error);
        SecurityLogger.logEvent(
          SecurityEventType.API_KEY_VALIDATION,
          'Failed to encrypt API key',
          'high'
        );
        throw new Error('Failed to encrypt API key for secure storage');
      }
    }

    // Validate base URL if provided
    if (settings.provider === 'local' && settings.baseUrl) {
      const urlValidation = UrlValidator.validateSecureUrl(settings.baseUrl);
      if (!urlValidation.valid) {
        SecurityLogger.logEvent(
          SecurityEventType.INSECURE_CONNECTION,
          `Invalid base URL: ${urlValidation.error}`,
          'high'
        );
        throw new Error(`Security error: ${urlValidation.error}`);
      }
    }

    const settingsObj = await settingRegistry.load(pluginId);
    await settingsObj.set('provider', settings.provider);
    await settingsObj.set('apiKey', encryptedApiKey);
    await settingsObj.set('model', settings.model ?? '');
    await settingsObj.set('baseUrl', settings.baseUrl ?? '');
    await settingsObj.set('temperature', settings.temperature ?? 0.7);
    await settingsObj.set('maxTokens', settings.maxTokens ?? 4096);
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Show settings dialog with validation
 */
export async function showSettingsDialogWithValidation(
  settingRegistry: ISettingRegistry,
  pluginId: string
): Promise<boolean> {
  // Load current settings
  const currentSettings = await loadSettings(settingRegistry, pluginId);

  // Show dialog
  const newSettings = await showSettingsDialog(currentSettings);

  if (!newSettings) {
    return false; // User cancelled
  }

  // Validate API key
  const validation = await validateApiKey(
    newSettings.provider,
    newSettings.apiKey,
    newSettings.model,
    newSettings.baseUrl
  );

  if (!validation.valid) {
    // Show error dialog
    await showDialog({
      title: 'API Key Validation Failed',
      body: validation.error || 'Unknown error',
      buttons: [Dialog.okButton()]
    });
    return false;
  }

  // Save settings
  try {
    await saveSettings(settingRegistry, pluginId, newSettings);

    // Show success message
    await showDialog({
      title: 'Settings Saved',
      body: 'Your AI Assistant settings have been saved successfully.',
      buttons: [Dialog.okButton()]
    });

    return true;
  } catch (error) {
    await showDialog({
      title: 'Error Saving Settings',
      body: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      buttons: [Dialog.okButton()]
    });
    return false;
  }
}
