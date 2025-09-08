/**
 * @fileoverview Unit tests for the EventBus system
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Comprehensive test suite for EventBus functionality including
 * subscription, emission, priority handling, error isolation, and cleanup.
 */

import { EventBus } from "../EventBus.js";
import { GAME_EVENTS, PLAYER_EVENTS } from "../EventTypes.js";

/**
 * Simple test framework - we'll build our own since we're not using external libraries
 */
class TestFramework {
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
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
    };
  }

  async runTests() {
    await this.runEventBusTests();
    this.printSummary();
  }

  async runEventBusTests() {
    // Basic functionality tests
    this.describe("EventBus - Basic Functionality", () => {
      this.testEventBusCreation();
      this.testBasicSubscriptionAndEmission();
      this.testMultipleListeners();
      this.testUnsubscription();
    });

    // Priority system tests
    this.describe("EventBus - Priority System", () => {
      this.testPriorityExecution();
      this.testPriorityOrderingWithMultipleListeners();
    });

    // One-time listeners tests
    this.describe("EventBus - One-time Listeners", () => {
      this.testOnceListener();
      this.testOnceListenerCleanup();
    });

    // Error handling tests
    this.describe("EventBus - Error Handling", () => {
      this.testErrorIsolation();
      this.testInvalidEventNames();
      this.testInvalidCallbacks();
    });

    // Advanced features tests
    this.describe("EventBus - Advanced Features", () => {
      this.testEventHistory();
      this.testDebugMode();
      this.testListenerCounting();
      this.testEventListing();
    });

    // Cleanup and utility tests
    this.describe("EventBus - Cleanup and Utilities", () => {
      this.testRemoveAllListeners();
      this.testClearAllListeners();
      this.testUtilityMethods();
    });
  }

  // Basic functionality test methods
  testEventBusCreation() {
    this.it("should create a new EventBus instance", () => {
      const eventBus = new EventBus();
      this.expect(eventBus).toBeInstanceOf(EventBus);
      this.expect(eventBus.listeners).toBeInstanceOf(Map);
      this.expect(eventBus.onceListeners).toBeInstanceOf(Map);
    });
  }

  testBasicSubscriptionAndEmission() {
    this.it("should subscribe and emit events correctly", () => {
      const eventBus = new EventBus();
      let eventData = null;
      let callCount = 0;

      const unsubscribe = eventBus.on("test:event", (data) => {
        eventData = data;
        callCount++;
      });

      const result = eventBus.emit("test:event", { message: "Hello World" });

      this.expect(result).toBe(true);
      this.expect(eventData).toEqual({ message: "Hello World" });
      this.expect(callCount).toBe(1);

      // Test that unsubscribe function works
      unsubscribe();
      eventBus.emit("test:event", { message: "Should not trigger" });
      this.expect(callCount).toBe(1); // Should still be 1
    });
  }

  testMultipleListeners() {
    this.it("should handle multiple listeners for the same event", () => {
      const eventBus = new EventBus();
      const results = [];

      eventBus.on("multi:test", () => results.push("first"));
      eventBus.on("multi:test", () => results.push("second"));
      eventBus.on("multi:test", () => results.push("third"));

      eventBus.emit("multi:test");

      this.expect(results.length).toBe(3);
      this.expect(results).toEqual(["first", "second", "third"]);
    });
  }

  testUnsubscription() {
    this.it("should properly unsubscribe listeners", () => {
      const eventBus = new EventBus();
      let count = 0;

      const listener1 = () => count++;
      const listener2 = () => count++;

      eventBus.on("unsub:test", listener1);
      eventBus.on("unsub:test", listener2);

      eventBus.emit("unsub:test");
      this.expect(count).toBe(2);

      // Remove one listener
      const removed = eventBus.off("unsub:test", listener1);
      this.expect(removed).toBe(true);

      eventBus.emit("unsub:test");
      this.expect(count).toBe(3); // Only listener2 should fire

      // Try to remove non-existent listener
      const notRemoved = eventBus.off("unsub:test", listener1);
      this.expect(notRemoved).toBe(false);
    });
  }

  // Priority system test methods
  testPriorityExecution() {
    this.it("should execute listeners in priority order", () => {
      const eventBus = new EventBus();
      const executionOrder = [];

      eventBus.on("priority:test", () => executionOrder.push("low"), 1);
      eventBus.on("priority:test", () => executionOrder.push("high"), 10);
      eventBus.on("priority:test", () => executionOrder.push("medium"), 5);

      eventBus.emit("priority:test");

      this.expect(executionOrder).toEqual(["high", "medium", "low"]);
    });
  }

  testPriorityOrderingWithMultipleListeners() {
    this.it("should maintain priority order with many listeners", () => {
      const eventBus = new EventBus();
      const results = [];

      // Add listeners with various priorities
      for (let i = 0; i < 10; i++) {
        const priority = Math.floor(Math.random() * 100);
        eventBus.on("complex:priority", () => results.push(priority), priority);
      }

      eventBus.emit("complex:priority");

      // Check that results are in descending priority order
      for (let i = 1; i < results.length; i++) {
        this.expect(results[i - 1]).toBeGreaterThan(results[i] - 1); // Allow for equal priorities
      }
    });
  }

  // One-time listeners test methods
  testOnceListener() {
    this.it("should execute once listeners only once", () => {
      const eventBus = new EventBus();
      let count = 0;

      eventBus.once("once:test", () => count++);

      eventBus.emit("once:test");
      eventBus.emit("once:test");
      eventBus.emit("once:test");

      this.expect(count).toBe(1);
    });
  }

  testOnceListenerCleanup() {
    this.it("should clean up once listeners after execution", () => {
      const eventBus = new EventBus();

      eventBus.once("cleanup:test", () => {});
      this.expect(eventBus.getListenerCount("cleanup:test")).toBe(1);

      eventBus.emit("cleanup:test");
      this.expect(eventBus.getListenerCount("cleanup:test")).toBe(0);
    });
  }

  // Error handling test methods
  testErrorIsolation() {
    this.it("should isolate errors in listeners", () => {
      const eventBus = new EventBus();
      let goodListenerExecuted = false;

      // Add a listener that throws an error
      eventBus.on("error:test", () => {
        throw new Error("Test error");
      });

      // Add a listener that should still execute
      eventBus.on("error:test", () => {
        goodListenerExecuted = true;
      });

      // This should not throw, despite the first listener erroring
      eventBus.emit("error:test");

      this.expect(goodListenerExecuted).toBe(true);
    });
  }

  testInvalidEventNames() {
    this.it("should throw errors for invalid event names", () => {
      const eventBus = new EventBus();

      this.expect(() => eventBus.on("", () => {})).toThrow();
      this.expect(() => eventBus.on(null, () => {})).toThrow();
      this.expect(() => eventBus.on(123, () => {})).toThrow();
      this.expect(() => eventBus.emit("")).toThrow();
    });
  }

  testInvalidCallbacks() {
    this.it("should throw errors for invalid callbacks", () => {
      const eventBus = new EventBus();

      this.expect(() => eventBus.on("test", null)).toThrow();
      this.expect(() => eventBus.on("test", "not a function")).toThrow();
      this.expect(() => eventBus.on("test", 123)).toThrow();
      this.expect(() => eventBus.once("test", null)).toThrow();
    });
  }

  // Advanced features test methods
  testEventHistory() {
    this.it("should maintain event history", () => {
      const eventBus = new EventBus();

      eventBus.emit("history:test1", { data: 1 });
      eventBus.emit("history:test2", { data: 2 });
      eventBus.emit("history:test3", { data: 3 });

      const history = eventBus.getEventHistory(3);
      this.expect(history.length).toBe(3);
      this.expect(history[0].event).toBe("history:test1");
      this.expect(history[1].event).toBe("history:test2");
      this.expect(history[2].event).toBe("history:test3");

      // Test history limit
      const limitedHistory = eventBus.getEventHistory(2);
      this.expect(limitedHistory.length).toBe(2);

      // Test clear history
      eventBus.clearHistory();
      const clearedHistory = eventBus.getEventHistory();
      this.expect(clearedHistory.length).toBe(0);
    });
  }

  testDebugMode() {
    this.it("should enable and disable debug mode", () => {
      const eventBus = new EventBus();

      this.expect(eventBus.debugMode).toBe(false);

      eventBus.setDebugMode(true);
      this.expect(eventBus.debugMode).toBe(true);

      eventBus.setDebugMode(false);
      this.expect(eventBus.debugMode).toBe(false);
    });
  }

  testListenerCounting() {
    this.it("should correctly count listeners", () => {
      const eventBus = new EventBus();

      this.expect(eventBus.getListenerCount("count:test")).toBe(0);

      eventBus.on("count:test", () => {});
      this.expect(eventBus.getListenerCount("count:test")).toBe(1);

      eventBus.on("count:test", () => {});
      this.expect(eventBus.getListenerCount("count:test")).toBe(2);

      eventBus.once("count:test", () => {});
      this.expect(eventBus.getListenerCount("count:test")).toBe(3);
    });
  }

  testEventListing() {
    this.it("should list all events with listeners", () => {
      const eventBus = new EventBus();

      this.expect(eventBus.getEvents().length).toBe(0);

      eventBus.on("list:test1", () => {});
      eventBus.on("list:test2", () => {});
      eventBus.once("list:test3", () => {});

      const events = eventBus.getEvents();
      this.expect(events.length).toBe(3);
      this.expect(events).toContain("list:test1");
      this.expect(events).toContain("list:test2");
      this.expect(events).toContain("list:test3");
    });
  }

  // Cleanup and utility test methods
  testRemoveAllListeners() {
    this.it("should remove all listeners for a specific event", () => {
      const eventBus = new EventBus();

      eventBus.on("remove:test", () => {});
      eventBus.on("remove:test", () => {});
      eventBus.once("remove:test", () => {});
      eventBus.on("keep:test", () => {});

      const removedCount = eventBus.removeAllListeners("remove:test");
      this.expect(removedCount).toBe(3);
      this.expect(eventBus.getListenerCount("remove:test")).toBe(0);
      this.expect(eventBus.getListenerCount("keep:test")).toBe(1);
    });
  }

  testClearAllListeners() {
    this.it("should clear all listeners for all events", () => {
      const eventBus = new EventBus();

      eventBus.on("clear:test1", () => {});
      eventBus.on("clear:test2", () => {});
      eventBus.once("clear:test3", () => {});

      const totalRemoved = eventBus.clear();
      this.expect(totalRemoved).toBe(3);
      this.expect(eventBus.getEvents().length).toBe(0);
    });
  }

  testUtilityMethods() {
    this.it("should provide working utility methods", () => {
      const eventBus = new EventBus();
      let executed = false;

      const unsubscribe = eventBus.on("utility:test", () => {
        executed = true;
      });

      // Test that events array includes our event
      this.expect(eventBus.getEvents()).toContain("utility:test");

      // Test emission returns true when there are listeners
      const hasListeners = eventBus.emit("utility:test");
      this.expect(hasListeners).toBe(true);
      this.expect(executed).toBe(true);

      // Test emission returns false when there are no listeners
      unsubscribe();
      const noListeners = eventBus.emit("utility:test");
      this.expect(noListeners).toBe(false);
    });
  }

  printSummary() {
    console.log("\n📊 Test Summary:");
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total: ${this.passed + this.failed}`);

    if (this.failed === 0) {
      console.log("🎉 All tests passed!");
    } else {
      console.log("⚠️  Some tests failed. Please review the errors above.");
    }
  }
}

// Integration test with EventTypes
function testEventTypesIntegration() {
  console.group("\n🔗 Testing EventTypes Integration");

  const eventBus = new EventBus();
  let gameStarted = false;
  let playerJoined = false;

  // Test using defined event types
  eventBus.on(GAME_EVENTS.GAME_START, () => {
    gameStarted = true;
  });
  eventBus.on(PLAYER_EVENTS.PLAYER_JOIN, () => {
    playerJoined = true;
  });

  eventBus.emit(GAME_EVENTS.GAME_START, { gameType: "old-maid" });
  eventBus.emit(PLAYER_EVENTS.PLAYER_JOIN, { playerId: "player1" });

  if (gameStarted && playerJoined) {
    console.log("✅ EventTypes integration working correctly");
  } else {
    console.error("❌ EventTypes integration failed");
  }

  console.groupEnd();
}

// Performance test
function testEventBusPerformance() {
  console.group("\n⚡ Performance Tests");

  const eventBus = new EventBus();

  // Test with many listeners
  const listenerCount = 1000;
  const emissionCount = 1000;

  console.time("Adding listeners");
  for (let i = 0; i < listenerCount; i++) {
    eventBus.on("perf:test", () => {});
  }
  console.timeEnd("Adding listeners");

  console.time("Emitting events");
  for (let i = 0; i < emissionCount; i++) {
    eventBus.emit("perf:test", { iteration: i });
  }
  console.timeEnd("Emitting events");

  console.log(
    `✅ Performance test completed: ${listenerCount} listeners, ${emissionCount} emissions`
  );
  console.groupEnd();
}

// Run all tests
export async function runEventBusTests() {
  console.log("🚀 Starting EventBus Test Suite");

  const testFramework = new TestFramework();
  await testFramework.runTests();

  testEventTypesIntegration();
  testEventBusPerformance();

  console.log("\n🏁 EventBus Test Suite Complete");
}

// Auto-run tests if this file is executed directly
if (typeof window !== "undefined" && window.location) {
  // In browser environment, run tests when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runEventBusTests);
  } else {
    runEventBusTests();
  }
} else if (typeof module !== "undefined" && module.exports) {
  // In Node.js environment, export the test runner
  module.exports = { runEventBusTests };
}
