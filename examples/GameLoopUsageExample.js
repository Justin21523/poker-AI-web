/**
 * @fileoverview Real-world usage examples for GameLoop and TimeManager integration
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description This file demonstrates how to integrate GameLoop and TimeManager
 * in practical poker game scenarios, showing best practices for timing-dependent
 * game systems, animations, and AI decision making.
 */

import { GameLoop, globalGameLoop } from "../core/engine/GameLoop.js";
import { TimeManager, TimeUtils } from "../core/engine/TimeManager.js";
import { globalEventBus } from "../core/events/EventBus.js";
import {
  GAME_EVENTS,
  PLAYER_EVENTS,
  UI_EVENTS,
  SYSTEM_EVENTS,
} from "../core/events/EventTypes.js";

/**
 * Example 1: Game Engine with integrated timing system
 * Demonstrates how to build a game engine that manages multiple systems
 * with precise timing control
 */
class PokerGameEngine {
  constructor() {
    this.gameLoop = globalGameLoop;
    this.timeManager = new TimeManager(this.gameLoop, globalEventBus);
    this.eventBus = globalEventBus;

    // Game systems
    this.animationSystem = new AnimationSystem(this.timeManager);
    this.aiSystem = new AISystem(this.timeManager);
    this.uiSystem = new UISystem(this.timeManager);
    this.audioSystem = new AudioSystem(this.timeManager);

    // Game state
    this.gameState = "menu"; // menu, playing, paused, ended
    this.currentGame = null;
    this.players = [];

    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();

    this.initializeEventHandlers();
    this.setupPerformanceMonitoring();
  }

  initializeEventHandlers() {
    // Game flow events
    this.eventBus.on(
      GAME_EVENTS.GAME_START,
      this.handleGameStart.bind(this),
      10
    );
    this.eventBus.on(GAME_EVENTS.GAME_END, this.handleGameEnd.bind(this), 10);
    this.eventBus.on(
      GAME_EVENTS.GAME_PAUSE,
      this.handleGamePause.bind(this),
      10
    );
    this.eventBus.on(
      GAME_EVENTS.GAME_RESUME,
      this.handleGameResume.bind(this),
      10
    );

    // Performance events
    this.eventBus.on(
      SYSTEM_EVENTS.FPS_DROP,
      this.handlePerformanceIssue.bind(this)
    );
    this.eventBus.on(
      SYSTEM_EVENTS.PERFORMANCE_WARNING,
      this.handlePerformanceIssue.bind(this)
    );

    // System events
    this.eventBus.on(SYSTEM_EVENTS.FOCUS_LOST, this.handleFocusLost.bind(this));
    this.eventBus.on(
      SYSTEM_EVENTS.FOCUS_GAINED,
      this.handleFocusGained.bind(this)
    );
  }

  setupPerformanceMonitoring() {
    // Subscribe to game loop with high priority for performance monitoring
    this.gameLoop.subscribe((deltaTime, totalTime) => {
      this.performanceMonitor.update(deltaTime, totalTime);
    }, 15);
  }

  async start() {
    console.log("🎮 Poker Game Engine: Starting...");

    try {
      // Initialize game loop
      this.gameLoop.start();

      // Start all systems
      await this.animationSystem.initialize();
      await this.aiSystem.initialize();
      await this.uiSystem.initialize();
      await this.audioSystem.initialize();

      this.gameState = "menu";

      this.eventBus.emit(UI_EVENTS.TOAST_SHOW, {
        message: "Game engine started successfully",
        type: "success",
      });

      console.log("✅ Poker Game Engine: Started successfully");
    } catch (error) {
      console.error("❌ Poker Game Engine: Failed to start", error);
      this.eventBus.emit(SYSTEM_EVENTS.ERROR_OCCURRED, {
        type: "engine_start_failed",
        error: error.message,
      });
    }
  }

  async handleGameStart(gameConfig) {
    console.log("🎯 Game Engine: Starting new game", gameConfig.gameType);

    this.gameState = "playing";
    this.currentGame = gameConfig;

    // Create turn timer for each player
    this.setupPlayerTurnTimers(gameConfig.turnTimeLimit || 30000);

    // Start game-specific systems
    this.aiSystem.startGame(gameConfig);
    this.animationSystem.startGame(gameConfig);

    // Emit game ready event after short delay
    this.timeManager.createTimer("game_ready_delay", 1000, () => {
      this.eventBus.emit(GAME_EVENTS.PHASE_CHANGE, {
        from: "starting",
        to: "dealing",
      });
    });
  }

  handleGameEnd(result) {
    console.log("🏁 Game Engine: Game ended", result);

    this.gameState = "ended";

    // Clear all game-related timers
    this.clearGameTimers();

    // Stop game systems
    this.aiSystem.endGame(result);
    this.animationSystem.endGame(result);

    // Show results with delay
    this.timeManager.createTimer("show_results_delay", 2000, () => {
      this.eventBus.emit(UI_EVENTS.MODAL_OPEN, {
        type: "game_results",
        title: "Game Results",
        data: result,
      });
    });
  }

  handleGamePause() {
    console.log("⏸️ Game Engine: Game paused");
    this.gameState = "paused";
    this.gameLoop.pause();
  }

  handleGameResume() {
    console.log("▶️ Game Engine: Game resumed");
    this.gameState = "playing";
    this.gameLoop.resume();
  }

  handlePerformanceIssue(issueData) {
    console.warn("⚠️ Game Engine: Performance issue detected", issueData);

    if (issueData.severity === "critical") {
      // Reduce visual quality
      this.animationSystem.setQualityLevel("low");
      this.eventBus.emit(UI_EVENTS.TOAST_SHOW, {
        message: "Performance optimized automatically",
        type: "warning",
      });
    }
  }

  handleFocusLost() {
    if (this.gameState === "playing") {
      this.eventBus.emit(GAME_EVENTS.GAME_PAUSE);
    }
  }

  handleFocusGained() {
    if (this.gameState === "paused") {
      // Show resume prompt instead of auto-resuming
      this.eventBus.emit(UI_EVENTS.MODAL_OPEN, {
        type: "resume_game",
        title: "Resume Game?",
        message: "The game was paused. Would you like to continue?",
      });
    }
  }

  setupPlayerTurnTimers(timeLimit) {
    this.players.forEach((player, index) => {
      this.timeManager.createTimer(
        `player_${player.id}_turn`,
        timeLimit,
        () => {
          this.handlePlayerTurnTimeout(player.id);
        },
        {
          autoStart: false,
          pauseWithGame: true,
        }
      );
    });
  }

  handlePlayerTurnTimeout(playerId) {
    console.log(`⏰ Game Engine: Player ${playerId} turn timeout`);

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_TURN_TIMEOUT, { playerId });

    // Force AI to make a move or pass
    if (this.isAIPlayer(playerId)) {
      this.aiSystem.forceMove(playerId);
    } else {
      this.eventBus.emit(PLAYER_EVENTS.PLAYER_PASS, { playerId });
    }
  }

  clearGameTimers() {
    // Remove all game-related timers
    this.players.forEach((player) => {
      this.timeManager.removeTimer(`player_${player.id}_turn`);
    });

    this.timeManager.removeTimer("game_ready_delay");
    this.timeManager.removeTimer("show_results_delay");
  }

  isAIPlayer(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    return player && player.type === "ai";
  }

  dispose() {
    console.log("🧹 Game Engine: Disposing...");

    this.gameLoop.stop();
    this.timeManager.dispose();
    this.performanceMonitor.dispose();

    // Dispose all systems
    this.animationSystem.dispose();
    this.aiSystem.dispose();
    this.uiSystem.dispose();
    this.audioSystem.dispose();
  }
}

/**
 * Example 2: Animation System with frame-rate independent timing
 * Shows how to create smooth animations that work at any frame rate
 */
class AnimationSystem {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.eventBus = globalEventBus;

    this.activeAnimations = new Map();
    this.animationIdCounter = 0;
    this.qualityLevel = "high"; // high, medium, low

    this.initializeEventHandlers();
  }

  async initialize() {
    console.log("🎬 Animation System: Initializing...");

    // Subscribe to game loop for animation updates
    this.gameLoopUnsubscribe = globalGameLoop.subscribe((deltaTime) => {
      this.updateAnimations(deltaTime);
    }, 8); // High priority for smooth animations

    this.eventBus.emit(
      SYSTEM_EVENTS.DEBUG_MESSAGE,
      "Animation System initialized"
    );
  }

  initializeEventHandlers() {
    this.eventBus.on(
      UI_EVENTS.ANIMATION_START,
      this.handleAnimationRequest.bind(this)
    );
    this.eventBus.on(
      UI_EVENTS.ANIMATION_CANCEL,
      this.handleAnimationCancel.bind(this)
    );
  }

  startGame(gameConfig) {
    // Pre-load game-specific animations
    this.preloadGameAnimations(gameConfig.gameType);
  }

  endGame(result) {
    // Play end game animations
    this.playEndGameAnimations(result);
  }

  updateAnimations(deltaTime) {
    // Apply time scaling for slow motion effects
    const scaledDeltaTime = deltaTime * this.timeManager.getTimeScale();

    for (const [id, animation] of this.activeAnimations) {
      this.updateAnimation(animation, scaledDeltaTime);

      if (animation.isCompleted) {
        this.completeAnimation(id, animation);
      }
    }
  }

  /**
   * Creates a card deal animation with realistic physics
   */
  animateCardDeal(fromPosition, toPosition, card, delay = 0) {
    const animationId = `card_deal_${++this.animationIdCounter}`;

    const animation = {
      id: animationId,
      type: "card_deal",
      element: card.element,
      startPosition: { ...fromPosition },
      endPosition: { ...toPosition },
      currentPosition: { ...fromPosition },
      duration: 800,
      elapsed: 0,
      delay,
      easing: "easeOutBounce",
      isCompleted: false,
      onComplete: () => {
        this.eventBus.emit(UI_EVENTS.ANIMATION_END, {
          animationId,
          type: "card_deal",
        });
      },
    };

    this.timeManager.createTimer(
      `animation_delay_${animationId}`,
      delay,
      () => {
        this.activeAnimations.set(animationId, animation);
      }
    );

    return animationId;
  }

  /**
   * Creates a card flip animation with smooth rotation
   */
  animateCardFlip(card, showFront = true, duration = 600) {
    const animationId = `card_flip_${++this.animationIdCounter}`;

    const animation = {
      id: animationId,
      type: "card_flip",
      element: card.element,
      showFront,
      duration,
      elapsed: 0,
      rotation: 0,
      targetRotation: 180,
      isCompleted: false,
      onHalfway: () => {
        // Change card face at halfway point
        if (showFront) {
          card.element.classList.add("front");
          card.element.classList.remove("back");
        } else {
          card.element.classList.add("back");
          card.element.classList.remove("front");
        }
      },
      onComplete: () => {
        this.eventBus.emit(UI_EVENTS.ANIMATION_END, {
          animationId,
          type: "card_flip",
        });
      },
    };

    this.activeAnimations.set(animationId, animation);
    return animationId;
  }

  /**
   * Creates a smooth card movement animation
   */
  animateCardMove(card, targetPosition, duration = 500, easing = "easeInOut") {
    const animationId = `card_move_${++this.animationIdCounter}`;

    const rect = card.element.getBoundingClientRect();
    const currentPosition = { x: rect.left, y: rect.top };

    const animation = {
      id: animationId,
      type: "card_move",
      element: card.element,
      startPosition: currentPosition,
      endPosition: targetPosition,
      currentPosition: { ...currentPosition },
      duration,
      elapsed: 0,
      easing,
      isCompleted: false,
      onComplete: () => {
        this.eventBus.emit(UI_EVENTS.ANIMATION_END, {
          animationId,
          type: "card_move",
        });
      },
    };

    this.activeAnimations.set(animationId, animation);
    return animationId;
  }

  updateAnimation(animation, deltaTime) {
    animation.elapsed += deltaTime;
    const progress = Math.min(animation.elapsed / animation.duration, 1);

    // Apply easing function
    const easedProgress = this.applyEasing(progress, animation.easing);

    switch (animation.type) {
      case "card_deal":
      case "card_move":
        this.updatePositionAnimation(animation, easedProgress);
        break;

      case "card_flip":
        this.updateFlipAnimation(animation, easedProgress);
        break;

      case "fade":
        this.updateFadeAnimation(animation, easedProgress);
        break;
    }

    if (progress >= 1) {
      animation.isCompleted = true;
    }
  }

  updatePositionAnimation(animation, progress) {
    const { startPosition, endPosition } = animation;

    animation.currentPosition.x = TimeUtils.lerp(
      startPosition.x,
      endPosition.x,
      progress
    );
    animation.currentPosition.y = TimeUtils.lerp(
      startPosition.y,
      endPosition.y,
      progress
    );

    // Add arc effect for card dealing
    if (animation.type === "card_deal") {
      const arcHeight = 50;
      const arc = Math.sin(progress * Math.PI) * arcHeight;
      animation.currentPosition.y -= arc;
    }

    // Apply transform
    const element = animation.element;
    element.style.transform = `translate(${animation.currentPosition.x}px, ${animation.currentPosition.y}px)`;

    // Add rotation during movement for more dynamic effect
    if (this.qualityLevel === "high") {
      const rotation = progress * 360 * 0.1; // Subtle rotation
      element.style.transform += ` rotate(${rotation}deg)`;
    }
  }

  updateFlipAnimation(animation, progress) {
    const rotation = progress * animation.targetRotation;
    animation.rotation = rotation;

    // Trigger face change at halfway point
    if (progress >= 0.5 && !animation.halfwayTriggered) {
      animation.halfwayTriggered = true;
      animation.onHalfway?.();
    }

    animation.element.style.transform = `rotateY(${rotation}deg)`;
  }

  updateFadeAnimation(animation, progress) {
    const opacity = animation.fadeIn ? progress : 1 - progress;
    animation.element.style.opacity = opacity;
  }

  applyEasing(t, easingType) {
    switch (easingType) {
      case "easeIn":
        return TimeUtils.easeIn(t);
      case "easeOut":
        return TimeUtils.easeOut(t);
      case "easeInOut":
        return TimeUtils.easeInOut(t);
      case "easeOutBounce":
        return this.easeOutBounce(t);
      default:
        return t; // linear
    }
  }

  easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  completeAnimation(id, animation) {
    this.activeAnimations.delete(id);
    animation.onComplete?.();
  }

  handleAnimationRequest(animationData) {
    // Handle external animation requests
    switch (animationData.type) {
      case "card_highlight":
        this.animateCardHighlight(animationData.card);
        break;
      case "score_popup":
        this.animateScorePopup(animationData.score, animationData.position);
        break;
    }
  }

  handleAnimationCancel(animationData) {
    if (this.activeAnimations.has(animationData.animationId)) {
      this.activeAnimations.delete(animationData.animationId);
    }
  }

  setQualityLevel(level) {
    this.qualityLevel = level;
    console.log(`🎬 Animation System: Quality level set to ${level}`);

    // Adjust animation settings based on quality level
    switch (level) {
      case "low":
        this.disableNonEssentialAnimations();
        break;
      case "medium":
        this.enableEssentialAnimations();
        break;
      case "high":
        this.enableAllAnimations();
        break;
    }
  }

  disableNonEssentialAnimations() {
    // Cancel non-essential animations to improve performance
    for (const [id, animation] of this.activeAnimations) {
      if (animation.type === "decorative" || animation.type === "particle") {
        this.activeAnimations.delete(id);
      }
    }
  }

  enableEssentialAnimations() {
    // Enable only game-critical animations
  }

  enableAllAnimations() {
    // Enable all animations for best visual experience
  }

  preloadGameAnimations(gameType) {
    console.log(`🎬 Animation System: Preloading animations for ${gameType}`);
    // Preload game-specific animation assets
  }

  playEndGameAnimations(result) {
    if (result.winner) {
      this.animateVictoryEffects(result.winner);
    }
  }

  animateVictoryEffects(winner) {
    // Create celebration animations
    this.animateConfetti();
    this.animateWinnerHighlight(winner);
  }

  animateConfetti() {
    if (this.qualityLevel === "low") return;

    // Create confetti particle animation
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        this.createConfettiParticle();
      }, i * 50);
    }
  }

  createConfettiParticle() {
    const particle = document.createElement("div");
    particle.className = "confetti-particle";
    particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: hsl(${Math.random() * 360}, 70%, 60%);
            pointer-events: none;
            z-index: 1000;
        `;

    document.body.appendChild(particle);

    const startX = Math.random() * window.innerWidth;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = window.innerHeight + 50;

    this.animateElement(particle, {
      from: { x: startX, y: -10, rotation: 0 },
      to: { x: endX, y: endY, rotation: 360 * 3 },
      duration: 3000,
      easing: "easeIn",
      onComplete: () => {
        particle.remove();
      },
    });
  }

  animateElement(element, config) {
    const animationId = `element_${++this.animationIdCounter}`;

    const animation = {
      id: animationId,
      type: "custom",
      element,
      startProps: config.from,
      endProps: config.to,
      currentProps: { ...config.from },
      duration: config.duration,
      elapsed: 0,
      easing: config.easing || "linear",
      isCompleted: false,
      onComplete: config.onComplete,
    };

    this.activeAnimations.set(animationId, animation);
    return animationId;
  }

  dispose() {
    console.log("🎬 Animation System: Disposing...");

    this.activeAnimations.clear();

    if (this.gameLoopUnsubscribe) {
      this.gameLoopUnsubscribe();
    }
  }
}

/**
 * Example 3: AI System with timing-based decision making
 * Demonstrates how AI can use time-based strategies and thinking delays
 */
class AISystem {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.eventBus = globalEventBus;

    this.aiPlayers = new Map();
    this.thinkingDelays = new Map();
    this.defaultThinkTime = 2000; // 2 seconds default think time

    this.initializeEventHandlers();
  }

  async initialize() {
    console.log("🤖 AI System: Initializing...");

    // Subscribe to player events
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_TURN_START,
      this.handlePlayerTurnStart.bind(this)
    );
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_TURN_TIMEOUT,
      this.handlePlayerTurnTimeout.bind(this)
    );

    console.log("✅ AI System: Initialized");
  }

  initializeEventHandlers() {
    this.eventBus.on(
      SYSTEM_EVENTS.PERFORMANCE_WARNING,
      this.handlePerformanceWarning.bind(this)
    );
    this.eventBus.on(
      SYSTEM_EVENTS.TIME_SCALE_CHANGED,
      this.handleTimeScaleChange.bind(this)
    );
  }

  startGame(gameConfig) {
    console.log("🤖 AI System: Starting game logic");

    // Initialize AI players for this game
    gameConfig.players.forEach((player) => {
      if (player.type === "ai") {
        this.createAIPlayer(player);
      }
    });
  }

  endGame(result) {
    console.log("🤖 AI System: Ending game logic");

    // Learn from game results
    this.aiPlayers.forEach((ai) => {
      ai.learnFromGameResult(result);
    });

    // Clear thinking timers
    this.thinkingDelays.clear();
  }

  createAIPlayer(playerConfig) {
    const ai = {
      id: playerConfig.id,
      personality: playerConfig.personality || "balanced",
      difficulty: playerConfig.difficulty || "medium",
      thinkTime: this.calculateThinkTime(playerConfig),
      confidence: 0.5,
      hand: [],
      gameKnowledge: new Map(),
      opponentModels: new Map(),
    };

    this.aiPlayers.set(playerConfig.id, ai);
    console.log(`🤖 Created AI player: ${ai.id} (${ai.personality})`);
  }

  handlePlayerTurnStart(turnData) {
    const ai = this.aiPlayers.get(turnData.playerId);
    if (!ai) return;

    console.log(`🤖 AI ${ai.id}: Turn started, thinking...`);

    // Emit thinking start event
    this.eventBus.emit("ai:thinking_start", {
      playerId: ai.id,
      estimatedThinkTime: ai.thinkTime,
    });

    // Create thinking timer with personality-based delay
    const thinkTime = this.calculateDynamicThinkTime(ai, turnData.gameState);

    this.timeManager.createTimer(`ai_think_${ai.id}`, thinkTime, () => {
      this.makeAIDecision(ai, turnData.gameState);
    });

    // Store thinking delay for potential cancellation
    this.thinkingDelays.set(ai.id, thinkTime);
  }

  calculateThinkTime(playerConfig) {
    const baseTime = this.defaultThinkTime;
    const personalityModifiers = {
      aggressive: 0.6, // Quick decisions
      cautious: 1.8, // Longer thinking
      balanced: 1.0, // Normal speed
      random: 0.4, // Very quick
    };

    const difficultyModifiers = {
      easy: 0.7,
      medium: 1.0,
      hard: 1.4,
      expert: 1.8,
    };

    const personalityMod =
      personalityModifiers[playerConfig.personality] || 1.0;
    const difficultyMod = difficultyModifiers[playerConfig.difficulty] || 1.0;

    return baseTime * personalityMod * difficultyMod;
  }

  calculateDynamicThinkTime(ai, gameState) {
    let thinkTime = ai.thinkTime;

    // Adjust based on game situation complexity
    const complexity = this.analyzeGameComplexity(gameState);
    thinkTime *= 0.5 + complexity * 0.5; // Scale from 50% to 100% of base time

    // Adjust based on AI confidence
    thinkTime *= 2 - ai.confidence; // Less confident = more thinking

    // Add some randomness for realism
    thinkTime *= 0.8 + Math.random() * 0.4; // ±20% variation

    return Math.max(500, Math.min(thinkTime, 10000)); // Clamp between 0.5-10 seconds
  }

  analyzeGameComplexity(gameState) {
    // Analyze various factors to determine decision complexity
    let complexity = 0.5; // Base complexity

    // More players = more complex
    complexity += (gameState.playerCount - 2) * 0.1;

    // More cards in hand = more complex
    complexity += Math.min(gameState.handSize / 10, 0.3);

    // Late game = more complex decisions
    complexity += gameState.roundProgress * 0.2;

    return Math.min(complexity, 1.0);
  }

  async makeAIDecision(ai, gameState) {
    try {
      console.log(`🤖 AI ${ai.id}: Making decision...`);

      // Simulate AI decision making process
      const decision = await this.processAILogic(ai, gameState);

      // Update AI confidence based on decision quality
      ai.confidence = decision.confidence;

      // Emit decision made event
      this.eventBus.emit("ai:decision_made", {
        playerId: ai.id,
        decision,
        confidence: ai.confidence,
        thinkTime: this.thinkingDelays.get(ai.id),
      });

      // Execute the decision with a small delay for realism
      this.timeManager.createTimer(`ai_execute_${ai.id}`, 200, () => {
        this.executeAIDecision(ai, decision);
      });
    } catch (error) {
      console.error(`🤖 AI ${ai.id}: Decision error`, error);

      this.eventBus.emit("ai:decision_error", {
        playerId: ai.id,
        error: error.message,
      });

      // Fallback to simple decision
      this.executeSimpleDecision(ai, gameState);
    } finally {
      this.thinkingDelays.delete(ai.id);

      this.eventBus.emit("ai:thinking_end", {
        playerId: ai.id,
      });
    }
  }

  async processAILogic(ai, gameState) {
    // Simulate complex AI decision making
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        const decision = {
          type: "play_cards",
          cards: this.selectBestCards(ai, gameState),
          confidence: 0.6 + Math.random() * 0.3,
          reasoning: `${ai.personality} strategy applied`,
        };

        resolve(decision);
      }, 50); // Small processing delay
    });
  }

  selectBestCards(ai, gameState) {
    // Simplified card selection logic
    return ai.hand.slice(0, 1); // Play first card for demo
  }

  executeAIDecision(ai, decision) {
    console.log(`🤖 AI ${ai.id}: Executing decision`, decision.type);

    // Emit player move event
    this.eventBus.emit(PLAYER_EVENTS.PLAYER_MOVE, {
      playerId: ai.id,
      move: decision.type,
      cards: decision.cards,
      confidence: decision.confidence,
    });
  }

  executeSimpleDecision(ai, gameState) {
    // Fallback decision for error cases
    this.eventBus.emit(PLAYER_EVENTS.PLAYER_PASS, {
      playerId: ai.id,
      reason: "fallback_decision",
    });
  }

  handlePlayerTurnTimeout(timeoutData) {
    const ai = this.aiPlayers.get(timeoutData.playerId);
    if (!ai) return;

    console.log(`🤖 AI ${ai.id}: Turn timeout, forcing move`);

    // Cancel current thinking timer
    this.timeManager.removeTimer(`ai_think_${ai.id}`);

    // Force immediate decision
    this.forceMove(ai.id);
  }

  forceMove(playerId) {
    const ai = this.aiPlayers.get(playerId);
    if (!ai) return;

    // Make quick decision without thinking delay
    this.eventBus.emit(PLAYER_EVENTS.PLAYER_PASS, {
      playerId,
      reason: "timeout_forced",
    });
  }

  handlePerformanceWarning(warningData) {
    if (warningData.severity === "critical") {
      // Reduce AI thinking times to improve performance
      this.aiPlayers.forEach((ai) => {
        ai.thinkTime *= 0.7; // Reduce by 30%
      });

      console.log(
        "🤖 AI System: Reduced thinking times due to performance issues"
      );
    }
  }

  handleTimeScaleChange(scaleData) {
    // Adjust AI thinking times based on time scale
    const scaleFactor = 1 / scaleData.newScale;

    this.aiPlayers.forEach((ai) => {
      ai.thinkTime *= scaleFactor;
    });

    console.log(
      `🤖 AI System: Adjusted thinking times for ${scaleData.newScale}x time scale`
    );
  }

  dispose() {
    console.log("🤖 AI System: Disposing...");

    this.aiPlayers.clear();
    this.thinkingDelays.clear();
  }
}

/**
 * Example 4: UI System with timing-based feedback
 */
class UISystem {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.eventBus = globalEventBus;

    this.feedbackTimers = new Map();
    this.transitionAnimations = new Map();
  }

  async initialize() {
    console.log("🎨 UI System: Initializing...");

    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_MOVE,
      this.showPlayerFeedback.bind(this)
    );
    this.eventBus.on(
      "ai:thinking_start",
      this.showAIThinkingIndicator.bind(this)
    );
    this.eventBus.on(
      "ai:thinking_end",
      this.hideAIThinkingIndicator.bind(this)
    );

    console.log("✅ UI System: Initialized");
  }

  showPlayerFeedback(moveData) {
    // Show temporary feedback for player moves
    this.showTemporaryMessage(`${moveData.playerId} played cards`, 2000);

    // Highlight player briefly
    this.highlightPlayer(moveData.playerId, 1000);
  }

  showAIThinkingIndicator(thinkingData) {
    const indicator = document.createElement("div");
    indicator.id = `thinking_${thinkingData.playerId}`;
    indicator.className = "ai-thinking-indicator";
    indicator.textContent = "🤔 Thinking...";

    document.body.appendChild(indicator);

    // Create pulsing animation
    this.timeManager.createTimer(
      `thinking_pulse_${thinkingData.playerId}`,
      500,
      () => {
        indicator.classList.toggle("pulse");
      },
      { repeat: true }
    );
  }

  hideAIThinkingIndicator(thinkingData) {
    const indicator = document.getElementById(
      `thinking_${thinkingData.playerId}`
    );
    if (indicator) {
      indicator.remove();
    }

    this.timeManager.removeTimer(`thinking_pulse_${thinkingData.playerId}`);
  }

  showTemporaryMessage(message, duration) {
    const messageElement = document.createElement("div");
    messageElement.className = "temporary-message";
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    this.timeManager.createTimer(`temp_message_${Date.now()}`, duration, () => {
      messageElement.remove();
    });
  }

  highlightPlayer(playerId, duration) {
    const playerElement = document.querySelector(
      `[data-player-id="${playerId}"]`
    );
    if (playerElement) {
      playerElement.classList.add("highlighted");

      this.timeManager.createTimer(`highlight_${playerId}`, duration, () => {
        playerElement.classList.remove("highlighted");
      });
    }
  }

  dispose() {
    console.log("🎨 UI System: Disposing...");
    this.feedbackTimers.clear();
    this.transitionAnimations.clear();
  }
}

/**
 * Example 5: Audio System with timing synchronization
 */
class AudioSystem {
  constructor(timeManager) {
    this.timeManager = timeManager;
    this.eventBus = globalEventBus;

    this.scheduledSounds = new Map();
    this.musicTimers = new Map();
  }

  async initialize() {
    console.log("🔊 Audio System: Initializing...");

    this.eventBus.on(PLAYER_EVENTS.PLAYER_MOVE, this.playMoveSound.bind(this));
    this.eventBus.on(GAME_EVENTS.GAME_START, this.startGameMusic.bind(this));

    console.log("✅ Audio System: Initialized");
  }

  playMoveSound(moveData) {
    // Play card sound with slight delay for realism
    this.timeManager.createTimer(`card_sound_${Date.now()}`, 100, () => {
      this.playSound("card_place");
    });
  }

  startGameMusic(gameData) {
    // Fade in background music
    this.fadeInMusic("game_background", 2000);
  }

  playSound(soundId) {
    console.log(`🔊 Playing sound: ${soundId}`);
    // Implementation would play actual audio
  }

  fadeInMusic(musicId, duration) {
    console.log(`🔊 Fading in music: ${musicId} over ${duration}ms`);
    // Implementation would handle music fading
  }

  dispose() {
    console.log("🔊 Audio System: Disposing...");
    this.scheduledSounds.clear();
    this.musicTimers.clear();
  }
}

/**
 * Example 6: Performance Monitor
 */
class PerformanceMonitor {
  constructor() {
    this.frameTimeHistory = [];
    this.maxHistorySize = 60;
    this.lastReportTime = 0;
    this.reportInterval = 5000; // Report every 5 seconds
  }

  update(deltaTime, totalTime) {
    this.frameTimeHistory.push(deltaTime);

    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory.shift();
    }

    if (totalTime - this.lastReportTime > this.reportInterval) {
      this.generatePerformanceReport();
      this.lastReportTime = totalTime;
    }
  }

  generatePerformanceReport() {
    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b) /
      this.frameTimeHistory.length;
    const fps = 1000 / avgFrameTime;

    if (fps < 50) {
      globalEventBus.emit(SYSTEM_EVENTS.PERFORMANCE_WARNING, {
        type: "low_fps",
        fps,
        avgFrameTime,
        severity: fps < 30 ? "critical" : "warning",
      });
    }
  }

  dispose() {
    this.frameTimeHistory = [];
  }
}

// Application bootstrap example
class PokerGameApplication {
  constructor() {
    this.gameEngine = null;
    this.isInitialized = false;
  }

  async initialize() {
    console.log("🚀 Poker Game Application: Initializing...");

    try {
      this.gameEngine = new PokerGameEngine();
      await this.gameEngine.start();

      this.isInitialized = true;
      console.log("✅ Poker Game Application: Initialized successfully");
    } catch (error) {
      console.error("❌ Poker Game Application: Initialization failed", error);
    }
  }

  shutdown() {
    if (this.gameEngine) {
      this.gameEngine.dispose();
    }

    console.log("🛑 Poker Game Application: Shut down");
  }
}

// Usage example
document.addEventListener("DOMContentLoaded", async () => {
  const app = new PokerGameApplication();
  await app.initialize();

  // Make available for debugging
  window.pokerApp = app;
  window.gameLoop = globalGameLoop;
});

export {
  PokerGameEngine,
  AnimationSystem,
  AISystem,
  UISystem,
  AudioSystem,
  PerformanceMonitor,
  PokerGameApplication,
};
