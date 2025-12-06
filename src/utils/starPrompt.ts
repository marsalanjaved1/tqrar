/**
 * Star Prompt Utility
 * Manages showing contextual prompts to encourage GitHub stars
 */

const STORAGE_KEY = 'tqrar_star_prompt_state';
const SHOW_AFTER_MESSAGES = 3; // Show after 3 successful AI responses
const COOLDOWN_HOURS = 24; // Don't show again for 24 hours after dismissal

interface StarPromptState {
  messageCount: number;
  lastDismissed?: number;
  hasStarred?: boolean;
}

export const starPromptUtils = {
  /**
   * Get the current state from localStorage
   */
  getState(): StarPromptState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { messageCount: 0 };
    } catch {
      return { messageCount: 0 };
    }
  },

  /**
   * Save state to localStorage
   */
  setState(state: StarPromptState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  },

  /**
   * Increment message count and check if we should show the prompt
   */
  shouldShowPrompt(): boolean {
    const state = this.getState();

    // Don't show if user already starred
    if (state.hasStarred) {
      return false;
    }

    // Check if in cooldown period
    if (state.lastDismissed) {
      const hoursSinceDismissed = (Date.now() - state.lastDismissed) / (1000 * 60 * 60);
      if (hoursSinceDismissed < COOLDOWN_HOURS) {
        return false;
      }
    }

    // Increment counter
    state.messageCount++;
    this.setState(state);

    // Show after reaching threshold
    return state.messageCount >= SHOW_AFTER_MESSAGES;
  },

  /**
   * Mark that user dismissed the prompt
   */
  dismissPrompt(): void {
    const state = this.getState();
    state.lastDismissed = Date.now();
    state.messageCount = 0; // Reset counter
    this.setState(state);
  },

  /**
   * Mark that user starred the project
   */
  markAsStarred(): void {
    const state = this.getState();
    state.hasStarred = true;
    this.setState(state);
  },

  /**
   * Reset state (for testing)
   */
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
