/**
 * @fileoverview Advanced time management utilities for game systems
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description TimeManager provides utilities for time-based operations including
 * timers, delays, time scaling, and frame-rate independent calculations.
 * Works in conjunction with GameLoop for precise timing control.
 *
 * @example
 * import { TimeManager } from './TimeManager.js';
 *
 * const timeManager = new TimeManager(gameLoop);
 *
 * // Create a timer
 * timeManager.createTimer('player_turn', 30000, () => {
 *     console.log('Player turn timeout!');
 * });
 *
 * // Create a delay
 * await timeManager.delay(1000); // Wait 1 second
 */

import { globalEventBus } from "../events/EventBus.js";
import { SYSTEM_EVENTS } from "../events/EventTypes.js";

/**
 * Timer class for managing individual timers
 */
class Timer {
  /**
   * Creates a new Timer instance
   *
   * @param {string} id - Unique timer identifier
   * @param {number} duration - Timer duration in milliseconds
   * @param {Function} callback - Function to call when timer expires
   * @param {Object} [options={}] - Timer options
   */
  constructor(id, duration, callback, options = {}) {
    this.id = id;
    this.duration = duration;
    this.callback = callback;
    this.options = {
      repeat: options.repeat || false,
      autoStart: options.autoStart !== false,
      pauseWithGame: options.pauseWithGame !== false,
      ...options,
    };

    this.elapsed = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.repeatCount = 0;
    this.startTime = 0;

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Starts the timer
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();

    console.log(`Timer ${this.id}: Started (${this.duration}ms)`);
  }

  /**
   * Pauses the timer
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    console.log(`Timer ${this.id}: Paused at ${this.elapsed}ms`);
  }

  /**
   * Resumes the timer
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.startTime = performance.now() - this.elapsed;
    console.log(`Timer ${this.id}: Resumed`);
  }

  /**
   * Stops the timer
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    console.log(`Timer ${this.id}: Stopped`);
  }

  /**
   * Resets the timer
   */
  reset() {
    this.elapsed = 0;
    this.isCompleted = false;
    this.repeatCount = 0;
    this.startTime = performance.now();
    console.log(`Timer ${this.id}: Reset`);
  }

  /**
   * Updates the timer with delta time
   *
   * @param {number} deltaTime - Time elapsed since last update
   * @returns {boolean} True if timer triggered this frame
   */
  update(deltaTime) {
    if (!this.isRunning || this.isPaused || this.isCompleted) {
      return false;
    }

    this.elapsed += deltaTime;

    if (this.elapsed >= this.duration) {
      this.isCompleted = true;
      this.repeatCount++;

      try {
        this.callback(this);
      } catch (error) {
        console.error(`Timer ${this.id} callback error:`, error);
      }

      if (
        (this.options.repeat && !this.options.maxRepeats) ||
        this.repeatCount < this.options.maxRepeats
      ) {
        this.elapsed = 0;
        this.isCompleted = false;
      } else {
        this.stop();
      }

      return true;
    }

    return false;
  }

  /**
   * Gets timer progress as a value between 0 and 1
   *
   * @returns {number} Progress value (0-1)
   */
  getProgress() {
    return Math.min(this.elapsed / this.duration, 1);
  }

  /**
   * Gets remaining time in milliseconds
   *
   * @returns {number} Remaining time
   */
  getTimeRemaining() {
    return Math.max(0, this.duration - this.elapsed);
  }

  /**
   * Gets timer state information
   *
   * @returns {Object} Timer state
   */
  getState() {
    return {
      id: this.id,
      duration: this.duration,
      elapsed: this.elapsed,
      remaining: this.getTimeRemaining(),
      progress: this.getProgress(),
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted,
      repeatCount: this.repeatCount,
    };
  }
}

/**
 * TimeManager class for managing time-based operations
 */
export class TimeManager {
  /**
   * Creates a new TimeManager instance
   *
   * @param {GameLoop} gameLoop - GameLoop instance to subscribe to
   * @param {EventBus} [eventBus] - Event bus for notifications
   */
  constructor(gameLoop, eventBus) {
    this.gameLoop = gameLoop;
    this.eventBus = eventBus || globalEventBus;

    // Time scaling for slow motion / fast forward effects
    this.timeScale = 1.0;
    this.defaultTimeScale = 1.0;

    // Timer management
    this.timers = new Map();
    this.timerIdCounter = 0;

    // Delay management for async operations
    this.delays = new Map();
    this.delayIdCounter = 0;

    // Frame rate independent interpolation
    this.interpolationFactor = 0;
    this.fixedTimeStep = 1000 / 60; // 60 FPS equivalent

    // Performance tracking
    this.updateTime = 0;
    this.timerCount = 0;

    // Subscribe to game loop updates
    this.gameLoopUnsubscribe = this.gameLoop.subscribe(
      this.update.bind(this),
      5 // Medium priority
    );

    // Listen for game loop pause/resume
    this.setupEventHandlers();
  }

  /**
   * Sets up event handlers for game state changes
   *
   * @private
   */
  setupEventHandlers() {
    this.eventBus.on(SYSTEM_EVENTS.GAMELOOP_PAUSE, () => {
      this.pauseAllTimers();
    });

    this.eventBus.on(SYSTEM_EVENTS.GAMELOOP_RESUME, () => {
      this.resumeAllTimers();
    });
  }

  /**
   * Main update function called by GameLoop
   *
   * @private
   * @param {number} deltaTime - Time elapsed since last frame
   * @param {number} totalTime - Total time since game loop started
   */
  update(deltaTime, totalTime) {
    const updateStartTime = performance.now();

    // Apply time scaling
    const scaledDeltaTime = deltaTime * this.timeScale;

    // Update interpolation factor for smooth animations
    this.updateInterpolationFactor(scaledDeltaTime);

    // Update all active timers
    this.updateTimers(scaledDeltaTime);

    // Update delays
    this.updateDelays(scaledDeltaTime);

    // Track performance
    this.updateTime = performance.now() - updateStartTime;
    this.timerCount = this.timers.size;

    // Emit timing update for systems that need it
    this.eventBus.emit(SYSTEM_EVENTS.TIME_UPDATE, {
      deltaTime: scaledDeltaTime,
      totalTime,
      timeScale: this.timeScale,
      interpolationFactor: this.interpolationFactor,
      activeTimers: this.timerCount,
    });
  }

  /**
   * Updates interpolation factor for smooth frame-rate independent animations
   *
   * @private
   * @param {number} deltaTime - Scaled delta time
   */
  updateInterpolationFactor(deltaTime) {
    // Calculate interpolation factor (0-1) for smooth animations
    this.interpolationFactor = Math.min(deltaTime / this.fixedTimeStep, 1);
  }

  /**
   * Updates all active timers
   *
   * @private
   * @param {number} deltaTime - Scaled delta time
   */
  updateTimers(deltaTime) {
    for (const [id, timer] of this.timers) {
      const triggered = timer.update(deltaTime);

      if (triggered) {
        this.eventBus.emit(SYSTEM_EVENTS.TIMER_TRIGGERED, {
          timerId: id,
          timer: timer.getState(),
        });
      }

      // Remove completed non-repeating timers
      if (timer.isCompleted && !timer.options.repeat) {
        this.timers.delete(id);
        this.eventBus.emit(SYSTEM_EVENTS.TIMER_COMPLETED, {
          timerId: id,
          repeatCount: timer.repeatCount,
        });
      }
    }
  }

  /**
   * Updates all active delays
   *
   * @private
   * @param {number} deltaTime - Scaled delta time
   */
  updateDelays(deltaTime) {
    for (const [id, delay] of this.delays) {
      delay.elapsed += deltaTime;

      if (delay.elapsed >= delay.duration) {
        delay.resolve();
        this.delays.delete(id);
      }
    }
  }

  /**
   * Creates a new timer
   *
   * @param {string} id - Unique timer identifier
   * @param {number} duration - Timer duration in milliseconds
   * @param {Function} callback - Function to call when timer expires
   * @param {Object} [options={}] - Timer options
   * @returns {Timer} Created timer instance
   *
   * @example
   * const timer = timeManager.createTimer('player_turn', 30000, () => {
   *     console.log('Turn timeout!');
   * }, { repeat: false });
   */
  createTimer(id, duration, callback, options = {}) {
    if (this.timers.has(id)) {
      console.warn(`TimeManager: Timer with id '${id}' already exists`);
      this.removeTimer(id);
    }

    const timer = new Timer(id, duration, callback, options);
    this.timers.set(id, timer);

    this.eventBus.emit(SYSTEM_EVENTS.TIMER_CREATED, {
      timerId: id,
      duration,
      options,
    });

    return timer;
  }

  /**
   * Removes a timer by ID
   *
   * @param {string} id - Timer identifier
   * @returns {boolean} True if timer was removed
   */
  removeTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.stop();
      this.timers.delete(id);

      this.eventBus.emit(SYSTEM_EVENTS.TIMER_REMOVED, {
        timerId: id,
      });

      return true;
    }
    return false;
  }

  /**
   * Gets a timer by ID
   *
   * @param {string} id - Timer identifier
   * @returns {Timer|null} Timer instance or null if not found
   */
  getTimer(id) {
    return this.timers.get(id) || null;
  }

  /**
   * Pauses a specific timer
   *
   * @param {string} id - Timer identifier
   * @returns {boolean} True if timer was paused
   */
  pauseTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.pause();
      return true;
    }
    return false;
  }

  /**
   * Resumes a specific timer
   *
   * @param {string} id - Timer identifier
   * @returns {boolean} True if timer was resumed
   */
  resumeTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.resume();
      return true;
    }
    return false;
  }

  /**
   * Pauses all timers
   */
  pauseAllTimers() {
    for (const timer of this.timers.values()) {
      if (timer.options.pauseWithGame) {
        timer.pause();
      }
    }

    this.eventBus.emit(SYSTEM_EVENTS.ALL_TIMERS_PAUSED);
  }

  /**
   * Resumes all timers
   */
  resumeAllTimers() {
    for (const timer of this.timers.values()) {
      if (timer.options.pauseWithGame) {
        timer.resume();
      }
    }

    this.eventBus.emit(SYSTEM_EVENTS.ALL_TIMERS_RESUMED);
  }

  /**
   * Removes all timers
   */
  clearAllTimers() {
    for (const timer of this.timers.values()) {
      timer.stop();
    }

    this.timers.clear();

    this.eventBus.emit(SYSTEM_EVENTS.ALL_TIMERS_CLEARED);
  }

  /**
   * Creates a delay (returns a Promise that resolves after specified time)
   *
   * @param {number} duration - Delay duration in milliseconds
   * @param {Object} [options={}] - Delay options
   * @returns {Promise} Promise that resolves after the delay
   *
   * @example
   * await timeManager.delay(1000); // Wait 1 second
   * console.log('1 second has passed');
   */
  delay(duration, options = {}) {
    return new Promise((resolve) => {
      const id = `delay_${++this.delayIdCounter}`;

      this.delays.set(id, {
        id,
        duration,
        elapsed: 0,
        resolve,
        options,
      });
    });
  }

  /**
   * Sets the global time scale (for slow motion / fast forward effects)
   *
   * @param {number} scale - Time scale multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
   * @param {number} [duration] - Duration to apply the scale (in milliseconds), or permanent if not specified
   *
   * @example
   * timeManager.setTimeScale(0.5, 3000); // Slow motion for 3 seconds
   * timeManager.setTimeScale(2.0); // Permanent fast forward
   */
  setTimeScale(scale, duration) {
    const oldScale = this.timeScale;
    this.timeScale = Math.max(0, scale); // Prevent negative time

    this.eventBus.emit(SYSTEM_EVENTS.TIME_SCALE_CHANGED, {
      oldScale,
      newScale: this.timeScale,
      duration,
    });

    if (duration) {
      this.createTimer(
        `timescale_reset_${Date.now()}`,
        duration,
        () => {
          this.resetTimeScale();
        },
        { pauseWithGame: false }
      );
    }

    console.log(`TimeManager: Time scale set to ${this.timeScale}x`);
  }

  /**
   * Resets time scale to default (1.0)
   */
  resetTimeScale() {
    this.setTimeScale(this.defaultTimeScale);
  }

  /**
   * Gets the current time scale
   *
   * @returns {number} Current time scale multiplier
   */
  getTimeScale() {
    return this.timeScale;
  }

  /**
   * Calculates frame-rate independent lerp value
   *
   * @param {number} rate - Lerp rate (higher = faster interpolation)
   * @param {number} deltaTime - Delta time in milliseconds
   * @returns {number} Frame-rate independent lerp factor
   *
   * @example
   * const lerpFactor = timeManager.getFrameRateIndependentLerp(5, deltaTime);
   * position = lerp(position, target, lerpFactor);
   */
  getFrameRateIndependentLerp(rate, deltaTime) {
    return 1 - Math.exp(-rate * (deltaTime / 1000));
  }

  /**
   * Converts seconds to milliseconds
   *
   * @param {number} seconds - Time in seconds
   * @returns {number} Time in milliseconds
   */
  secondsToMs(seconds) {
    return seconds * 1000;
  }

  /**
   * Converts milliseconds to seconds
   *
   * @param {number} milliseconds - Time in milliseconds
   * @returns {number} Time in seconds
   */
  msToSeconds(milliseconds) {
    return milliseconds / 1000;
  }

  /**
   * Formats time as MM:SS or HH:MM:SS
   *
   * @param {number} milliseconds - Time in milliseconds
   * @param {boolean} [includeHours=false] - Whether to include hours
   * @returns {string} Formatted time string
   *
   * @example
   * timeManager.formatTime(90000); // "01:30"
   * timeManager.formatTime(3690000, true); // "01:01:30"
   */
  formatTime(milliseconds, includeHours = false) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => num.toString().padStart(2, "0");

    if (includeHours || hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    } else {
      return `${pad(minutes)}:${pad(seconds)}`;
    }
  }

  /**
   * Creates a countdown timer with formatted display
   *
   * @param {string} id - Timer identifier
   * @param {number} duration - Duration in milliseconds
   * @param {Function} onUpdate - Called each frame with formatted time string
   * @param {Function} [onComplete] - Called when countdown reaches zero
   * @param {Object} [options={}] - Timer options
   * @returns {Timer} Created countdown timer
   *
   * @example
   * timeManager.createCountdown('game_timer', 300000, (timeString) => {
   *     document.getElementById('timer').textContent = timeString;
   * }, () => {
   *     console.log('Time up!');
   * });
   */
  createCountdown(id, duration, onUpdate, onComplete, options = {}) {
    const timer = this.createTimer(id, duration, onComplete, {
      ...options,
      autoStart: true,
    });

    // Subscribe to updates to provide formatted time
    const unsubscribe = this.gameLoop.subscribe((deltaTime) => {
      if (timer.isRunning && !timer.isPaused) {
        const remaining = timer.getTimeRemaining();
        const formatted = this.formatTime(remaining, options.includeHours);
        onUpdate(formatted, remaining);
      }
    }, 1); // Low priority

    // Clean up subscription when timer completes
    const originalCallback = timer.callback;
    timer.callback = (timerInstance) => {
      unsubscribe();
      if (originalCallback) {
        originalCallback(timerInstance);
      }
    };

    return timer;
  }

  /**
   * Gets all active timers information
   *
   * @returns {Array<Object>} Array of timer state objects
   */
  getAllTimers() {
    return Array.from(this.timers.values()).map((timer) => timer.getState());
  }

  /**
   * Gets time manager statistics
   *
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      activeTimers: this.timers.size,
      activeDelays: this.delays.size,
      timeScale: this.timeScale,
      updateTime: this.updateTime,
      interpolationFactor: this.interpolationFactor,
      fixedTimeStep: this.fixedTimeStep,
    };
  }

  /**
   * Disposes of the TimeManager and cleans up resources
   */
  dispose() {
    console.log("TimeManager: Disposing...");

    // Clear all timers and delays
    this.clearAllTimers();
    this.delays.clear();

    // Unsubscribe from game loop
    if (this.gameLoopUnsubscribe) {
      this.gameLoopUnsubscribe();
    }

    this.eventBus.emit(SYSTEM_EVENTS.TIME_MANAGER_DISPOSED);
  }
}

// Utility functions for common time operations
export const TimeUtils = {
  /**
   * Linear interpolation between two values
   *
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} factor - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  },

  /**
   * Smooth step interpolation (S-curve)
   *
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} factor - Interpolation factor (0-1)
   * @returns {number} Smooth interpolated value
   */
  smoothStep(start, end, factor) {
    const t = Math.max(0, Math.min(1, factor));
    const smoothFactor = t * t * (3 - 2 * t);
    return this.lerp(start, end, smoothFactor);
  },

  /**
   * Easing function: ease in (quadratic)
   *
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeIn(t) {
    return t * t;
  },

  /**
   * Easing function: ease out (quadratic)
   *
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  },

  /**
   * Easing function: ease in-out (quadratic)
   *
   * @param {number} t - Time factor (0-1)
   * @returns {number} Eased value
   */
  easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  /**
   * Clamps a value between min and max
   *
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Maps a value from one range to another
   *
   * @param {number} value - Value to map
   * @param {number} inMin - Input range minimum
   * @param {number} inMax - Input range maximum
   * @param {number} outMin - Output range minimum
   * @param {number} outMax - Output range maximum
   * @returns {number} Mapped value
   */
  map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  },
};
