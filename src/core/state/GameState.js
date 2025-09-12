/**
 * @fileoverview Game-specific state management wrapper around StateManager
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description GameState provides a higher-level interface for managing
 * game states with built-in validation, player management, and game-specific
 * state transitions. It wraps the generic StateManager with game logic.
 *
 * @example
 * import { GameState } from './GameState.js';
 *
 * const gameState = new GameState('old-maid', {
 *   maxPlayers: 4,
 *   eventBus: globalEventBus
 * });
 *
 * gameState.addPlayer({ id: 'player1', name: 'Alice', type: 'human' });
 * gameState.startGame();
 */

import { StateManager } from "./StateManager.js";
import { EventBus } from "../events/EventBus.js";
import {
  GAME_EVENTS,
  PLAYER_EVENTS,
  SYSTEM_EVENTS,
} from "../events/EventTypes.js";

/**
 * Standard game state definitions for card games
 * These states are common across most card game implementations
 */
export const GAME_STATES = {
  // Initial states
  WAITING: "waiting",
  INITIALIZING: "initializing",

  // Setup states
  DEALING: "dealing",
  READY: "ready",

  // Gameplay states
  PLAYING: "playing",
  PAUSED: "paused",

  // End game states
  SCORING: "scoring",
  ENDED: "ended",

  // Error states
  ERROR: "error",
  ABORTED: "aborted",
};

/**
 * Game-specific state management with player tracking and validation
 * Extends StateManager with game logic and convenience methods
 */
export class GameState {
  /**
   * Creates a new GameState instance
   *
   * @param {string} gameType - Type of game (e.g., 'old-maid', 'big-two')
   * @param {Object} [config={}] - Configuration options
   * @param {number} [config.maxPlayers=4] - Maximum number of players
   * @param {number} [config.minPlayers=2] - Minimum number of players
   * @param {EventBus} [config.eventBus] - EventBus instance
   * @param {boolean} [config.enableValidation=true] - Enable state validation
   * @param {Object} [config.customStates] - Custom state definitions
   */
  constructor(gameType, config = {}) {
    this.gameType = gameType;
    this.gameId = this.generateGameId();

    // Configuration
    this.maxPlayers = config.maxPlayers || 4;
    this.minPlayers = config.minPlayers || 2;
    this.enableValidation = config.enableValidation !== false;

    // Game data
    this.players = [];
    this.currentPlayerIndex = 0;
    this.round = 0;
    this.turn = 0;
    this.gameData = {};
    this.metadata = {
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      winner: null,
      totalMoves: 0,
      gameType: this.gameType,
    };

    // Create state machine configuration
    const stateConfig = this.createStateConfiguration(config.customStates);

    // Initialize StateManager
    this.stateManager = new StateManager({
      initialState: GAME_STATES.WAITING,
      states: stateConfig.states,
      eventBus: config.eventBus || new EventBus(),
      enableHistory: true,
      maxHistoryLength: 100,
    });

    this.setupStateCallbacks();
    this.setupValidation();
  }

  /**
   * Creates the state machine configuration for card games
   * @private
   * @param {Object} [customStates] - Custom state definitions to merge
   * @returns {Object} State configuration
   */
  createStateConfiguration(customStates = {}) {
    const defaultStates = {
      [GAME_STATES.WAITING]: {
        transitions: [GAME_STATES.INITIALIZING, GAME_STATES.ABORTED],
      },
      [GAME_STATES.INITIALIZING]: {
        transitions: [GAME_STATES.DEALING, GAME_STATES.ERROR],
      },
      [GAME_STATES.DEALING]: {
        transitions: [GAME_STATES.READY, GAME_STATES.ERROR],
      },
      [GAME_STATES.READY]: {
        transitions: [GAME_STATES.PLAYING, GAME_STATES.ABORTED],
      },
      [GAME_STATES.PLAYING]: {
        transitions: [
          GAME_STATES.PAUSED,
          GAME_STATES.SCORING,
          GAME_STATES.ENDED,
          GAME_STATES.ABORTED,
        ],
      },
      [GAME_STATES.PAUSED]: {
        transitions: [GAME_STATES.PLAYING, GAME_STATES.ABORTED],
      },
      [GAME_STATES.SCORING]: {
        transitions: [GAME_STATES.ENDED, GAME_STATES.PLAYING], // Can go back for multi-round games
      },
      [GAME_STATES.ENDED]: {
        transitions: [GAME_STATES.WAITING], // Can restart
      },
      [GAME_STATES.ERROR]: {
        transitions: [GAME_STATES.WAITING, GAME_STATES.ABORTED],
      },
      [GAME_STATES.ABORTED]: {
        transitions: [GAME_STATES.WAITING],
      },
    };

    // Merge with custom states if provided
    const mergedStates = { ...defaultStates };
    if (customStates) {
      for (const [stateName, stateConfig] of Object.entries(customStates)) {
        if (mergedStates[stateName]) {
          // Merge transitions
          mergedStates[stateName].transitions = [
            ...new Set([
              ...mergedStates[stateName].transitions,
              ...stateConfig.transitions,
            ]),
          ];
        } else {
          mergedStates[stateName] = stateConfig;
        }
      }
    }

    return { states: mergedStates };
  }

  /**
   * Sets up state entry/exit callbacks
   * @private
   */
  setupStateCallbacks() {
    // Waiting state
    this.stateManager.onStateEntry(GAME_STATES.WAITING, () => {
      this.resetGameData();
    });

    // Initializing state
    this.stateManager.onStateEntry(GAME_STATES.INITIALIZING, () => {
      this.metadata.startedAt = Date.now();
    });

    // Playing state
    this.stateManager.onStateEntry(GAME_STATES.PLAYING, () => {
      if (this.round === 0) {
        this.startNewRound();
      }
    });

    // Ended state
    this.stateManager.onStateEntry(GAME_STATES.ENDED, () => {
      this.metadata.endedAt = Date.now();
      this.calculateFinalResults();
    });

    // Error state
    this.stateManager.onStateEntry(GAME_STATES.ERROR, (data) => {
      this.handleGameError(data);
    });
  }

  /**
   * Sets up state transition validation
   * @private
   */
  setupValidation() {
    if (!this.enableValidation) return;

    // Validate player count before starting
    this.stateManager.addTransitionGuard(
      GAME_STATES.WAITING,
      GAME_STATES.INITIALIZING,
      () => this.hasMinimumPlayers()
    );

    // Validate all players are ready
    this.stateManager.addTransitionGuard(
      GAME_STATES.READY,
      GAME_STATES.PLAYING,
      () => this.allPlayersReady()
    );
  }

  /**
   * Adds a player to the game
   *
   * @param {Object} player - Player object
   * @param {string} player.id - Unique player identifier
   * @param {string} player.name - Player display name
   * @param {string} player.type - Player type ('human' or 'ai')
   * @param {Object} [player.config] - Additional player configuration
   * @returns {boolean} True if player was added successfully
   * @throws {Error} If player cannot be added
   */
  addPlayer(player) {
    if (this.getCurrentState() !== GAME_STATES.WAITING) {
      throw new Error("Cannot add players after game has started");
    }

    if (this.players.length >= this.maxPlayers) {
      throw new Error(`Maximum ${this.maxPlayers} players allowed`);
    }

    if (this.getPlayerById(player.id)) {
      throw new Error(`Player with ID '${player.id}' already exists`);
    }

    const playerData = {
      id: player.id,
      name: player.name,
      type: player.type,
      joinedAt: Date.now(),
      ready: false,
      active: true,
      hand: [],
      score: 0,
      ...player.config,
    };

    this.players.push(playerData);

    this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_JOIN, {
      gameId: this.gameId,
      player: playerData,
      playerCount: this.players.length,
    });

    return true;
  }

  /**
   * Removes a player from the game
   *
   * @param {string} playerId - Player ID to remove
   * @returns {boolean} True if player was removed
   */
  removePlayer(playerId) {
    if (this.getCurrentState() === GAME_STATES.PLAYING) {
      // Handle player leaving during game
      this.handlePlayerLeave(playerId);
    }

    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return false;

    const player = this.players[playerIndex];
    this.players.splice(playerIndex, 1);

    // Adjust current player index if necessary
    if (this.currentPlayerIndex >= playerIndex && this.currentPlayerIndex > 0) {
      this.currentPlayerIndex--;
    }

    this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_LEAVE, {
      gameId: this.gameId,
      player,
      playerCount: this.players.length,
    });

    // Check if game can continue
    if (
      this.players.length < this.minPlayers &&
      [GAME_STATES.PLAYING, GAME_STATES.PAUSED].includes(this.getCurrentState())
    ) {
      this.endGame("insufficient_players");
    }

    return true;
  }

  /**
   * Sets a player's ready status
   *
   * @param {string} playerId - Player ID
   * @param {boolean} ready - Ready status
   */
  setPlayerReady(playerId, ready = true) {
    const player = this.getPlayerById(playerId);
    if (player) {
      player.ready = ready;

      this.stateManager.eventBus.emit(
        ready ? PLAYER_EVENTS.PLAYER_READY : PLAYER_EVENTS.PLAYER_NOT_READY,
        { gameId: this.gameId, playerId }
      );
    }
  }

  /**
   * Starts the game initialization process
   *
   * @param {Object} [config] - Game start configuration
   * @returns {Promise<boolean>} True if game started successfully
   */
  async startGame(config = {}) {
    try {
      if (!this.hasMinimumPlayers()) {
        throw new Error(`Minimum ${this.minPlayers} players required to start`);
      }

      // Transition to initializing state
      this.stateManager.transitionTo(GAME_STATES.INITIALIZING, config);

      // Initialize game-specific data
      await this.initializeGameData(config);

      // Move to dealing state
      this.stateManager.transitionTo(GAME_STATES.DEALING);

      // Deal cards (game-specific implementation)
      await this.dealCards();

      // Move to ready state
      this.stateManager.transitionTo(GAME_STATES.READY);

      return true;
    } catch (error) {
      this.stateManager.transitionTo(GAME_STATES.ERROR, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Transitions to playing state
   */
  beginPlaying() {
    this.stateManager.transitionTo(GAME_STATES.PLAYING);
  }

  /**
   * Pauses the game
   *
   * @param {string} [reason] - Reason for pausing
   */
  pauseGame(reason = "manual") {
    if (this.getCurrentState() === GAME_STATES.PLAYING) {
      this.stateManager.transitionTo(GAME_STATES.PAUSED, { reason });
    }
  }

  /**
   * Resumes the game from paused state
   */
  resumeGame() {
    if (this.getCurrentState() === GAME_STATES.PAUSED) {
      this.stateManager.transitionTo(GAME_STATES.PLAYING);
    }
  }

  /**
   * Ends the game and transitions to scoring
   *
   * @param {string} [reason='completed'] - Reason for ending
   * @param {Object} [data] - Additional end game data
   */
  endGame(reason = "completed", data = {}) {
    if (reason === "completed") {
      this.stateManager.transitionTo(GAME_STATES.SCORING, { reason, ...data });
    } else {
      this.stateManager.transitionTo(GAME_STATES.ENDED, { reason, ...data });
    }
  }

  /**
   * Aborts the game (emergency stop)
   *
   * @param {string} reason - Reason for aborting
   */
  abortGame(reason) {
    this.stateManager.forceState(GAME_STATES.ABORTED, { reason });
  }

  /**
   * Processes player move and advances turn
   *
   * @param {string} playerId - Player making the move
   * @param {Object} move - Move data
   * @returns {boolean} True if move was processed successfully
   */
  processPlayerMove(playerId, move) {
    if (this.getCurrentState() !== GAME_STATES.PLAYING) {
      return false;
    }

    if (!this.isPlayerTurn(playerId)) {
      this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_INVALID_MOVE, {
        gameId: this.gameId,
        playerId,
        reason: "not_player_turn",
      });
      return false;
    }

    try {
      // Validate and execute move (to be implemented by game-specific classes)
      this.validateMove(playerId, move);
      this.executeMove(playerId, move);

      // Record move
      this.metadata.totalMoves++;

      // Advance turn
      this.nextTurn();

      // Check for game end conditions
      if (this.checkGameEndConditions()) {
        this.endGame("completed");
      }

      return true;
    } catch (error) {
      this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_INVALID_MOVE, {
        gameId: this.gameId,
        playerId,
        move,
        reason: error.message,
      });
      return false;
    }
  }

  /**
   * Advances to the next player's turn
   */
  nextTurn() {
    this.currentPlayerIndex = this.getNextActivePlayerIndex();
    this.turn++;

    this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_TURN_START, {
      gameId: this.gameId,
      playerId: this.getCurrentPlayer().id,
      turn: this.turn,
    });
  }

  /**
   * Starts a new round
   */
  startNewRound() {
    this.round++;
    this.turn = 0;
    this.currentPlayerIndex = 0;

    this.stateManager.eventBus.emit(GAME_EVENTS.ROUND_START, {
      gameId: this.gameId,
      round: this.round,
    });
  }

  // Getter methods

  /**
   * Gets the current game state
   *
   * @returns {string} Current state name
   */
  getCurrentState() {
    return this.stateManager.getCurrentState();
  }

  /**
   * Gets the current player
   *
   * @returns {Object|null} Current player object
   */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  /**
   * Gets a player by ID
   *
   * @param {string} playerId - Player ID to find
   * @returns {Object|null} Player object or null if not found
   */
  getPlayerById(playerId) {
    return this.players.find((p) => p.id === playerId) || null;
  }

  /**
   * Gets all players
   *
   * @returns {Array<Object>} Array of player objects
   */
  getPlayers() {
    return [...this.players];
  }

  /**
   * Gets active players (not eliminated)
   *
   * @returns {Array<Object>} Array of active player objects
   */
  getActivePlayers() {
    return this.players.filter((p) => p.active);
  }

  /**
   * Checks if it's a specific player's turn
   *
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if it's the player's turn
   */
  isPlayerTurn(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer && currentPlayer.id === playerId;
  }

  /**
   * Gets game information summary
   *
   * @returns {Object} Game information object
   */
  getGameInfo() {
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      state: this.getCurrentState(),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        ready: p.ready,
        active: p.active,
        score: p.score,
      })),
      currentPlayer: this.getCurrentPlayer()?.id,
      round: this.round,
      turn: this.turn,
      metadata: this.metadata,
    };
  }

  /**
   * Gets detailed game state for serialization
   *
   * @returns {Object} Complete game state object
   */
  serialize() {
    return {
      gameId: this.gameId,
      gameType: this.gameType,
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      round: this.round,
      turn: this.turn,
      gameData: this.gameData,
      metadata: this.metadata,
      state: this.getCurrentState(),
      stateHistory: this.stateManager.getHistory(),
      timestamp: Date.now(),
    };
  }

  /**
   * Restores game state from serialized data
   *
   * @param {Object} data - Serialized game state
   * @returns {boolean} True if restoration was successful
   */
  static deserialize(data) {
    // This would be implemented to restore a complete game state
    // For now, we'll return a placeholder
    throw new Error("GameState.deserialize() not yet implemented");
  }

  // Validation methods

  /**
   * Checks if minimum players are present
   *
   * @returns {boolean} True if minimum players requirement is met
   */
  hasMinimumPlayers() {
    return this.players.length >= this.minPlayers;
  }

  /**
   * Checks if all players are ready
   *
   * @returns {boolean} True if all players are ready
   */
  allPlayersReady() {
    return this.players.length > 0 && this.players.every((p) => p.ready);
  }

  // Game-specific methods (to be overridden by specific game implementations)

  /**
   * Initializes game-specific data
   * Override this method in game-specific classes
   *
   * @param {Object} config - Game configuration
   * @protected
   */
  async initializeGameData(config) {
    // Set all players to ready by default
    this.players.forEach((player) => (player.ready = true));
  }

  /**
   * Deals cards to players
   * Override this method in game-specific classes
   *
   * @protected
   */
  async dealCards() {
    // Default implementation - to be overridden
    this.stateManager.eventBus.emit(GAME_EVENTS.CARDS_DEALT, {
      gameId: this.gameId,
    });
  }

  /**
   * Validates a player move
   * Override this method in game-specific classes
   *
   * @param {string} playerId - Player making the move
   * @param {Object} move - Move to validate
   * @throws {Error} If move is invalid
   * @protected
   */
  validateMove(playerId, move) {
    // Default implementation - always valid
    // Override in specific game classes
  }

  /**
   * Executes a validated player move
   * Override this method in game-specific classes
   *
   * @param {string} playerId - Player making the move
   * @param {Object} move - Move to execute
   * @protected
   */
  executeMove(playerId, move) {
    // Default implementation - emit event
    this.stateManager.eventBus.emit(PLAYER_EVENTS.PLAYER_MOVE, {
      gameId: this.gameId,
      playerId,
      move,
      turn: this.turn,
    });
  }

  /**
   * Checks if game should end
   * Override this method in game-specific classes
   *
   * @returns {boolean} True if game should end
   * @protected
   */
  checkGameEndConditions() {
    // Default implementation - never ends
    // Override in specific game classes
    return false;
  }

  // Helper methods

  /**
   * Gets the index of the next active player
   * @private
   * @returns {number} Next active player index
   */
  getNextActivePlayerIndex() {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return 0;

    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;

    // Find next active player
    while (
      !this.players[nextIndex].active &&
      nextIndex !== this.currentPlayerIndex
    ) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }

    return nextIndex;
  }

  /**
   * Handles player leaving during gameplay
   * @private
   * @param {string} playerId - Player ID that left
   */
  handlePlayerLeave(playerId) {
    const player = this.getPlayerById(playerId);
    if (player) {
      player.active = false;

      // If it was the current player's turn, advance turn
      if (this.isPlayerTurn(playerId)) {
        this.nextTurn();
      }
    }
  }

  /**
   * Resets game data for new game
   * @private
   */
  resetGameData() {
    this.round = 0;
    this.turn = 0;
    this.currentPlayerIndex = 0;
    this.gameData = {};
    this.metadata.startedAt = null;
    this.metadata.endedAt = null;
    this.metadata.winner = null;
    this.metadata.totalMoves = 0;

    // Reset player states
    this.players.forEach((player) => {
      player.ready = false;
      player.active = true;
      player.hand = [];
      player.score = 0;
    });
  }

  /**
   * Calculates final game results
   * @private
   */
  calculateFinalResults() {
    // Find winner (highest score by default)
    const winner = this.players.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );

    this.metadata.winner = winner.id;

    this.stateManager.eventBus.emit(GAME_EVENTS.WINNER_DECLARED, {
      gameId: this.gameId,
      winner: winner,
      finalScores: this.players.map((p) => ({ id: p.id, score: p.score })),
    });
  }

  /**
   * Handles game errors
   * @private
   * @param {Object} data - Error data
   */
  handleGameError(data) {
    this.stateManager.eventBus.emit(SYSTEM_EVENTS.ERROR_OCCURRED, {
      type: "game_error",
      gameId: this.gameId,
      gameType: this.gameType,
      ...data,
    });
  }

  /**
   * Generates a unique game ID
   * @private
   * @returns {string} Unique game identifier
   */
  generateGameId() {
    return `${this.gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
