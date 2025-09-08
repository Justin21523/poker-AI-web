/**
 * @fileoverview Core event bus system for decoupled communication between game modules
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description EventBus implements the Observer pattern to enable loose coupling
 * between different game systems. It supports priority-based execution,
 * one-time listeners, and error isolation.
 *
 * @example
 * import { EventBus } from './EventBus.js';
 *
 * const eventBus = new EventBus();
 *
 * // Subscribe to an event
 * eventBus.on('game:start', (data) => {
 *     console.log('Game started with config:', data);
 * });
 *
 * // Emit an event
 * eventBus.emit('game:start', { players: 4, gameType: 'old-maid' });
 */

/**
 * Core event bus system for managing communication between game modules
 * Implements observer pattern with priority support and error handling
 */
export class EventBus {
  /**
   * Creates a new EventBus instance
   */
  constructor() {
    /** @type {Map<string, Array<{callback: Function, priority: number, id: string}>>} */
    this.listeners = new Map();

    /** @type {Map<string, Array<Function>>} */
    this.onceListeners = new Map();

    /** @type {boolean} Whether debug mode is enabled */
    this.debugMode = false;

    /** @type {Array<{event: string, timestamp: number, data: any}>} */
    this.eventHistory = [];

    /** @type {number} Maximum number of events to keep in history */
    this.maxHistoryLength = 100;

    /** @type {number} Counter for generating unique listener IDs */
    this.listenerIdCounter = 0;
  }

  /**
   * Subscribes to an event with optional priority
   * Higher priority listeners execute first
   *
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is emitted
   * @param {number} [priority=0] - Execution priority (higher = earlier)
   * @returns {Function} Unsubscribe function
   * @throws {Error} If event name is invalid or callback is not a function
   *
   * @example
   * const unsubscribe = eventBus.on('player:move', (move) => {
   *     console.log('Player moved:', move);
   * }, 10); // High priority
   *
   * // Later, unsubscribe
   * unsubscribe();
   */
  on(event, callback, priority = 0) {
    this._validateEvent(event);
    this._validateCallback(callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listenerId = `listener_${++this.listenerIdCounter}`;
    const listenerObject = { callback, priority, id: listenerId };

    this.listeners.get(event).push(listenerObject);

    // Sort by priority (highest first)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(
        `[EventBus] Subscribed to '${event}' with priority ${priority}`
      );
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribes to an event that will only fire once
   * Automatically removes the listener after first execution
   *
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   * @throws {Error} If event name is invalid or callback is not a function
   *
   * @example
   * eventBus.once('game:end', (result) => {
   *     console.log('Game ended with result:', result);
   *     // This will only execute once
   * });
   */
  once(event, callback) {
    this._validateEvent(event);
    this._validateCallback(callback);

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }

    this.onceListeners.get(event).push(callback);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to '${event}' (once)`);
    }

    // Return unsubscribe function
    return () => this.offOnce(event, callback);
  }

  /**
   * Emits an event to all subscribers
   * Executes listeners in priority order with error isolation
   *
   * @param {string} event - Event name to emit
   * @param {*} [data] - Data to pass to listeners
   * @returns {boolean} True if event had listeners, false otherwise
   * @throws {Error} If event name is invalid
   *
   * @example
   * eventBus.emit('player:action', {
   *     playerId: 'player1',
   *     action: 'play_card',
   *     cards: [card1, card2]
   * });
   */
  emit(event, data = null) {
    this._validateEvent(event);

    let hadListeners = false;

    // Record event in history
    this._recordEvent(event, data);

    if (this.debugMode) {
      console.log(`[EventBus] Emitting '${event}'`, data);
    }

    // Execute one-time listeners first
    if (this.onceListeners.has(event)) {
      const onceCallbacks = this.onceListeners.get(event);
      this.onceListeners.delete(event); // Remove all once listeners

      onceCallbacks.forEach((callback) => {
        hadListeners = true;
        this._safeExecute(callback, data, event, "once");
      });
    }

    // Execute regular listeners
    if (this.listeners.has(event)) {
      const eventListeners = this.listeners.get(event);

      eventListeners.forEach(({ callback, priority, id }) => {
        hadListeners = true;
        this._safeExecute(
          callback,
          data,
          event,
          `priority:${priority} id:${id}`
        );
      });
    }

    return hadListeners;
  }

  /**
   * Removes a specific listener from an event
   *
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   * @returns {boolean} True if listener was found and removed
   *
   * @example
   * const handler = (data) => console.log(data);
   * eventBus.on('test', handler);
   * eventBus.off('test', handler); // Removes the listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return false;
    }

    const eventListeners = this.listeners.get(event);
    const initialLength = eventListeners.length;

    // Filter out the matching callback
    const filteredListeners = eventListeners.filter(
      (listener) => listener.callback !== callback
    );

    if (filteredListeners.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filteredListeners);
    }

    const removed = initialLength !== filteredListeners.length;

    if (this.debugMode && removed) {
      console.log(`[EventBus] Unsubscribed from '${event}'`);
    }

    return removed;
  }

  /**
   * Removes a specific one-time listener from an event
   *
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   * @returns {boolean} True if listener was found and removed
   */
  offOnce(event, callback) {
    if (!this.onceListeners.has(event)) {
      return false;
    }

    const onceCallbacks = this.onceListeners.get(event);
    const initialLength = onceCallbacks.length;

    const filteredCallbacks = onceCallbacks.filter((cb) => cb !== callback);

    if (filteredCallbacks.length === 0) {
      this.onceListeners.delete(event);
    } else {
      this.onceListeners.set(event, filteredCallbacks);
    }

    return initialLength !== filteredCallbacks.length;
  }

  /**
   * Removes all listeners for a specific event
   *
   * @param {string} event - Event name to clear
   * @returns {number} Number of listeners removed
   *
   * @example
   * eventBus.removeAllListeners('game:end'); // Removes all listeners for this event
   */
  removeAllListeners(event) {
    let removedCount = 0;

    if (this.listeners.has(event)) {
      removedCount += this.listeners.get(event).length;
      this.listeners.delete(event);
    }

    if (this.onceListeners.has(event)) {
      removedCount += this.onceListeners.get(event).length;
      this.onceListeners.delete(event);
    }

    if (this.debugMode && removedCount > 0) {
      console.log(
        `[EventBus] Removed ${removedCount} listeners for '${event}'`
      );
    }

    return removedCount;
  }

  /**
   * Clears all listeners for all events
   * Use with caution as this will break all event subscriptions
   *
   * @returns {number} Total number of listeners removed
   */
  clear() {
    let totalRemoved = 0;

    for (const [, listeners] of this.listeners) {
      totalRemoved += listeners.length;
    }

    for (const [, onceListeners] of this.onceListeners) {
      totalRemoved += onceListeners.length;
    }

    this.listeners.clear();
    this.onceListeners.clear();

    if (this.debugMode) {
      console.log(`[EventBus] Cleared all listeners (${totalRemoved} total)`);
    }

    return totalRemoved;
  }

  /**
   * Gets the number of listeners for a specific event
   *
   * @param {string} event - Event name to check
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    const regularCount = this.listeners.has(event)
      ? this.listeners.get(event).length
      : 0;
    const onceCount = this.onceListeners.has(event)
      ? this.onceListeners.get(event).length
      : 0;
    return regularCount + onceCount;
  }

  /**
   * Gets all events that have listeners
   *
   * @returns {Array<string>} Array of event names
   */
  getEvents() {
    const events = new Set();

    for (const event of this.listeners.keys()) {
      events.add(event);
    }

    for (const event of this.onceListeners.keys()) {
      events.add(event);
    }

    return Array.from(events);
  }

  /**
   * Enables or disables debug mode
   * In debug mode, the EventBus logs subscription and emission activities
   *
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[EventBus] Debug mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Gets recent event history
   * Useful for debugging and understanding event flow
   *
   * @param {number} [limit=10] - Number of recent events to return
   * @returns {Array<{event: string, timestamp: number, data: any}>} Recent events
   */
  getEventHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clears the event history
   */
  clearHistory() {
    this.eventHistory = [];
    if (this.debugMode) {
      console.log("[EventBus] Event history cleared");
    }
  }

  /**
   * Validates event name
   * @private
   * @param {string} event - Event name to validate
   * @throws {Error} If event name is invalid
   */
  _validateEvent(event) {
    if (typeof event !== "string" || event.trim() === "") {
      throw new Error("Event name must be a non-empty string");
    }
  }

  /**
   * Validates callback function
   * @private
   * @param {Function} callback - Callback to validate
   * @throws {Error} If callback is not a function
   */
  _validateCallback(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }
  }

  /**
   * Safely executes a callback with error isolation
   * @private
   * @param {Function} callback - Callback to execute
   * @param {*} data - Data to pass to callback
   * @param {string} event - Event name for error context
   * @param {string} listenerInfo - Additional info about the listener
   */
  _safeExecute(callback, data, event, listenerInfo) {
    try {
      callback(data);
    } catch (error) {
      console.error(
        `[EventBus] Error in listener for '${event}' (${listenerInfo}):`,
        error
      );

      // Optionally emit an error event
      if (event !== "eventbus:error") {
        // Prevent infinite recursion
        this.emit("eventbus:error", {
          originalEvent: event,
          error,
          listenerInfo,
        });
      }
    }
  }

  /**
   * Records an event in history
   * @private
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  _recordEvent(event, data) {
    this.eventHistory.push({
      event,
      timestamp: Date.now(),
      data: this._cloneData(data),
    });

    // Limit history size
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory.shift();
    }
  }

  /**
   * Creates a safe clone of event data for history
   * @private
   * @param {*} data - Data to clone
   * @returns {*} Cloned data
   */
  _cloneData(data) {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      // If data can't be serialized, store a string representation
      return String(data);
    }
  }
}

// Export a singleton instance for global use
export const globalEventBus = new EventBus();
