/**
 * @fileoverview Core game loop system for maintaining 60FPS updates
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description GameLoop provides a stable 60FPS update cycle for the game engine.
 * It manages delta time calculations, subscriber notifications, and performance monitoring.
 * Uses requestAnimationFrame for optimal browser performance.
 *
 * @example
 * import { GameLoop } from './GameLoop.js';
 *
 * const gameLoop = new GameLoop();
 *
 * // Subscribe to updates
 * const unsubscribe = gameLoop.subscribe((deltaTime, totalTime) => {
 *     updateGameLogic(deltaTime);
 *     renderGame();
 * }, 10); // Priority 10
 *
 * gameLoop.start();
 */

import { globalEventBus } from "../events/EventBus.js";
import { SYSTEM_EVENTS } from "../events/EventTypes.js";

/**
 * Core game loop system managing 60FPS updates with delta time
 * Provides subscription-based update notifications to game systems
 */
export class GameLoop {
  /**
   * Creates a new GameLoop instance
   *
   * @param {Object} [config={}] - Configuration options
   * @param {number} [config.targetFPS=60] - Target frames per second
   * @param {boolean} [config.enablePerformanceMonitoring=true] - Enable FPS monitoring
   * @param {EventBus} [config.eventBus] - Custom event bus instance
   */
  constructor(config = {}) {
    // Configuration
    this.targetFPS = config.targetFPS || 60;
    this.targetFrameTime = 1000 / this.targetFPS; // Target time per frame in ms
    this.enablePerformanceMonitoring =
      config.enablePerformanceMonitoring !== false;
    this.eventBus = config.eventBus || globalEventBus;

    // Loop state
    this.isRunning = false;
    this.isPaused = false;
    this.animationFrameId = null;

    // Timing data
    this.lastTime = 0;
    this.currentTime = 0;
    this.deltaTime = 0;
    this.totalTime = 0;
    this.frameCount = 0;

    // Subscribers with priority support
    /** @type {Array<{callback: Function, priority: number, id: string, enabled: boolean}>} */
    this.subscribers = [];
    this.subscriberIdCounter = 0;

    // Performance monitoring
    this.performanceData = {
      fps: 0,
      averageFrameTime: 0,
      minFrameTime: Infinity,
      maxFrameTime: 0,
      frameTimeHistory: [],
      historySize: 60, // Keep 1 second of history at 60fps
      lastFPSUpdate: 0,
      fpsUpdateInterval: 1000, // Update FPS counter every second
    };

    // Frame time smoothing
    this.frameTimeSmoothing = true;
    this.smoothingFactor = 0.9;
    this.smoothedFrameTime = this.targetFrameTime;

    // Performance thresholds
    this.performanceThresholds = {
      lowFPS: 45,
      criticalFPS: 30,
      highFrameTime: 20, // ms
      criticalFrameTime: 33, // ms (30fps equivalent)
    };

    // Bind methods to maintain context
    this.loop = this.loop.bind(this);

    // Initialize
    this.initializePerformanceMonitoring();
  }

  /**
   * Starts the game loop
   *
   * @returns {boolean} True if started successfully, false if already running
   *
   * @example
   * gameLoop.start();
   */
  start() {
    if (this.isRunning) {
      console.warn("GameLoop: Already running");
      return false;
    }

    console.log("GameLoop: Starting...");

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.totalTime = 0;
    this.frameCount = 0;

    // Reset performance data
    this.resetPerformanceData();

    // Emit start event
    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_START, {
      targetFPS: this.targetFPS,
      targetFrameTime: this.targetFrameTime,
    });

    // Start the loop
    this.animationFrameId = requestAnimationFrame(this.loop);

    return true;
  }

  /**
   * Stops the game loop
   *
   * @returns {boolean} True if stopped successfully, false if not running
   */
  stop() {
    if (!this.isRunning) {
      console.warn("GameLoop: Not running");
      return false;
    }

    console.log("GameLoop: Stopping...");

    this.isRunning = false;
    this.isPaused = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Emit stop event
    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_STOP, {
      totalTime: this.totalTime,
      frameCount: this.frameCount,
      averageFPS: this.performanceData.fps,
    });

    return true;
  }

  /**
   * Pauses the game loop (stops time progression but keeps loop running)
   *
   * @returns {boolean} True if paused successfully
   */
  pause() {
    if (!this.isRunning) {
      console.warn("GameLoop: Cannot pause - not running");
      return false;
    }

    if (this.isPaused) {
      console.warn("GameLoop: Already paused");
      return false;
    }

    console.log("GameLoop: Pausing...");
    this.isPaused = true;

    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_PAUSE, {
      totalTime: this.totalTime,
      frameCount: this.frameCount,
    });

    return true;
  }

  /**
   * Resumes the game loop from pause
   *
   * @returns {boolean} True if resumed successfully
   */
  resume() {
    if (!this.isRunning) {
      console.warn("GameLoop: Cannot resume - not running");
      return false;
    }

    if (!this.isPaused) {
      console.warn("GameLoop: Not paused");
      return false;
    }

    console.log("GameLoop: Resuming...");
    this.isPaused = false;

    // Reset timing to prevent large delta time jump
    this.lastTime = performance.now();

    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_RESUME, {
      totalTime: this.totalTime,
      frameCount: this.frameCount,
    });

    return true;
  }

  /**
   * Subscribes a callback function to receive loop updates
   *
   * @param {Function} callback - Function to call each frame (deltaTime, totalTime) => void
   * @param {number} [priority=0] - Execution priority (higher = earlier)
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.enabled=true] - Whether subscriber is initially enabled
   * @returns {Function} Unsubscribe function
   * @throws {Error} If callback is not a function
   *
   * @example
   * const unsubscribe = gameLoop.subscribe((deltaTime, totalTime) => {
   *     // Update game logic
   *     player.update(deltaTime);
   *     ai.update(deltaTime);
   * }, 10);
   *
   * // Later, unsubscribe
   * unsubscribe();
   */
  subscribe(callback, priority = 0, options = {}) {
    if (typeof callback !== "function") {
      throw new Error("GameLoop: Callback must be a function");
    }

    const subscriber = {
      callback,
      priority,
      id: `subscriber_${++this.subscriberIdCounter}`,
      enabled: options.enabled !== false,
    };

    this.subscribers.push(subscriber);

    // Sort by priority (highest first)
    this.subscribers.sort((a, b) => b.priority - a.priority);

    console.log(
      `GameLoop: Subscribed ${subscriber.id} with priority ${priority}`
    );

    // Return unsubscribe function
    return () => this.unsubscribe(subscriber.id);
  }

  /**
   * Unsubscribes a callback using its ID or the callback function itself
   *
   * @param {string|Function} idOrCallback - Subscriber ID or callback function
   * @returns {boolean} True if unsubscribed successfully
   */
  unsubscribe(idOrCallback) {
    const initialLength = this.subscribers.length;

    if (typeof idOrCallback === "string") {
      // Remove by ID
      this.subscribers = this.subscribers.filter(
        (sub) => sub.id !== idOrCallback
      );
    } else if (typeof idOrCallback === "function") {
      // Remove by callback function
      this.subscribers = this.subscribers.filter(
        (sub) => sub.callback !== idOrCallback
      );
    }

    const removed = this.subscribers.length !== initialLength;

    if (removed) {
      console.log("GameLoop: Unsubscribed successfully");
    }

    return removed;
  }

  /**
   * Enables or disables a subscriber
   *
   * @param {string} subscriberId - Subscriber ID
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} True if subscriber was found and updated
   */
  setSubscriberEnabled(subscriberId, enabled) {
    const subscriber = this.subscribers.find((sub) => sub.id === subscriberId);

    if (subscriber) {
      subscriber.enabled = enabled;
      return true;
    }

    return false;
  }

  /**
   * Main game loop function
   * Called by requestAnimationFrame
   *
   * @private
   * @param {number} currentTime - Current timestamp from requestAnimationFrame
   */
  loop(currentTime) {
    if (!this.isRunning) {
      return;
    }

    // Calculate frame timing
    this.currentTime = currentTime;
    const rawDeltaTime = this.currentTime - this.lastTime;

    // Handle paused state
    if (this.isPaused) {
      this.lastTime = this.currentTime;
      this.animationFrameId = requestAnimationFrame(this.loop);
      return;
    }

    // Calculate delta time (cap at maximum to prevent spiral of death)
    this.deltaTime = Math.min(rawDeltaTime, 50); // Cap at 50ms (20fps minimum)

    // Apply frame time smoothing if enabled
    if (this.frameTimeSmoothing) {
      this.smoothedFrameTime =
        this.smoothedFrameTime * this.smoothingFactor +
        rawDeltaTime * (1 - this.smoothingFactor);
    }

    // Update totals
    this.totalTime += this.deltaTime;
    this.frameCount++;
    this.lastTime = this.currentTime;

    // Update performance monitoring
    if (this.enablePerformanceMonitoring) {
      this.updatePerformanceData(rawDeltaTime);
    }

    // Notify all enabled subscribers
    this.notifySubscribers();

    // Check for performance issues
    this.checkPerformance();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Notifies all enabled subscribers with current timing data
   *
   * @private
   */
  notifySubscribers() {
    const enabledSubscribers = this.subscribers.filter((sub) => sub.enabled);

    for (const subscriber of enabledSubscribers) {
      try {
        subscriber.callback(this.deltaTime, this.totalTime, this.frameCount);
      } catch (error) {
        console.error(`GameLoop: Error in subscriber ${subscriber.id}:`, error);

        // Emit error event
        this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_SUBSCRIBER_ERROR, {
          subscriberId: subscriber.id,
          error: error.message,
          stack: error.stack,
        });

        // Optionally disable problematic subscriber
        if (error.critical) {
          subscriber.enabled = false;
          console.warn(
            `GameLoop: Disabled subscriber ${subscriber.id} due to critical error`
          );
        }
      }
    }
  }

  /**
   * Initializes performance monitoring
   *
   * @private
   */
  initializePerformanceMonitoring() {
    if (!this.enablePerformanceMonitoring) {
      return;
    }

    // Listen for visibility changes to pause monitoring when tab is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pause();
        this.eventBus.emit(SYSTEM_EVENTS.FOCUS_LOST);
      } else {
        this.resume();
        this.eventBus.emit(SYSTEM_EVENTS.FOCUS_GAINED);
      }
    });
  }

  /**
   * Updates performance monitoring data
   *
   * @private
   * @param {number} frameTime - Raw frame time in milliseconds
   */
  updatePerformanceData(frameTime) {
    const perf = this.performanceData;

    // Update frame time statistics
    perf.minFrameTime = Math.min(perf.minFrameTime, frameTime);
    perf.maxFrameTime = Math.max(perf.maxFrameTime, frameTime);

    // Add to history
    perf.frameTimeHistory.push(frameTime);
    if (perf.frameTimeHistory.length > perf.historySize) {
      perf.frameTimeHistory.shift();
    }

    // Calculate average frame time
    perf.averageFrameTime =
      perf.frameTimeHistory.reduce((a, b) => a + b, 0) /
      perf.frameTimeHistory.length;

    // Update FPS counter
    if (this.currentTime - perf.lastFPSUpdate >= perf.fpsUpdateInterval) {
      perf.fps = Math.round(1000 / perf.averageFrameTime);
      perf.lastFPSUpdate = this.currentTime;

      // Emit FPS update event
      this.eventBus.emit(SYSTEM_EVENTS.FPS_UPDATE, {
        fps: perf.fps,
        averageFrameTime: perf.averageFrameTime,
        minFrameTime: perf.minFrameTime,
        maxFrameTime: perf.maxFrameTime,
      });
    }
  }

  /**
   * Checks for performance issues and emits warnings
   *
   * @private
   */
  checkPerformance() {
    if (!this.enablePerformanceMonitoring) {
      return;
    }

    const perf = this.performanceData;

    // Check for low FPS
    if (perf.fps > 0 && perf.fps < this.performanceThresholds.lowFPS) {
      this.eventBus.emit(SYSTEM_EVENTS.FPS_DROP, {
        currentFPS: perf.fps,
        targetFPS: this.targetFPS,
        severity:
          perf.fps < this.performanceThresholds.criticalFPS
            ? "critical"
            : "warning",
      });
    }

    // Check for high frame times
    if (perf.averageFrameTime > this.performanceThresholds.highFrameTime) {
      this.eventBus.emit(SYSTEM_EVENTS.PERFORMANCE_WARNING, {
        type: "high_frame_time",
        averageFrameTime: perf.averageFrameTime,
        targetFrameTime: this.targetFrameTime,
        severity:
          perf.averageFrameTime > this.performanceThresholds.criticalFrameTime
            ? "critical"
            : "warning",
      });
    }
  }

  /**
   * Resets performance monitoring data
   *
   * @private
   */
  resetPerformanceData() {
    this.performanceData.fps = 0;
    this.performanceData.averageFrameTime = 0;
    this.performanceData.minFrameTime = Infinity;
    this.performanceData.maxFrameTime = 0;
    this.performanceData.frameTimeHistory = [];
    this.performanceData.lastFPSUpdate = 0;
  }

  /**
   * Gets current performance statistics
   *
   * @returns {Object} Performance data object
   */
  getPerformanceData() {
    return {
      ...this.performanceData,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      totalTime: this.totalTime,
      frameCount: this.frameCount,
      subscriberCount: this.subscribers.length,
      enabledSubscriberCount: this.subscribers.filter((sub) => sub.enabled)
        .length,
    };
  }

  /**
   * Gets current game loop state
   *
   * @returns {Object} Current state information
   */
  getState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      deltaTime: this.deltaTime,
      totalTime: this.totalTime,
      frameCount: this.frameCount,
      targetFPS: this.targetFPS,
      currentFPS: this.performanceData.fps,
      subscriberCount: this.subscribers.length,
      performanceMonitoring: this.enablePerformanceMonitoring,
    };
  }

  /**
   * Updates game loop configuration
   *
   * @param {Object} config - Configuration updates
   * @param {number} [config.targetFPS] - New target FPS
   * @param {boolean} [config.enablePerformanceMonitoring] - Enable/disable performance monitoring
   * @param {boolean} [config.frameTimeSmoothing] - Enable/disable frame time smoothing
   */
  updateConfig(config) {
    if (config.targetFPS !== undefined) {
      this.targetFPS = Math.max(1, Math.min(144, config.targetFPS)); // Clamp between 1-144 FPS
      this.targetFrameTime = 1000 / this.targetFPS;
      console.log(`GameLoop: Target FPS updated to ${this.targetFPS}`);
    }

    if (config.enablePerformanceMonitoring !== undefined) {
      this.enablePerformanceMonitoring = config.enablePerformanceMonitoring;
      if (!this.enablePerformanceMonitoring) {
        this.resetPerformanceData();
      }
    }

    if (config.frameTimeSmoothing !== undefined) {
      this.frameTimeSmoothing = config.frameTimeSmoothing;
    }

    // Emit config update event
    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_CONFIG_UPDATE, {
      targetFPS: this.targetFPS,
      enablePerformanceMonitoring: this.enablePerformanceMonitoring,
      frameTimeSmoothing: this.frameTimeSmoothing,
    });
  }

  /**
   * Cleanup method to properly dispose of the GameLoop
   * Removes event listeners and cancels animation frame
   */
  dispose() {
    console.log("GameLoop: Disposing...");

    this.stop();
    this.subscribers = [];

    // Remove visibility change listener
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );

    this.eventBus.emit(SYSTEM_EVENTS.GAMELOOP_DISPOSED);
  }
}

// Export a singleton instance for global use
export const globalGameLoop = new GameLoop();
