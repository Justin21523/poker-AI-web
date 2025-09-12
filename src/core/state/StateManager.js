/**
 * @fileoverview Core state management system using finite state machine pattern
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description StateManager implements a finite state machine to manage
 * game flow and state transitions. It provides validation, history tracking,
 * and event-driven state changes with rollback capabilities.
 *
 * @example
 * import { StateManager } from './StateManager.js';
 *
 * const stateManager = new StateManager({
 *   initialState: 'waiting',
 *   states: {
 *     waiting: { transitions: ['dealing'] },
 *     dealing: { transitions: ['playing'] },
 *     playing: { transitions: ['scoring', 'ended'] }
 *   }
 * });
 *
 * stateManager.transitionTo('dealing');
 */

import { EventBus } from "../events/EventBus.js";
import { GAME_EVENTS, SYSTEM_EVENTS } from "../events/EventTypes.js";

/**
 * Core state management system using finite state machine pattern
 * Manages game state transitions with validation and history tracking
 */
export class StateManager {
  /**
   * Creates a new StateManager instance
   *
   * @param {Object} config - State machine configuration
   * @param {string} config.initialState - Initial state name
   * @param {Object} config.states - State definitions with transitions
   * @param {EventBus} [config.eventBus] - EventBus instance for communication
   * @param {boolean} [config.enableHistory=true] - Whether to track state history
   * @param {number} [config.maxHistoryLength=50] - Maximum history entries to keep
   */
  constructor(config) {
    this.validateConfig(config);

    /** @type {string} Current state name */
    this.currentState = config.initialState;

    /** @type {Object} State definitions with their allowed transitions */
    this.states = config.states;

    /** @type {EventBus} Event bus for state change notifications */
    this.eventBus = config.eventBus || new EventBus();

    /** @type {boolean} Whether history tracking is enabled */
    this.enableHistory = config.enableHistory !== false;

    /** @type {number} Maximum number of history entries to keep */
    this.maxHistoryLength = config.maxHistoryLength || 50;

    /** @type {Array<StateTransition>} History of state transitions */
    this.history = [];

    /** @type {Object} Additional state data storage */
    this.stateData = {};

    /** @type {Map<string, Function>} State entry callbacks */
    this.entryCallbacks = new Map();

    /** @type {Map<string, Function>} State exit callbacks */
    this.exitCallbacks = new Map();

    /** @type {Map<string, Function>} State transition guards */
    this.transitionGuards = new Map();

    /** @type {boolean} Whether the state machine is locked (transitions disabled) */
    this.isLocked = false;

    /** @type {number} Timestamp when current state was entered */
    this.stateEnteredAt = Date.now();

    this.initializeStateCallbacks();
  }

  /**
   * Validates the state manager configuration
   * @private
   * @param {Object} config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (!config.initialState) {
      throw new Error("StateManager: initialState is required");
    }

    if (!config.states || typeof config.states !== "object") {
      throw new Error("StateManager: states configuration is required");
    }

    if (!config.states[config.initialState]) {
      throw new Error(
        `StateManager: initialState '${config.initialState}' not found in states`
      );
    }

    // Validate state definitions
    for (const [stateName, stateConfig] of Object.entries(config.states)) {
      if (!stateConfig.transitions || !Array.isArray(stateConfig.transitions)) {
        throw new Error(
          `StateManager: state '${stateName}' must have transitions array`
        );
      }

      // Validate that all transition targets exist
      for (const targetState of stateConfig.transitions) {
        if (!config.states[targetState]) {
          throw new Error(
            `StateManager: transition target '${targetState}' not found in states`
          );
        }
      }
    }
  }

  /**
   * Initialize default state callbacks
   * @private
   */
  initializeStateCallbacks() {
    // Set up default entry callbacks for each state
    for (const stateName of Object.keys(this.states)) {
      this.onStateEntry(stateName, (data) => {
        this.eventBus.emit(GAME_EVENTS.PHASE_CHANGE, {
          from: this.getPreviousState(),
          to: stateName,
          timestamp: Date.now(),
          data,
        });
      });
    }
  }

  /**
   * Attempts to transition to a new state
   *
   * @param {string} targetState - State to transition to
   * @param {*} [data] - Optional data to pass with the transition
   * @returns {boolean} True if transition was successful
   * @throws {Error} If transition is invalid or state machine is locked
   *
   * @example
   * const success = stateManager.transitionTo('playing', {
   *   players: 4,
   *   gameType: 'old-maid'
   * });
   */
  transitionTo(targetState, data = null) {
    if (this.isLocked) {
      throw new Error("StateManager: transitions are locked");
    }

    if (!this.canTransitionTo(targetState)) {
      throw new Error(
        `StateManager: invalid transition from '${this.currentState}' to '${targetState}'`
      );
    }

    // Check transition guard if exists
    const guardKey = `${this.currentState}->${targetState}`;
    const guard = this.transitionGuards.get(guardKey);
    if (guard && !guard(data)) {
      throw new Error(
        `StateManager: transition guard prevented transition from '${this.currentState}' to '${targetState}'`
      );
    }

    const previousState = this.currentState;
    const transitionTimestamp = Date.now();

    try {
      // Execute exit callback for current state
      this.executeExitCallback(this.currentState, data);

      // Record transition in history
      if (this.enableHistory) {
        this.recordTransition(
          previousState,
          targetState,
          data,
          transitionTimestamp
        );
      }

      // Update current state
      this.currentState = targetState;
      this.stateEnteredAt = transitionTimestamp;

      // Execute entry callback for new state
      this.executeEntryCallback(targetState, data);

      return true;
    } catch (error) {
      // Rollback on error
      this.currentState = previousState;

      this.eventBus.emit(SYSTEM_EVENTS.ERROR_OCCURRED, {
        type: "state_transition_error",
        from: previousState,
        to: targetState,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Checks if transition to target state is valid
   *
   * @param {string} targetState - State to check transition to
   * @returns {boolean} True if transition is allowed
   */
  canTransitionTo(targetState) {
    if (!this.states[targetState]) {
      return false;
    }

    const currentStateConfig = this.states[this.currentState];
    return currentStateConfig.transitions.includes(targetState);
  }

  /**
   * Forces a state change without validation (use with caution)
   *
   * @param {string} targetState - State to force transition to
   * @param {*} [data] - Optional data to pass with the transition
   * @throws {Error} If target state doesn't exist
   */
  forceState(targetState, data = null) {
    if (!this.states[targetState]) {
      throw new Error(
        `StateManager: target state '${targetState}' does not exist`
      );
    }

    const previousState = this.currentState;
    this.currentState = targetState;
    this.stateEnteredAt = Date.now();

    if (this.enableHistory) {
      this.recordTransition(previousState, targetState, data, Date.now(), true);
    }

    this.executeEntryCallback(targetState, data);

    this.eventBus.emit(SYSTEM_EVENTS.WARNING_OCCURRED, {
      type: "forced_state_transition",
      from: previousState,
      to: targetState,
    });
  }

  /**
   * Gets the current state name
   *
   * @returns {string} Current state name
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Gets the previous state from history
   *
   * @returns {string|null} Previous state name or null if no history
   */
  getPreviousState() {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1].fromState;
  }

  /**
   * Gets how long the current state has been active (in milliseconds)
   *
   * @returns {number} Time in current state
   */
  getTimeInCurrentState() {
    return Date.now() - this.stateEnteredAt;
  }

  /**
   * Sets data associated with the current state
   *
   * @param {string} key - Data key
   * @param {*} value - Data value
   */
  setStateData(key, value) {
    if (!this.stateData[this.currentState]) {
      this.stateData[this.currentState] = {};
    }
    this.stateData[this.currentState][key] = value;
  }

  /**
   * Gets data associated with the current state
   *
   * @param {string} key - Data key
   * @returns {*} Data value or undefined if not found
   */
  getStateData(key) {
    const currentStateData = this.stateData[this.currentState];
    return currentStateData ? currentStateData[key] : undefined;
  }

  /**
   * Gets all data for the current state
   *
   * @returns {Object} Current state data
   */
  getAllStateData() {
    return this.stateData[this.currentState] || {};
  }

  /**
   * Clears all data for the current state
   */
  clearStateData() {
    delete this.stateData[this.currentState];
  }

  /**
   * Registers a callback to execute when entering a specific state
   *
   * @param {string} stateName - State name
   * @param {Function} callback - Callback function to execute
   * @returns {Function} Unregister function
   */
  onStateEntry(stateName, callback) {
    if (!this.states[stateName]) {
      throw new Error(`StateManager: state '${stateName}' does not exist`);
    }

    this.entryCallbacks.set(stateName, callback);

    // Return unregister function
    return () => this.entryCallbacks.delete(stateName);
  }

  /**
   * Registers a callback to execute when exiting a specific state
   *
   * @param {string} stateName - State name
   * @param {Function} callback - Callback function to execute
   * @returns {Function} Unregister function
   */
  onStateExit(stateName, callback) {
    if (!this.states[stateName]) {
      throw new Error(`StateManager: state '${stateName}' does not exist`);
    }

    this.exitCallbacks.set(stateName, callback);

    // Return unregister function
    return () => this.exitCallbacks.delete(stateName);
  }

  /**
   * Registers a guard function for a specific transition
   * Guard functions can prevent transitions by returning false
   *
   * @param {string} fromState - Source state
   * @param {string} toState - Target state
   * @param {Function} guardFunction - Function that returns boolean
   * @returns {Function} Unregister function
   */
  addTransitionGuard(fromState, toState, guardFunction) {
    const guardKey = `${fromState}->${toState}`;
    this.transitionGuards.set(guardKey, guardFunction);

    // Return unregister function
    return () => this.transitionGuards.delete(guardKey);
  }

  /**
   * Locks the state machine, preventing all transitions
   * Useful for critical operations or cleanup
   */
  lock() {
    this.isLocked = true;
    this.eventBus.emit(SYSTEM_EVENTS.DEBUG_MESSAGE, {
      type: "state_machine_locked",
      currentState: this.currentState,
    });
  }

  /**
   * Unlocks the state machine, allowing transitions again
   */
  unlock() {
    this.isLocked = false;
    this.eventBus.emit(SYSTEM_EVENTS.DEBUG_MESSAGE, {
      type: "state_machine_unlocked",
      currentState: this.currentState,
    });
  }

  /**
   * Attempts to rollback to the previous state
   *
   * @returns {boolean} True if rollback was successful
   */
  rollback() {
    if (this.history.length === 0) {
      return false;
    }

    const lastTransition = this.history[this.history.length - 1];

    try {
      // Check if we can transition back
      if (!this.canTransitionTo(lastTransition.fromState)) {
        return false;
      }

      this.transitionTo(lastTransition.fromState, {
        isRollback: true,
        originalTransition: lastTransition,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the complete state transition history
   *
   * @param {number} [limit] - Maximum number of entries to return
   * @returns {Array<StateTransition>} Array of state transitions
   */
  getHistory(limit = null) {
    const history = [...this.history];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clears the state transition history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Gets all possible next states from current state
   *
   * @returns {Array<string>} Array of possible next state names
   */
  getPossibleNextStates() {
    return [...this.states[this.currentState].transitions];
  }

  /**
   * Gets information about all states
   *
   * @returns {Object} State information object
   */
  getStateInfo() {
    return {
      currentState: this.currentState,
      previousState: this.getPreviousState(),
      timeInCurrentState: this.getTimeInCurrentState(),
      possibleNextStates: this.getPossibleNextStates(),
      isLocked: this.isLocked,
      stateData: this.getAllStateData(),
      historyLength: this.history.length,
    };
  }

  /**
   * Resets the state machine to initial state
   *
   * @param {boolean} [clearHistory=false] - Whether to clear history
   * @param {boolean} [clearData=false] - Whether to clear all state data
   */
  reset(clearHistory = false, clearData = false) {
    const initialState = Object.keys(this.states)[0]; // Get first defined state

    this.executeExitCallback(this.currentState);

    this.currentState = initialState;
    this.stateEnteredAt = Date.now();
    this.isLocked = false;

    if (clearHistory) {
      this.clearHistory();
    }

    if (clearData) {
      this.stateData = {};
    }

    this.executeEntryCallback(initialState);

    this.eventBus.emit(GAME_EVENTS.GAME_RESET, {
      resetToState: initialState,
      clearedHistory: clearHistory,
      clearedData: clearData,
    });
  }

  /**
   * Executes entry callback for a state
   * @private
   * @param {string} stateName - State name
   * @param {*} [data] - Transition data
   */
  executeEntryCallback(stateName, data = null) {
    const callback = this.entryCallbacks.get(stateName);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        this.eventBus.emit(SYSTEM_EVENTS.ERROR_OCCURRED, {
          type: "state_entry_callback_error",
          stateName,
          error: error.message,
        });
      }
    }
  }

  /**
   * Executes exit callback for a state
   * @private
   * @param {string} stateName - State name
   * @param {*} [data] - Transition data
   */
  executeExitCallback(stateName, data = null) {
    const callback = this.exitCallbacks.get(stateName);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        this.eventBus.emit(SYSTEM_EVENTS.ERROR_OCCURRED, {
          type: "state_exit_callback_error",
          stateName,
          error: error.message,
        });
      }
    }
  }

  /**
   * Records a state transition in history
   * @private
   * @param {string} fromState - Source state
   * @param {string} toState - Target state
   * @param {*} data - Transition data
   * @param {number} timestamp - Transition timestamp
   * @param {boolean} [forced=false] - Whether transition was forced
   */
  recordTransition(fromState, toState, data, timestamp, forced = false) {
    const transition = {
      fromState,
      toState,
      data,
      timestamp,
      forced,
      duration: timestamp - this.stateEnteredAt,
    };

    this.history.push(transition);

    // Limit history size
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }
}

/**
 * @typedef {Object} StateTransition
 * @property {string} fromState - Source state name
 * @property {string} toState - Target state name
 * @property {*} data - Transition data
 * @property {number} timestamp - When transition occurred
 * @property {boolean} forced - Whether transition was forced
 * @property {number} duration - Time spent in source state
 */
