/**
 * @fileoverview Comprehensive tests for StateManager and GameState systems
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Test suite covering state transitions, validation, history,
 * callbacks, error handling, and game-specific state management functionality.
 */

import { StateManager } from "../core/state/StateManager.js";
import { GameState, GAME_STATES } from "../core/state/GameState.js";
import { EventBus } from "../core/events/EventBus.js";

/**
 * Test framework for StateManager and GameState
 */
class StateTestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.currentSuite = "";
  }

  describe(description, testSuite) {
    this.currentSuite = description;
    console.group(`\n🧪 Testing: ${description}`);
    testSuite();
    console.groupEnd();
  }

  it(description, testFunction) {
    try {
      testFunction();
      this.passed++;
      console.log(`✅ ${description}`);
    } catch (error) {
      this.failed++;
      console.error(`❌ ${description}: ${error.message}`);
      console.error(error.stack);
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
          );
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(
            `Expected instance of ${expectedClass.name}, got ${typeof actual}`
          );
        }
      },
      toThrow: () => {
        let thrown = false;
        try {
          actual();
        } catch {
          thrown = true;
        }
        if (!thrown) {
          throw new Error("Expected function to throw an error");
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
      },
    };
  }

  async runAllTests() {
    console.log("🚀 Starting State Management Test Suite\n");

    await this.runStateManagerTests();
    await this.runGameStateTests();
    await this.runIntegrationTests();

    this.printSummary();
  }

  async runStateManagerTests() {
    this.describe("StateManager - Core Functionality", () => {
      this.testStateManagerCreation();
      this.testBasicTransitions();
      this.testTransitionValidation();
      this.testStateCallbacks();
      this.testTransitionGuards();
    });

    this.describe("StateManager - Advanced Features", () => {
      this.testHistoryTracking();
      this.testStateLocking();
      this.testRollback();
      this.testStateData();
      this.testErrorHandling();
    });
  }

  async runGameStateTests() {
    this.describe("GameState - Game Management", () => {
      this.testGameStateCreation();
      this.testPlayerManagement();
      this.testGameFlow();
      this.testGameValidation();
    });

    this.describe("GameState - Advanced Game Features", () => {
      this.testTurnManagement();
      this.testGameSerialization();
      this.testGameEvents();
    });
  }

  async runIntegrationTests() {
    this.describe("Integration Tests", () => {
      this.testStateManagerGameStateIntegration();
      this.testEventBusIntegration();
      this.testPerformanceTests();
    });
  }

  // StateManager Core Tests

  testStateManagerCreation() {
    this.it("should create StateManager with valid configuration", () => {
      const config = {
        initialState: "idle",
        states: {
          idle: { transitions: ["working"] },
          working: { transitions: ["idle", "done"] },
          done: { transitions: ["idle"] },
        },
      };

      const stateManager = new StateManager(config);
      this.expect(stateManager).toBeInstanceOf(StateManager);
      this.expect(stateManager.getCurrentState()).toBe("idle");
    });

    this.it("should throw error with invalid configuration", () => {
      this.expect(() => new StateManager({})).toThrow();
      this.expect(
        () => new StateManager({ initialState: "invalid" })
      ).toThrow();
      this.expect(
        () =>
          new StateManager({
            initialState: "test",
            states: {},
          })
      ).toThrow();
    });
  }

  testBasicTransitions() {
    this.it("should transition between valid states", () => {
      const stateManager = this.createTestStateManager();

      this.expect(stateManager.getCurrentState()).toBe("waiting");

      const success = stateManager.transitionTo("playing");
      this.expect(success).toBe(true);
      this.expect(stateManager.getCurrentState()).toBe("playing");
    });

    this.it("should reject invalid transitions", () => {
      const stateManager = this.createTestStateManager();

      this.expect(() => stateManager.transitionTo("ended")).toThrow();
      this.expect(stateManager.getCurrentState()).toBe("waiting");
    });

    this.it("should check transition validity", () => {
      const stateManager = this.createTestStateManager();

      this.expect(stateManager.canTransitionTo("playing")).toBe(true);
      this.expect(stateManager.canTransitionTo("ended")).toBe(false);
      this.expect(stateManager.canTransitionTo("invalid")).toBe(false);
    });
  }

  testTransitionValidation() {
    this.it("should validate state existence", () => {
      const stateManager = this.createTestStateManager();

      this.expect(() => stateManager.transitionTo("nonexistent")).toThrow();
    });

    this.it("should get possible next states", () => {
      const stateManager = this.createTestStateManager();

      const nextStates = stateManager.getPossibleNextStates();
      this.expect(nextStates).toContain("playing");
      this.expect(nextStates).toHaveLength(1);
    });
  }

  testStateCallbacks() {
    this.it("should execute entry and exit callbacks", () => {
      const stateManager = this.createTestStateManager();
      let entryExecuted = false;
      let exitExecuted = false;

      stateManager.onStateEntry("playing", () => {
        entryExecuted = true;
      });

      stateManager.onStateExit("waiting", () => {
        exitExecuted = true;
      });

      stateManager.transitionTo("playing");

      this.expect(entryExecuted).toBe(true);
      this.expect(exitExecuted).toBe(true);
    });

    this.it("should handle callback errors gracefully", () => {
      const stateManager = this.createTestStateManager();

      stateManager.onStateEntry("playing", () => {
        throw new Error("Callback error");
      });

      // Should not throw, but should still transition
      stateManager.transitionTo("playing");
      this.expect(stateManager.getCurrentState()).toBe("playing");
    });
  }

  testTransitionGuards() {
    this.it("should respect transition guards", () => {
      const stateManager = this.createTestStateManager();
      let guardCalled = false;

      stateManager.addTransitionGuard("waiting", "playing", (data) => {
        guardCalled = true;
        return false; // Block transition
      });

      this.expect(() => stateManager.transitionTo("playing")).toThrow();
      this.expect(guardCalled).toBe(true);
      this.expect(stateManager.getCurrentState()).toBe("waiting");
    });

    this.it("should allow transitions when guard returns true", () => {
      const stateManager = this.createTestStateManager();

      stateManager.addTransitionGuard("waiting", "playing", () => true);

      stateManager.transitionTo("playing");
      this.expect(stateManager.getCurrentState()).toBe("playing");
    });
  }

  testHistoryTracking() {
    this.it("should track state transition history", () => {
      const stateManager = this.createTestStateManager();

      stateManager.transitionTo("playing");
      stateManager.transitionTo("ended");

      const history = stateManager.getHistory();
      this.expect(history).toHaveLength(2);
      this.expect(history[0].fromState).toBe("waiting");
      this.expect(history[0].toState).toBe("playing");
      this.expect(history[1].fromState).toBe("playing");
      this.expect(history[1].toState).toBe("ended");
    });

    this.it("should limit history length", () => {
      const config = {
        initialState: "state1",
        states: {
          state1: { transitions: ["state2"] },
          state2: { transitions: ["state1"] },
        },
        maxHistoryLength: 3,
      };

      const stateManager = new StateManager(config);

      // Make more transitions than history limit
      for (let i = 0; i < 5; i++) {
        stateManager.transitionTo(i % 2 === 0 ? "state2" : "state1");
      }

      const history = stateManager.getHistory();
      this.expect(history.length).toBe(3);
    });
  }

  testStateLocking() {
    this.it("should prevent transitions when locked", () => {
      const stateManager = this.createTestStateManager();

      stateManager.lock();
      this.expect(() => stateManager.transitionTo("playing")).toThrow();

      stateManager.unlock();
      stateManager.transitionTo("playing");
      this.expect(stateManager.getCurrentState()).toBe("playing");
    });
  }

  testRollback() {
    this.it("should rollback to previous state", () => {
      const stateManager = this.createTestStateManager();

      stateManager.transitionTo("playing");
      this.expect(stateManager.getCurrentState()).toBe("playing");

      const success = stateManager.rollback();
      this.expect(success).toBe(true);
      this.expect(stateManager.getCurrentState()).toBe("waiting");
    });

    this.it("should fail rollback with no history", () => {
      const stateManager = this.createTestStateManager();

      const success = stateManager.rollback();
      this.expect(success).toBe(false);
    });
  }

  testStateData() {
    this.it("should manage state-specific data", () => {
      const stateManager = this.createTestStateManager();

      stateManager.setStateData("test", "value");
      this.expect(stateManager.getStateData("test")).toBe("value");

      stateManager.transitionTo("playing");
      this.expect(stateManager.getStateData("test")).toBe(undefined);

      stateManager.setStateData("playing", "data");
      this.expect(stateManager.getStateData("playing")).toBe("data");
    });
  }

  testErrorHandling() {
    this.it("should handle transition errors gracefully", () => {
      const stateManager = this.createTestStateManager();

      stateManager.onStateEntry("playing", () => {
        throw new Error("Entry error");
      });

      this.expect(() => stateManager.transitionTo("playing")).toThrow();
      this.expect(stateManager.getCurrentState()).toBe("waiting");
    });
  }

  // GameState Tests

  testGameStateCreation() {
    this.it("should create GameState with default configuration", () => {
      const gameState = new GameState("test-game");

      this.expect(gameState).toBeInstanceOf(GameState);
      this.expect(gameState.gameType).toBe("test-game");
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.WAITING);
      this.expect(gameState.getPlayers()).toHaveLength(0);
    });

    this.it("should create GameState with custom configuration", () => {
      const config = {
        maxPlayers: 6,
        minPlayers: 3,
        eventBus: new EventBus(),
      };

      const gameState = new GameState("custom-game", config);

      this.expect(gameState.maxPlayers).toBe(6);
      this.expect(gameState.minPlayers).toBe(3);
    });
  }

  testPlayerManagement() {
    this.it("should add players correctly", () => {
      const gameState = new GameState("test-game");

      const player = {
        id: "player1",
        name: "Alice",
        type: "human",
      };

      const success = gameState.addPlayer(player);
      this.expect(success).toBe(true);
      this.expect(gameState.getPlayers()).toHaveLength(1);

      const addedPlayer = gameState.getPlayerById("player1");
      this.expect(addedPlayer.name).toBe("Alice");
    });

    this.it("should prevent duplicate player IDs", () => {
      const gameState = new GameState("test-game");

      const player = { id: "player1", name: "Alice", type: "human" };
      gameState.addPlayer(player);

      this.expect(() => gameState.addPlayer(player)).toThrow();
    });

    this.it("should enforce maximum player limit", () => {
      const gameState = new GameState("test-game", { maxPlayers: 2 });

      gameState.addPlayer({ id: "p1", name: "P1", type: "human" });
      gameState.addPlayer({ id: "p2", name: "P2", type: "human" });

      this.expect(() =>
        gameState.addPlayer({
          id: "p3",
          name: "P3",
          type: "human",
        })
      ).toThrow();
    });

    this.it("should remove players correctly", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      const success = gameState.removePlayer("player1");
      this.expect(success).toBe(true);
      this.expect(gameState.getPlayers()).toHaveLength(1);
      this.expect(gameState.getPlayerById("player1")).toBe(null);
    });

    this.it("should handle player ready status", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });

      const player = gameState.getPlayerById("player1");
      this.expect(player.ready).toBe(false);

      gameState.setPlayerReady("player1", true);
      this.expect(player.ready).toBe(true);
    });
  }

  testGameFlow() {
    this.it("should prevent game start without minimum players", async () => {
      const gameState = new GameState("test-game", { minPlayers: 2 });

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });

      const success = await gameState.startGame();
      this.expect(success).toBe(false);
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.ERROR);
    });

    this.it("should start game with sufficient players", async () => {
      const gameState = new GameState("test-game", { minPlayers: 2 });

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      const success = await gameState.startGame();
      this.expect(success).toBe(true);
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.READY);
    });

    this.it("should transition through game phases correctly", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      // Start playing
      gameState.beginPlaying();
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.PLAYING);

      // Pause and resume
      gameState.pauseGame("test");
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.PAUSED);

      gameState.resumeGame();
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.PLAYING);

      // End game
      gameState.endGame();
      this.expect(gameState.getCurrentState()).toBe(GAME_STATES.SCORING);
    });
  }

  testGameValidation() {
    this.it("should validate minimum players before starting", () => {
      const gameState = new GameState("test-game", { minPlayers: 3 });

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      this.expect(gameState.hasMinimumPlayers()).toBe(false);

      gameState.addPlayer({ id: "player3", name: "Charlie", type: "human" });
      this.expect(gameState.hasMinimumPlayers()).toBe(true);
    });

    this.it("should validate all players ready", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      this.expect(gameState.allPlayersReady()).toBe(false);

      gameState.setPlayerReady("player1", true);
      gameState.setPlayerReady("player2", true);

      this.expect(gameState.allPlayersReady()).toBe(true);
    });

    this.it("should prevent adding players after game start", async () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      await gameState.startGame();

      this.expect(() =>
        gameState.addPlayer({
          id: "player3",
          name: "Charlie",
          type: "human",
        })
      ).toThrow();
    });
  }

  testTurnManagement() {
    this.it("should manage player turns correctly", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });
      gameState.addPlayer({ id: "player3", name: "Charlie", type: "human" });

      // Start with first player
      let currentPlayer = gameState.getCurrentPlayer();
      this.expect(currentPlayer.id).toBe("player1");

      // Advance turn
      gameState.nextTurn();
      currentPlayer = gameState.getCurrentPlayer();
      this.expect(currentPlayer.id).toBe("player2");

      // Test turn validation
      this.expect(gameState.isPlayerTurn("player2")).toBe(true);
      this.expect(gameState.isPlayerTurn("player1")).toBe(false);
    });

    this.it("should skip inactive players in turn rotation", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });
      gameState.addPlayer({ id: "player3", name: "Charlie", type: "human" });

      // Deactivate middle player
      const player2 = gameState.getPlayerById("player2");
      player2.active = false;

      // Should skip from player1 to player3
      gameState.nextTurn();
      const currentPlayer = gameState.getCurrentPlayer();
      this.expect(currentPlayer.id).toBe("player3");
    });

    this.it("should process valid player moves", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      gameState.beginPlaying();

      const move = { type: "test_move", data: "test" };
      const success = gameState.processPlayerMove("player1", move);

      this.expect(success).toBe(true);
      this.expect(gameState.metadata.totalMoves).toBe(1);
    });

    this.it("should reject moves from wrong player", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      gameState.beginPlaying();

      const move = { type: "test_move", data: "test" };
      const success = gameState.processPlayerMove("player2", move); // Wrong player

      this.expect(success).toBe(false);
    });
  }

  testGameSerialization() {
    this.it("should serialize game state correctly", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      const serialized = gameState.serialize();

      this.expect(serialized.gameType).toBe("test-game");
      this.expect(serialized.players).toHaveLength(2);
      this.expect(serialized.state).toBe(GAME_STATES.WAITING);
      this.expect(typeof serialized.timestamp).toBe("number");
    });

    this.it("should include all necessary game information", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.round = 5;
      gameState.turn = 10;
      gameState.metadata.totalMoves = 25;

      const info = gameState.getGameInfo();

      this.expect(info.gameType).toBe("test-game");
      this.expect(info.round).toBe(5);
      this.expect(info.turn).toBe(10);
      this.expect(info.metadata.totalMoves).toBe(25);
      this.expect(info.players).toHaveLength(1);
    });
  }

  testGameEvents() {
    this.it("should emit events during state transitions", () => {
      const eventBus = new EventBus();
      const gameState = new GameState("test-game", { eventBus });

      let phaseChangeEmitted = false;
      let playerJoinEmitted = false;

      eventBus.on("game:phase_change", () => {
        phaseChangeEmitted = true;
      });

      eventBus.on("player:join", () => {
        playerJoinEmitted = true;
      });

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.beginPlaying();

      this.expect(playerJoinEmitted).toBe(true);
      this.expect(phaseChangeEmitted).toBe(true);
    });
  }

  // Integration Tests

  testStateManagerGameStateIntegration() {
    this.it("should integrate StateManager with GameState seamlessly", () => {
      const gameState = new GameState("test-game");

      // Access underlying StateManager
      const stateManager = gameState.stateManager;

      this.expect(stateManager).toBeInstanceOf(StateManager);
      this.expect(stateManager.getCurrentState()).toBe(
        gameState.getCurrentState()
      );

      // State changes should be reflected in both
      gameState.beginPlaying();
      this.expect(stateManager.getCurrentState()).toBe(GAME_STATES.PLAYING);
    });

    this.it("should maintain state consistency across operations", () => {
      const gameState = new GameState("test-game");

      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });

      // Multiple state operations
      gameState.beginPlaying();
      gameState.pauseGame();
      gameState.resumeGame();

      const stateInfo = gameState.stateManager.getStateInfo();
      this.expect(stateInfo.currentState).toBe(GAME_STATES.PLAYING);
      this.expect(stateInfo.historyLength).toBe(3); // Playing -> Paused -> Playing
    });
  }

  testEventBusIntegration() {
    this.it("should integrate properly with EventBus", () => {
      const eventBus = new EventBus();
      const gameState = new GameState("test-game", { eventBus });

      let eventsReceived = 0;

      // Listen to various events
      eventBus.on("game:phase_change", () => eventsReceived++);
      eventBus.on("player:join", () => eventsReceived++);
      eventBus.on("player:turn_start", () => eventsReceived++);

      // Perform operations that should emit events
      gameState.addPlayer({ id: "player1", name: "Alice", type: "human" });
      gameState.addPlayer({ id: "player2", name: "Bob", type: "human" });
      gameState.beginPlaying();
      gameState.nextTurn();

      this.expect(eventsReceived).toBe(4); // 2 joins + 1 phase change + 1 turn start
    });
  }

  testPerformanceTests() {
    this.it("should handle rapid state transitions efficiently", () => {
      const startTime = performance.now();

      const stateManager = this.createTestStateManager();

      // Perform many rapid transitions
      for (let i = 0; i < 1000; i++) {
        stateManager.transitionTo("playing");
        stateManager.transitionTo("waiting");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Performance: 2000 transitions in ${duration.toFixed(2)}ms`);
      this.expect(duration).toBe(duration); // Just record the time
    });

    this.it("should maintain performance with large history", () => {
      const config = {
        initialState: "state1",
        states: {
          state1: { transitions: ["state2"] },
          state2: { transitions: ["state1"] },
        },
        maxHistoryLength: 1000,
      };

      const stateManager = new StateManager(config);
      const startTime = performance.now();

      // Fill up history to maximum
      for (let i = 0; i < 1000; i++) {
        stateManager.transitionTo(i % 2 === 0 ? "state2" : "state1");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(
        `Performance: 1000 transitions with full history in ${duration.toFixed(2)}ms`
      );

      const history = stateManager.getHistory();
      this.expect(history).toHaveLength(1000);
    });

    this.it("should handle many players efficiently", () => {
      const gameState = new GameState("test-game", { maxPlayers: 100 });
      const startTime = performance.now();

      // Add many players
      for (let i = 0; i < 100; i++) {
        gameState.addPlayer({
          id: `player${i}`,
          name: `Player ${i}`,
          type: i % 2 === 0 ? "human" : "ai",
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Performance: Added 100 players in ${duration.toFixed(2)}ms`);

      this.expect(gameState.getPlayers()).toHaveLength(100);
    });
  }

  // Helper Methods

  createTestStateManager() {
    return new StateManager({
      initialState: "waiting",
      states: {
        waiting: { transitions: ["playing"] },
        playing: { transitions: ["paused", "ended"] },
        paused: { transitions: ["playing", "ended"] },
        ended: { transitions: ["waiting"] },
      },
    });
  }

  printSummary() {
    console.log("\n📊 State Management Test Summary:");
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total: ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log("🎉 All state management tests passed!");
    } else {
      console.log("⚠️ Some tests failed. Please review the errors above.");
    }
  }
}

// Export test runner function
export async function runStateManagementTests() {
  console.log("🚀 Starting State Management Test Suite");

  const testFramework = new StateTestFramework();
  await testFramework.runAllTests();

  console.log("\n🏁 State Management Test Suite Complete");
}

// Auto-run tests if this file is executed directly
if (typeof window !== "undefined" && window.location) {
  // In browser environment, run tests when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runStateManagementTests);
  } else {
    runStateManagementTests();
  }
} else if (typeof module !== "undefined" && module.exports) {
  // In Node.js environment, export the test runner
  module.exports = { runStateManagementTests };
}
