/**
 * @fileoverview Event type constants for the EventBus system
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Centralized definition of all event types used across the application.
 * This prevents typos and makes event names easily discoverable and maintainable.
 *
 * @example
 * import { GAME_EVENTS, UI_EVENTS } from './EventTypes.js';
 *
 * eventBus.emit(GAME_EVENTS.GAME_START, gameConfig);
 * eventBus.on(UI_EVENTS.BUTTON_CLICK, handleButtonClick);
 */

/**
 * Core game-related events
 * These events control the main game flow and state changes
 */
export const GAME_EVENTS = {
  // Game lifecycle events
  GAME_INITIALIZED: "game:initialized",
  GAME_START: "game:start",
  GAME_END: "game:end",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_RESET: "game:reset",

  // Game state changes
  PHASE_CHANGE: "game:phase_change",
  TURN_START: "game:turn_start",
  TURN_END: "game:turn_end",
  ROUND_START: "game:round_start",
  ROUND_END: "game:round_end",

  // Game flow events
  CARDS_DEALT: "game:cards_dealt",
  CARDS_SHUFFLED: "game:cards_shuffled",
  DECK_EMPTY: "game:deck_empty",
  DECK_INITIALIZED: "game:deck_initialized",
  DECK_RESET: "game:deck_reset",
  DISCARD_SHUFFLED: "game:discard_shuffled",

  // Poker-specific events
  BLINDS_POSTED: "game:blinds_posted",
  FLOP_DEALT: "game:flop_dealt",
  TURN_DEALT: "game:turn_dealt",
  RIVER_DEALT: "game:river_dealt",
  SHOWDOWN_START: "game:showdown_start",
  HAND_WON: "game:hand_won",
  HAND_ENDED: "game:hand_ended",

  // Game result events
  WINNER_DECLARED: "game:winner_declared",
  SCORE_UPDATE: "game:score_update",
  STATISTICS_UPDATE: "game:statistics_update",
};

/**
 * Player-related events
 * Events for both human and AI player actions
 */
export const PLAYER_EVENTS = {
  // Player actions
  PLAYER_JOIN: "player:join",
  PLAYER_LEAVE: "player:leave",
  PLAYER_READY: "player:ready",
  PLAYER_NOT_READY: "player:not_ready",

  // Player moves and decisions
  PLAYER_MOVE: "player:move",
  PLAYER_CARD_PLAYED: "player:card_played",
  PLAYER_CARD_DRAWN: "player:card_drawn",
  PLAYER_PASS: "player:pass",
  PLAYER_INVALID_MOVE: "player:invalid_move",

  // Poker player actions
  PLAYER_FOLD: "player:fold",
  PLAYER_CHECK: "player:check",
  PLAYER_CALL: "player:call",
  PLAYER_RAISE: "player:raise",
  PLAYER_BET: "player:bet",
  PLAYER_ALL_IN: "player:all_in",

  // Player state changes
  PLAYER_TURN_START: "player:turn_start",
  PLAYER_TURN_END: "player:turn_end",
  PLAYER_HAND_EMPTY: "player:hand_empty",
  PLAYER_ELIMINATED: "player:eliminated",
};

/**
 * AI-specific events
 * Events related to AI decision making and behavior
 */
export const AI_EVENTS = {
  // AI decision process
  AI_THINKING_START: "ai:thinking_start",
  AI_THINKING_END: "ai:thinking_end",
  AI_DECISION_MADE: "ai:decision_made",
  AI_DECISION_ERROR: "ai:decision_error",

  // AI behavior and learning
  AI_PERSONALITY_CHANGE: "ai:personality_change",
  AI_CONFIDENCE_UPDATE: "ai:confidence_update",
  AI_LEARNING_UPDATE: "ai:learning_update",
  AI_PATTERN_DETECTED: "ai:pattern_detected",

  // AI performance
  AI_PERFORMANCE_WARNING: "ai:performance_warning",
  AI_REDUCE_COMPLEXITY: "ai:reduce_complexity",
  AI_INCREASE_THINK_DELAY: "ai:increase_think_delay",
};

/**
 * User Interface events
 * Events for UI interactions and state changes
 */
export const UI_EVENTS = {
  // Button and control interactions
  BUTTON_CLICK: "ui:button_click",
  BUTTON_HOVER: "ui:button_hover",
  MENU_OPEN: "ui:menu_open",
  MENU_CLOSE: "ui:menu_close",

  // Card interactions
  CARD_HOVER: "ui:card_hover",
  CARD_SELECT: "ui:card_select",
  CARD_DESELECT: "ui:card_deselect",
  CARD_DRAG_START: "ui:card_drag_start",
  CARD_DRAG_END: "ui:card_drag_end",

  // UI state changes
  THEME_CHANGE: "ui:theme_change",
  LANGUAGE_CHANGE: "ui:language_change",
  SETTINGS_OPEN: "ui:settings_open",
  SETTINGS_CLOSE: "ui:settings_close",
  SETTINGS_SAVE: "ui:settings_save",

  // Animation events
  ANIMATION_START: "ui:animation_start",
  ANIMATION_END: "ui:animation_end",
  ANIMATION_CANCEL: "ui:animation_cancel",

  // Modal and overlay events
  MODAL_OPEN: "ui:modal_open",
  MODAL_CLOSE: "ui:modal_close",
  TOAST_SHOW: "ui:toast_show",
  TOAST_HIDE: "ui:toast_hide",
};

/**
 * Audio system events
 * Events for sound effects and music
 */
export const AUDIO_EVENTS = {
  // Sound effect events
  SOUND_PLAY: "audio:sound_play",
  SOUND_STOP: "audio:sound_stop",
  SOUND_VOLUME_CHANGE: "audio:sound_volume_change",

  // Music events
  MUSIC_PLAY: "audio:music_play",
  MUSIC_STOP: "audio:music_stop",
  MUSIC_PAUSE: "audio:music_pause",
  MUSIC_RESUME: "audio:music_resume",
  MUSIC_VOLUME_CHANGE: "audio:music_volume_change",

  // Audio state events
  AUDIO_ENABLED: "audio:enabled",
  AUDIO_DISABLED: "audio:disabled",
  AUDIO_CONTEXT_SUSPENDED: "audio:context_suspended",
  AUDIO_CONTEXT_RESUMED: "audio:context_resumed",
};

/**
 * Performance and system events
 * Events for monitoring and optimizing performance
 */
export const SYSTEM_EVENTS = {
  // Performance monitoring
  PERFORMANCE_WARNING: "system:performance_warning",
  MEMORY_WARNING: "system:memory_warning",
  FPS_DROP: "system:fps_drop",

  // System state changes
  FOCUS_GAINED: "system:focus_gained",
  FOCUS_LOST: "system:focus_lost",
  VISIBILITY_CHANGE: "system:visibility_change",
  NETWORK_ONLINE: "system:network_online",
  NETWORK_OFFLINE: "system:network_offline",

  // GameLoop events
  GAMELOOP_START: "system:gameloop_start",
  GAMELOOP_STOP: "system:gameloop_stop",
  GAMELOOP_PAUSE: "system:gameloop_pause",
  GAMELOOP_RESUME: "system:gameloop_resume",
  GAMELOOP_CONFIG_UPDATE: "system:gameloop_config_update",
  GAMELOOP_SUBSCRIBER_ERROR: "system:gameloop_subscriber_error",
  GAMELOOP_DISPOSED: "system:gameloop_disposed",

  // TimeManager events
  TIME_UPDATE: "system:time_update",
  TIME_SCALE_CHANGED: "system:time_scale_changed",
  TIME_MANAGER_DISPOSED: "system:time_manager_disposed",

  // Timer events
  TIMER_CREATED: "system:timer_created",
  TIMER_TRIGGERED: "system:timer_triggered",
  TIMER_COMPLETED: "system:timer_completed",
  TIMER_REMOVED: "system:timer_removed",
  ALL_TIMERS_PAUSED: "system:all_timers_paused",
  ALL_TIMERS_RESUMED: "system:all_timers_resumed",
  ALL_TIMERS_CLEARED: "system:all_timers_cleared",

  // Error events
  ERROR_OCCURRED: "system:error_occurred",
  WARNING_OCCURRED: "system:warning_occurred",
  DEBUG_MESSAGE: "system:debug_message",
};

/**
 * Data and storage events
 * Events related to data persistence and synchronization
 */
export const DATA_EVENTS = {
  // Save/load operations
  GAME_SAVE_START: "data:game_save_start",
  GAME_SAVE_SUCCESS: "data:game_save_success",
  GAME_SAVE_ERROR: "data:game_save_error",
  GAME_LOAD_START: "data:game_load_start",
  GAME_LOAD_SUCCESS: "data:game_load_success",
  GAME_LOAD_ERROR: "data:game_load_error",

  // Statistics events
  STATISTICS_SAVE: "data:statistics_save",
  STATISTICS_LOAD: "data:statistics_load",
  ACHIEVEMENT_UNLOCK: "data:achievement_unlock",

  // Settings events
  SETTINGS_LOAD: "data:settings_load",
  SETTINGS_SAVE: "data:settings_save",
  SETTINGS_RESET: "data:settings_reset",
};

/**
 * EventBus internal events
 * Events generated by the EventBus system itself
 */
export const EVENTBUS_EVENTS = {
  ERROR: "eventbus:error",
  LISTENER_ADDED: "eventbus:listener_added",
  LISTENER_REMOVED: "eventbus:listener_removed",
  DEBUG_MODE_CHANGED: "eventbus:debug_mode_changed",
};

/**
 * Aggregated object containing all event categories
 * Useful for imports when you need access to multiple categories
 */
export const ALL_EVENTS = {
  GAME: GAME_EVENTS,
  PLAYER: PLAYER_EVENTS,
  AI: AI_EVENTS,
  UI: UI_EVENTS,
  AUDIO: AUDIO_EVENTS,
  SYSTEM: SYSTEM_EVENTS,
  DATA: DATA_EVENTS,
  EVENTBUS: EVENTBUS_EVENTS,
};

/**
 * Utility function to validate if an event type exists
 *
 * @param {string} eventType - Event type to validate
 * @returns {boolean} True if event type is defined, false otherwise
 */
export function isValidEventType(eventType) {
  for (const category of Object.values(ALL_EVENTS)) {
    if (Object.values(category).includes(eventType)) {
      return true;
    }
  }
  return false;
}

/**
 * Utility function to get the category of an event type
 *
 * @param {string} eventType - Event type to categorize
 * @returns {string|null} Category name or null if not found
 */
export function getEventCategory(eventType) {
  for (const [categoryName, category] of Object.entries(ALL_EVENTS)) {
    if (Object.values(category).includes(eventType)) {
      return categoryName;
    }
  }
  return null;
}

/**
 * Utility function to get all events in a category
 *
 * @param {string} categoryName - Category name
 * @returns {Array<string>} Array of event types in the category
 */
export function getEventsInCategory(categoryName) {
  const category = ALL_EVENTS[categoryName.toUpperCase()];
  return category ? Object.values(category) : [];
}
