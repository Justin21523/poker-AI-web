/**
 * @fileoverview Real-world usage examples for the EventBus system
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description This file demonstrates how to use the EventBus system in
 * practical scenarios within the poker game platform. Shows best practices,
 * common patterns, and integration with game systems.
 */

import { EventBus, globalEventBus } from "../core/events/EventBus.js";
import {
  GAME_EVENTS,
  PLAYER_EVENTS,
  AI_EVENTS,
  UI_EVENTS,
  AUDIO_EVENTS,
} from "../core/events/EventTypes.js";

/**
 * Example 1: Game Controller using EventBus
 * Demonstrates how a game controller manages different game phases
 * using event-driven architecture
 */
class GameController {
  constructor() {
    this.eventBus = globalEventBus;
    this.currentGame = null;
    this.players = [];

    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // High priority system events
    this.eventBus.on(
      GAME_EVENTS.GAME_START,
      this.handleGameStart.bind(this),
      10
    );
    this.eventBus.on(GAME_EVENTS.GAME_END, this.handleGameEnd.bind(this), 10);
    this.eventBus.on(
      GAME_EVENTS.PHASE_CHANGE,
      this.handlePhaseChange.bind(this),
      8
    );

    // Player management events
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_JOIN,
      this.handlePlayerJoin.bind(this)
    );
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_LEAVE,
      this.handlePlayerLeave.bind(this)
    );
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_MOVE,
      this.handlePlayerMove.bind(this)
    );

    // Error handling - once listener for critical errors
    this.eventBus.once(
      "system:critical_error",
      this.handleCriticalError.bind(this)
    );
  }

  async handleGameStart(gameConfig) {
    console.log("🎮 Game Controller: Starting new game", gameConfig);

    try {
      // Initialize game state
      this.currentGame = {
        type: gameConfig.gameType,
        id: this.generateGameId(),
        startTime: Date.now(),
        status: "initializing",
      };

      // Notify other systems
      this.eventBus.emit(UI_EVENTS.TOAST_SHOW, {
        message: `Starting ${gameConfig.gameType} game...`,
        type: "info",
      });

      this.eventBus.emit(AUDIO_EVENTS.SOUND_PLAY, {
        soundId: "game_start",
        volume: 0.7,
      });

      // Start game initialization sequence
      await this.initializeGameSystems(gameConfig);

      // Game ready - change phase
      this.eventBus.emit(GAME_EVENTS.PHASE_CHANGE, {
        from: "initializing",
        to: "waiting_for_players",
      });
    } catch (error) {
      console.error("Game start failed:", error);
      this.eventBus.emit("system:error", {
        type: "game_start_failed",
        error: error.message,
      });
    }
  }

  handleGameEnd(result) {
    console.log("🏁 Game Controller: Game ended", result);

    // Play appropriate audio
    const soundId = result.winner ? "game_win" : "game_end";
    this.eventBus.emit(AUDIO_EVENTS.SOUND_PLAY, { soundId });

    // Update statistics
    this.eventBus.emit(GAME_EVENTS.STATISTICS_UPDATE, {
      gameId: this.currentGame.id,
      duration: Date.now() - this.currentGame.startTime,
      result,
    });

    // Clean up
    this.currentGame = null;
    this.players = [];
  }

  handlePhaseChange({ from, to }) {
    console.log(`🔄 Game Controller: Phase change ${from} -> ${to}`);

    // Update UI based on phase
    this.eventBus.emit(UI_EVENTS.PHASE_UPDATE, { phase: to });

    // Phase-specific logic
    switch (to) {
      case "dealing":
        this.eventBus.emit(GAME_EVENTS.CARDS_DEALT);
        break;
      case "playing":
        this.eventBus.emit(PLAYER_EVENTS.PLAYER_TURN_START, {
          playerId: this.players[0]?.id,
        });
        break;
    }
  }

  handlePlayerJoin(playerData) {
    console.log("👤 Game Controller: Player joined", playerData);

    this.players.push(playerData);

    // Notify all players about new participant
    this.eventBus.emit(UI_EVENTS.PLAYER_LIST_UPDATE, {
      players: this.players,
    });

    // Check if we can start the game
    if (
      this.players.length >= 2 &&
      this.currentGame?.status === "waiting_for_players"
    ) {
      this.eventBus.emit(GAME_EVENTS.PHASE_CHANGE, {
        from: "waiting_for_players",
        to: "dealing",
      });
    }
  }

  handlePlayerMove(moveData) {
    console.log("🎯 Game Controller: Processing player move", moveData);

    // Validate move
    if (this.validateMove(moveData)) {
      // Process the move
      this.processMove(moveData);

      // Check for game end conditions
      if (this.checkGameEndConditions()) {
        const result = this.calculateGameResult();
        this.eventBus.emit(GAME_EVENTS.GAME_END, result);
      } else {
        // Continue to next player
        this.eventBus.emit(PLAYER_EVENTS.PLAYER_TURN_END, {
          playerId: moveData.playerId,
        });
      }
    } else {
      this.eventBus.emit(PLAYER_EVENTS.PLAYER_INVALID_MOVE, moveData);
    }
  }

  handlePlayerLeave(playerData) {
    console.log("👋 Game Controller: Player left", playerData);

    this.players = this.players.filter((p) => p.id !== playerData.id);

    // Check if game can continue
    if (this.players.length < 2) {
      this.eventBus.emit(GAME_EVENTS.GAME_END, {
        reason: "insufficient_players",
      });
    }
  }

  handleCriticalError(errorData) {
    console.error("💥 Game Controller: Critical error occurred", errorData);

    // Emergency shutdown
    this.eventBus.emit(GAME_EVENTS.GAME_END, {
      reason: "critical_error",
      error: errorData,
    });

    // Show error message to user
    this.eventBus.emit(UI_EVENTS.MODAL_OPEN, {
      type: "error",
      title: "Critical Error",
      message:
        "The game has encountered a critical error and must be restarted.",
      buttons: [{ text: "Restart", action: "restart_game" }],
    });
  }

  // Helper methods
  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initializeGameSystems(config) {
    // Initialize various game systems
    return new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async initialization
  }

  validateMove(moveData) {
    // Implement move validation logic
    return true; // Simplified for example
  }

  processMove(moveData) {
    // Process the actual move
    console.log("Processing move:", moveData);
  }

  checkGameEndConditions() {
    // Check if game should end
    return false; // Simplified for example
  }

  calculateGameResult() {
    // Calculate final game result
    return { winner: this.players[0], score: 100 };
  }
}

/**
 * Example 2: AI Player using EventBus
 * Shows how an AI player integrates with the event system
 */
class AIPlayer {
  constructor(playerId, personality = "balanced") {
    this.id = playerId;
    this.personality = personality;
    this.eventBus = globalEventBus;
    this.isThinking = false;
    this.hand = [];

    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // Listen for turn start with medium priority
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_TURN_START,
      this.handleTurnStart.bind(this),
      5
    );

    // Listen for cards dealt
    this.eventBus.on(GAME_EVENTS.CARDS_DEALT, this.handleCardsDealt.bind(this));

    // Listen for other players' moves to learn
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_MOVE,
      this.handleOpponentMove.bind(this)
    );

    // Performance monitoring
    this.eventBus.on(
      AI_EVENTS.AI_PERFORMANCE_WARNING,
      this.handlePerformanceWarning.bind(this)
    );
  }

  async handleTurnStart(turnData) {
    if (turnData.playerId !== this.id) return;

    console.log(`🤖 AI Player ${this.id}: My turn started`);

    // Notify that AI is thinking
    this.isThinking = true;
    this.eventBus.emit(AI_EVENTS.AI_THINKING_START, {
      playerId: this.id,
      personality: this.personality,
    });

    try {
      // Simulate AI decision making
      const decision = await this.makeDecision();

      // Emit the decision
      this.eventBus.emit(AI_EVENTS.AI_DECISION_MADE, {
        playerId: this.id,
        decision,
        confidence: decision.confidence,
      });

      // Execute the move
      this.eventBus.emit(PLAYER_EVENTS.PLAYER_MOVE, {
        playerId: this.id,
        move: decision.move,
        cards: decision.cards,
      });
    } catch (error) {
      console.error(`AI Player ${this.id} decision error:`, error);
      this.eventBus.emit(AI_EVENTS.AI_DECISION_ERROR, {
        playerId: this.id,
        error: error.message,
      });
    } finally {
      this.isThinking = false;
      this.eventBus.emit(AI_EVENTS.AI_THINKING_END, {
        playerId: this.id,
      });
    }
  }

  handleCardsDealt(cardData) {
    console.log(`🤖 AI Player ${this.id}: Received cards`);
    // Process dealt cards
    this.hand = cardData.hands[this.id] || [];

    // Analyze hand strength
    const handStrength = this.analyzeHand();
    this.eventBus.emit(AI_EVENTS.AI_CONFIDENCE_UPDATE, {
      playerId: this.id,
      confidence: handStrength,
    });
  }

  handleOpponentMove(moveData) {
    if (moveData.playerId === this.id) return;

    console.log(`🤖 AI Player ${this.id}: Learning from opponent move`);

    // Learn from opponent's move
    this.learnFromOpponent(moveData);

    // Update pattern detection
    this.eventBus.emit(AI_EVENTS.AI_PATTERN_DETECTED, {
      learner: this.id,
      opponent: moveData.playerId,
      pattern: this.analyzeOpponentPattern(moveData),
    });
  }

  handlePerformanceWarning(warningData) {
    if (warningData.playerId !== this.id) return;

    console.log(`🤖 AI Player ${this.id}: Performance warning received`);

    // Reduce AI complexity to improve performance
    this.reduceComplexity();
  }

  async makeDecision() {
    // Simulate AI thinking time based on personality
    const thinkTime = this.calculateThinkTime();
    await new Promise((resolve) => setTimeout(resolve, thinkTime));

    // Make decision based on personality and game state
    const decision = {
      move: "play_cards",
      cards: this.selectBestCards(),
      confidence: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
      reasoning: `${this.personality} AI strategy applied`,
    };

    return decision;
  }

  calculateThinkTime() {
    const baseTime = 1000;
    const personalityModifier = {
      aggressive: 0.5,
      cautious: 1.5,
      balanced: 1.0,
      random: 0.3,
    };

    return baseTime * (personalityModifier[this.personality] || 1.0);
  }

  selectBestCards() {
    // Simplified card selection logic
    return this.hand.slice(0, 1); // Play first card
  }

  analyzeHand() {
    // Simplified hand analysis
    return Math.random() * 0.8 + 0.2;
  }

  learnFromOpponent(moveData) {
    // Learn from opponent behavior
    console.log(`Learning from ${moveData.playerId}'s move`);
  }

  analyzeOpponentPattern(moveData) {
    // Analyze patterns in opponent behavior
    return {
      type: "playing_style",
      tendency: Math.random() > 0.5 ? "aggressive" : "defensive",
    };
  }

  reduceComplexity() {
    // Reduce AI complexity for performance
    console.log(`${this.id}: Reducing AI complexity for better performance`);
  }
}

/**
 * Example 3: UI Manager using EventBus
 * Demonstrates how UI components communicate through events
 */
class UIManager {
  constructor() {
    this.eventBus = globalEventBus;
    this.activeModals = [];
    this.currentTheme = "light";

    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // UI state management
    this.eventBus.on(UI_EVENTS.THEME_CHANGE, this.handleThemeChange.bind(this));
    this.eventBus.on(UI_EVENTS.MODAL_OPEN, this.handleModalOpen.bind(this));
    this.eventBus.on(UI_EVENTS.MODAL_CLOSE, this.handleModalClose.bind(this));
    this.eventBus.on(UI_EVENTS.TOAST_SHOW, this.handleToastShow.bind(this));

    // Game state UI updates
    this.eventBus.on(
      GAME_EVENTS.PHASE_CHANGE,
      this.handleGamePhaseChange.bind(this)
    );
    this.eventBus.on(
      PLAYER_EVENTS.PLAYER_TURN_START,
      this.handlePlayerTurnUI.bind(this)
    );

    // Animation events
    this.eventBus.on(
      UI_EVENTS.ANIMATION_START,
      this.handleAnimationStart.bind(this)
    );
    this.eventBus.on(
      UI_EVENTS.ANIMATION_END,
      this.handleAnimationEnd.bind(this)
    );
  }

  handleThemeChange(themeData) {
    console.log("🎨 UI Manager: Changing theme to", themeData.theme);

    this.currentTheme = themeData.theme;
    document.body.className = `theme-${themeData.theme}`;

    // Save theme preference
    this.eventBus.emit("data:settings_save", {
      key: "theme",
      value: themeData.theme,
    });

    // Notify components about theme change
    this.eventBus.emit(UI_EVENTS.THEME_UPDATE, {
      oldTheme: themeData.oldTheme,
      newTheme: themeData.theme,
    });
  }

  handleModalOpen(modalData) {
    console.log("📱 UI Manager: Opening modal", modalData.type);

    const modal = this.createModal(modalData);
    this.activeModals.push(modal);

    // Play sound effect
    this.eventBus.emit(AUDIO_EVENTS.SOUND_PLAY, {
      soundId: "modal_open",
      volume: 0.5,
    });

    // Add to DOM and animate
    document.body.appendChild(modal.element);
    this.eventBus.emit(UI_EVENTS.ANIMATION_START, {
      target: modal.element,
      animation: "fadeIn",
    });
  }

  handleModalClose(closeData) {
    console.log("📱 UI Manager: Closing modal", closeData.modalId);

    const modalIndex = this.activeModals.findIndex(
      (m) => m.id === closeData.modalId
    );
    if (modalIndex === -1) return;

    const modal = this.activeModals[modalIndex];

    // Animate out then remove
    this.eventBus.emit(UI_EVENTS.ANIMATION_START, {
      target: modal.element,
      animation: "fadeOut",
      onComplete: () => {
        modal.element.remove();
        this.activeModals.splice(modalIndex, 1);
      },
    });
  }

  handleToastShow(toastData) {
    console.log("🍞 UI Manager: Showing toast", toastData.message);

    const toast = this.createToast(toastData);
    document.body.appendChild(toast);

    // Auto-hide after delay
    setTimeout(() => {
      this.eventBus.emit(UI_EVENTS.TOAST_HIDE, {
        toastId: toast.id,
      });
    }, toastData.duration || 3000);
  }

  handleGamePhaseChange(phaseData) {
    console.log("🎮 UI Manager: Game phase changed to", phaseData.to);

    // Update UI based on game phase
    this.updateGamePhaseUI(phaseData.to);

    // Show phase transition animation
    this.eventBus.emit(UI_EVENTS.ANIMATION_START, {
      target: ".game-phase-indicator",
      animation: "pulse",
    });
  }

  handlePlayerTurnUI(turnData) {
    console.log("👤 UI Manager: Player turn UI update", turnData.playerId);

    // Highlight current player
    this.highlightCurrentPlayer(turnData.playerId);

    // Update turn indicator
    this.updateTurnIndicator(turnData);
  }

  handleAnimationStart(animData) {
    console.log("🎬 UI Manager: Animation started", animData.animation);

    const element =
      typeof animData.target === "string"
        ? document.querySelector(animData.target)
        : animData.target;

    if (element) {
      element.classList.add(`anim-${animData.animation}`);
    }
  }

  handleAnimationEnd(animData) {
    console.log("🎬 UI Manager: Animation ended", animData.animation);

    const element =
      typeof animData.target === "string"
        ? document.querySelector(animData.target)
        : animData.target;

    if (element) {
      element.classList.remove(`anim-${animData.animation}`);
      animData.onComplete?.();
    }
  }

  // Helper methods
  createModal(modalData) {
    const modal = {
      id: `modal_${Date.now()}`,
      element: document.createElement("div"),
    };

    modal.element.className = "modal";
    modal.element.innerHTML = `
            <div class="modal-content">
                <h3>${modalData.title}</h3>
                <p>${modalData.message}</p>
                <div class="modal-buttons"></div>
            </div>
        `;

    return modal;
  }

  createToast(toastData) {
    const toast = document.createElement("div");
    toast.id = `toast_${Date.now()}`;
    toast.className = `toast toast-${toastData.type || "info"}`;
    toast.textContent = toastData.message;

    return toast;
  }

  updateGamePhaseUI(phase) {
    // Update game phase indicator
    const indicator = document.querySelector(".game-phase-indicator");
    if (indicator) {
      indicator.textContent = phase.replace("_", " ").toUpperCase();
    }
  }

  highlightCurrentPlayer(playerId) {
    // Remove previous highlights
    document.querySelectorAll(".player.current").forEach((el) => {
      el.classList.remove("current");
    });

    // Add highlight to current player
    const playerElement = document.querySelector(
      `[data-player-id="${playerId}"]`
    );
    if (playerElement) {
      playerElement.classList.add("current");
    }
  }

  updateTurnIndicator(turnData) {
    const indicator = document.querySelector(".turn-indicator");
    if (indicator) {
      indicator.textContent = `${turnData.playerId}'s Turn`;
    }
  }
}

/**
 * Example 4: Application Bootstrap
 * Shows how to initialize the entire application using EventBus
 */
class Application {
  constructor() {
    this.eventBus = globalEventBus;
    this.gameController = null;
    this.uiManager = null;
    this.aiPlayers = [];

    this.initializeApplication();
  }

  async initializeApplication() {
    console.log("🚀 Application: Starting initialization");

    // Enable debug mode in development
    if (window.location.hostname === "localhost") {
      this.eventBus.setDebugMode(true);
    }

    // Initialize core systems
    this.uiManager = new UIManager();
    this.gameController = new GameController();

    // Create AI players
    this.createAIPlayers();

    // Set up global error handling
    this.setupErrorHandling();

    // Application ready
    this.eventBus.emit("app:initialized");
    console.log("✅ Application: Initialization complete");
  }

  createAIPlayers() {
    const personalities = ["aggressive", "cautious", "balanced"];

    personalities.forEach((personality, index) => {
      const aiPlayer = new AIPlayer(`ai_${index + 1}`, personality);
      this.aiPlayers.push(aiPlayer);
    });

    console.log(`🤖 Created ${this.aiPlayers.length} AI players`);
  }

  setupErrorHandling() {
    // Global error handler
    this.eventBus.on("system:error", (errorData) => {
      console.error("System error:", errorData);

      // Show error to user if critical
      if (errorData.critical) {
        this.eventBus.emit(UI_EVENTS.MODAL_OPEN, {
          type: "error",
          title: "Error",
          message: errorData.message || "An unexpected error occurred",
        });
      }
    });

    // EventBus error handler
    this.eventBus.on("eventbus:error", (errorData) => {
      console.error("EventBus error:", errorData);
    });
  }
}

// Usage example: Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  const app = new Application();

  // Make some components globally available for debugging
  window.gameController = app.gameController;
  window.uiManager = app.uiManager;
  window.eventBus = globalEventBus;
});

export { GameController, AIPlayer, UIManager, Application };
