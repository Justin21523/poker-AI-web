/**
 * @fileoverview Tests for LearningEngine
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningEngine } from '../../src/ai/learning/LearningEngine.js';

describe('LearningEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new LearningEngine();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(engine.config.learningRate).toBe(0.1);
      expect(engine.config.discountFactor).toBe(0.95);
      expect(engine.config.explorationRate).toBe(0.3);
      expect(engine.currentExplorationRate).toBe(0.3);
    });

    it('should initialize with custom config', () => {
      const custom = new LearningEngine({
        learningRate: 0.2,
        discountFactor: 0.9,
        explorationRate: 0.5
      });

      expect(custom.config.learningRate).toBe(0.2);
      expect(custom.config.discountFactor).toBe(0.9);
      expect(custom.config.explorationRate).toBe(0.5);
    });

    it('should initialize empty Q-table', () => {
      expect(engine.qTable.size).toBe(0);
    });

    it('should initialize empty patterns', () => {
      const patterns = engine.getPatterns();
      expect(patterns.successfulBluffs.length).toBe(0);
      expect(patterns.failedBluffs.length).toBe(0);
    });

    it('should initialize default strategy parameters', () => {
      const params = engine.getStrategyParams();
      expect(params.aggressionLevel).toBe(1.0);
      expect(params.bluffFrequency).toBe(0.15);
      expect(params.valueBetSizing).toBeCloseTo(0.67, 2);
    });
  });

  describe('learning from hands', () => {
    it('should learn from winning hand', () => {
      const handHistory = {
        handId: 'hand-1',
        actions: [
          {
            type: 'raise',
            amount: 100,
            isOurAction: true,
            state: {
              phase: 'pre-flop',
              position: 'button',
              handStrength: 0.8,
              pot: 50,
              potToStackRatio: 0.05
            },
            legalActions: ['fold', 'call', 'raise']
          }
        ],
        result: {
          won: true,
          profit: 150
        }
      };

      engine.learn(handHistory);

      expect(engine.stats.totalHandsLearned).toBe(1);
      expect(engine.stats.totalReward).toBeGreaterThan(0);
      expect(engine.qTable.size).toBeGreaterThan(0);
    });

    it('should learn from losing hand', () => {
      const handHistory = {
        handId: 'hand-2',
        actions: [
          {
            type: 'call',
            amount: 50,
            isOurAction: true,
            state: {
              phase: 'pre-flop',
              position: 'early',
              handStrength: 0.3,
              pot: 100,
              potToStackRatio: 0.1
            }
          }
        ],
        result: {
          won: false,
          profit: -50
        }
      };

      engine.learn(handHistory);

      expect(engine.stats.totalHandsLearned).toBe(1);
      expect(engine.stats.totalReward).toBeLessThan(0);
    });

    it('should update Q-values', () => {
      const handHistory = {
        handId: 'hand-1',
        actions: [
          {
            type: 'raise',
            amount: 100,
            isOurAction: true,
            state: {
              phase: 'pre-flop',
              position: 'button',
              handStrength: 0.9,
              pot: 50,
              potToStackRatio: 0.05
            }
          }
        ],
        result: {
          won: true,
          profit: 200
        }
      };

      engine.learn(handHistory);

      const stateKey = engine._encodeState(handHistory.actions[0].state);
      const qValue = engine.getQValue(stateKey, 'raise');

      expect(qValue).not.toBe(0);
      expect(qValue).toBeGreaterThan(0); // Positive reward for winning
    });

    it('should calculate average reward', () => {
      // Win hand
      engine.learn({
        actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.8, pot: 50, potToStackRatio: 0.05 } }],
        result: { won: true, profit: 100 }
      });

      // Lose hand
      engine.learn({
        actions: [{ type: 'fold', isOurAction: true, state: { phase: 'pre-flop', position: 'early', handStrength: 0.2, pot: 50, potToStackRatio: 0.05 } }],
        result: { won: false, profit: -20 }
      });

      const stats = engine.getStats();
      expect(stats.averageReward).toBeDefined();
      expect(stats.totalHandsLearned).toBe(2);
    });
  });

  describe('Q-value operations', () => {
    it('should return 0 for unknown state', () => {
      const qValue = engine.getQValue('unknown-state', 'raise');
      expect(qValue).toBe(0);
    });

    it('should store and retrieve Q-values', () => {
      const stateKey = 'pre-flop-button-strong-small';

      // Manually set Q-value
      if (!engine.qTable.has(stateKey)) {
        engine.qTable.set(stateKey, new Map());
      }
      engine.qTable.get(stateKey).set('raise', 5.0);

      const qValue = engine.getQValue(stateKey, 'raise');
      expect(qValue).toBe(5.0);
    });

    it('should get best action', () => {
      const stateKey = 'pre-flop-button-strong-small';

      engine.qTable.set(stateKey, new Map([
        ['fold', -2.0],
        ['call', 1.0],
        ['raise', 3.0]
      ]));

      const bestAction = engine.getBestAction(stateKey, ['fold', 'call', 'raise']);
      expect(bestAction).toBe('raise');
    });

    it('should return null for unknown state when getting best action', () => {
      const bestAction = engine.getBestAction('unknown', ['fold', 'call']);
      expect(bestAction).toBeNull();
    });

    it('should return null for empty legal actions', () => {
      const bestAction = engine.getBestAction('some-state', []);
      expect(bestAction).toBeNull();
    });
  });

  describe('exploration vs exploitation', () => {
    it('should explore based on exploration rate', () => {
      engine.currentExplorationRate = 1.0; // Always explore

      let exploreCount = 0;
      for (let i = 0; i < 100; i++) {
        if (engine.shouldExplore()) {
          exploreCount++;
        }
      }

      expect(exploreCount).toBeGreaterThan(90); // Should explore almost always
    });

    it('should exploit when exploration rate is low', () => {
      engine.currentExplorationRate = 0.0; // Never explore

      let exploreCount = 0;
      for (let i = 0; i < 100; i++) {
        if (engine.shouldExplore()) {
          exploreCount++;
        }
      }

      expect(exploreCount).toBe(0); // Should never explore
    });

    it('should track exploration and exploitation counts', () => {
      engine.currentExplorationRate = 0.5;

      for (let i = 0; i < 100; i++) {
        engine.shouldExplore();
      }

      const stats = engine.getStats();
      expect(stats.explorationCount + stats.exploitationCount).toBe(100);
    });

    it('should decay exploration rate', () => {
      const initial = engine.currentExplorationRate;

      for (let i = 0; i < 100; i++) {
        engine._decayExploration();
      }

      expect(engine.currentExplorationRate).toBeLessThan(initial);
      expect(engine.currentExplorationRate).toBeGreaterThanOrEqual(engine.config.minExploration);
    });

    it('should not decay below minimum exploration', () => {
      engine.config.minExploration = 0.05;
      engine.currentExplorationRate = 0.06;

      for (let i = 0; i < 1000; i++) {
        engine._decayExploration();
      }

      expect(engine.currentExplorationRate).toBe(0.05);
    });
  });

  describe('pattern recognition', () => {
    it('should recognize successful bluffs', () => {
      const handHistory = {
        actions: [
          {
            type: 'raise',
            amount: 100,
            isOurAction: true,
            state: {
              phase: 'flop',
              position: 'button',
              handStrength: 0.2, // Weak hand
              pot: 100
            }
          }
        ],
        result: {
          won: true, // Won with weak hand = successful bluff
          profit: 150
        }
      };

      engine.learn(handHistory);

      const patterns = engine.getPatterns();
      expect(patterns.successfulBluffs.length).toBe(1);
      expect(patterns.successfulBluffs[0].success).toBe(true);
    });

    it('should recognize failed bluffs', () => {
      const handHistory = {
        actions: [
          {
            type: 'bet',
            amount: 50,
            isOurAction: true,
            state: {
              phase: 'turn',
              position: 'late',
              handStrength: 0.15, // Very weak hand
              pot: 100
            }
          }
        ],
        result: {
          won: false, // Lost with bluff
          profit: -50
        }
      };

      engine.learn(handHistory);

      const patterns = engine.getPatterns();
      expect(patterns.failedBluffs.length).toBe(1);
      expect(patterns.failedBluffs[0].success).toBe(false);
    });

    it('should recognize value bets', () => {
      const handHistory = {
        actions: [
          {
            type: 'bet',
            amount: 67,
            isOurAction: true,
            state: {
              phase: 'river',
              position: 'button',
              handStrength: 0.85, // Strong hand
              pot: 100
            }
          }
        ],
        result: {
          won: true,
          profit: 150
        }
      };

      engine.learn(handHistory);

      const patterns = engine.getPatterns();
      expect(patterns.successfulValueBets.length).toBe(1);
    });

    it('should recognize slow plays', () => {
      const handHistory = {
        actions: [
          {
            type: 'check',
            isOurAction: true,
            state: {
              phase: 'flop',
              position: 'button',
              handStrength: 0.9, // Very strong hand
              pot: 50
            }
          }
        ],
        result: {
          won: true,
          profit: 200
        }
      };

      engine.learn(handHistory);

      const patterns = engine.getPatterns();
      expect(patterns.successfulSlowPlays.length).toBe(1);
    });

    it('should limit pattern storage', () => {
      // Add 60 successful bluffs
      for (let i = 0; i < 60; i++) {
        engine.learn({
          actions: [{
            type: 'raise',
            isOurAction: true,
            state: { phase: 'flop', position: 'button', handStrength: 0.2, pot: 100 }
          }],
          result: { won: true, profit: 100 }
        });
      }

      const patterns = engine.getPatterns();
      expect(patterns.successfulBluffs.length).toBeLessThanOrEqual(50);
    });
  });

  describe('strategy adjustment', () => {
    it('should increase aggression after big wins', () => {
      const initial = engine.strategyParams.aggressionLevel;

      for (let i = 0; i < 10; i++) {
        engine.learn({
          actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.8, pot: 50 } }],
          result: { won: true, profit: 100 } // Big win
        });
      }

      expect(engine.strategyParams.aggressionLevel).toBeGreaterThan(initial);
    });

    it('should decrease aggression after big losses', () => {
      const initial = engine.strategyParams.aggressionLevel;

      for (let i = 0; i < 10; i++) {
        engine.learn({
          actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.5, pot: 50 } }],
          result: { won: false, profit: -100 } // Big loss
        });
      }

      expect(engine.strategyParams.aggressionLevel).toBeLessThan(initial);
    });

    it('should clamp aggression level', () => {
      // Try to push aggression very high
      for (let i = 0; i < 100; i++) {
        engine.learn({
          actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.9, pot: 50 } }],
          result: { won: true, profit: 200 }
        });
      }

      expect(engine.strategyParams.aggressionLevel).toBeLessThanOrEqual(2.0);

      // Try to push aggression very low
      engine.strategyParams.aggressionLevel = 1.0;
      for (let i = 0; i < 100; i++) {
        engine.learn({
          actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.3, pot: 50 } }],
          result: { won: false, profit: -200 }
        });
      }

      expect(engine.strategyParams.aggressionLevel).toBeGreaterThanOrEqual(0.5);
    });

    it('should adjust bluff frequency based on success', () => {
      // Add successful bluffs
      for (let i = 0; i < 15; i++) {
        engine.learn({
          actions: [{
            type: 'raise',
            isOurAction: true,
            state: { phase: 'flop', position: 'button', handStrength: 0.2, pot: 100 }
          }],
          result: { won: true, profit: 100 }
        });
      }

      // Add few failed bluffs
      for (let i = 0; i < 5; i++) {
        engine.learn({
          actions: [{
            type: 'raise',
            isOurAction: true,
            state: { phase: 'flop', position: 'button', handStrength: 0.2, pot: 100 }
          }],
          result: { won: false, profit: -50 }
        });
      }

      // Bluff success rate is 15/20 = 75%, should increase bluff frequency
      expect(engine.strategyParams.bluffFrequency).toBeGreaterThan(0.15);
    });

    it('should adjust value bet sizing', () => {
      const initial = engine.strategyParams.valueBetSizing;

      // Add profitable value bets
      for (let i = 0; i < 15; i++) {
        engine.learn({
          actions: [{
            type: 'bet',
            amount: 70,
            isOurAction: true,
            state: { phase: 'river', position: 'button', handStrength: 0.85, pot: 100 }
          }],
          result: { won: true, profit: 150 }
        });
      }

      // Should increase value bet sizing
      expect(engine.strategyParams.valueBetSizing).toBeGreaterThan(initial);
    });
  });

  describe('state encoding', () => {
    it('should encode state consistently', () => {
      const state = {
        phase: 'flop',
        position: 'button',
        handStrength: 0.75,
        pot: 100,
        potToStackRatio: 0.1
      };

      const key1 = engine._encodeState(state);
      const key2 = engine._encodeState(state);

      expect(key1).toBe(key2);
    });

    it('should encode different states differently', () => {
      const state1 = {
        phase: 'flop',
        position: 'button',
        handStrength: 0.75,
        potToStackRatio: 0.1
      };

      const state2 = {
        phase: 'turn',
        position: 'button',
        handStrength: 0.75,
        potToStackRatio: 0.1
      };

      const key1 = engine._encodeState(state1);
      const key2 = engine._encodeState(state2);

      expect(key1).not.toBe(key2);
    });

    it('should bucket hand strength', () => {
      const veryStrong = engine._encodeState({ phase: 'flop', position: 'button', handStrength: 0.9, potToStackRatio: 0.1 });
      const veryWeak = engine._encodeState({ phase: 'flop', position: 'button', handStrength: 0.1, potToStackRatio: 0.1 });

      expect(veryStrong).toContain('very-strong');
      expect(veryWeak).toContain('very-weak');
    });
  });

  describe('statistics', () => {
    it('should track learning statistics', () => {
      engine.learn({
        actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.8, pot: 50 } }],
        result: { won: true, profit: 100 }
      });

      const stats = engine.getStats();
      expect(stats.totalHandsLearned).toBe(1);
      expect(stats.totalReward).toBeGreaterThan(0);
      expect(stats.averageReward).toBeGreaterThan(0);
      expect(stats.qTableSize).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset learning state', () => {
      // Learn some hands
      engine.learn({
        actions: [{ type: 'raise', isOurAction: true, state: { phase: 'pre-flop', position: 'button', handStrength: 0.8, pot: 50 } }],
        result: { won: true, profit: 100 }
      });

      engine.reset();

      expect(engine.qTable.size).toBe(0);
      expect(engine.stats.totalHandsLearned).toBe(0);
      expect(engine.currentExplorationRate).toBe(engine.config.explorationRate);

      const patterns = engine.getPatterns();
      expect(patterns.successfulBluffs.length).toBe(0);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      // Setup some learning state
      engine.learn({
        actions: [{
          type: 'raise',
          isOurAction: true,
          state: { phase: 'pre-flop', position: 'button', handStrength: 0.8, pot: 50, potToStackRatio: 0.05 }
        }],
        result: { won: true, profit: 150 }
      });

      engine.learn({
        actions: [{
          type: 'bet',
          isOurAction: true,
          state: { phase: 'flop', position: 'button', handStrength: 0.2, pot: 100, potToStackRatio: 0.1 }
        }],
        result: { won: false, profit: -50 }
      });
    });

    it('should serialize to JSON', () => {
      const json = engine.toJSON();

      expect(json.config).toBeDefined();
      expect(json.qTable).toBeDefined();
      expect(json.patterns).toBeDefined();
      expect(json.strategyParams).toBeDefined();
      expect(json.stats).toBeDefined();
    });

    it('should restore from JSON', () => {
      const json = engine.toJSON();
      const restored = LearningEngine.fromJSON(json);

      expect(restored.qTable.size).toBe(engine.qTable.size);
      expect(restored.stats.totalHandsLearned).toBe(engine.stats.totalHandsLearned);
      expect(restored.currentExplorationRate).toBe(engine.currentExplorationRate);
    });

    it('should preserve Q-values', () => {
      const json = engine.toJSON();
      const restored = LearningEngine.fromJSON(json);

      // Check if Q-values are preserved
      engine.qTable.forEach((actions, stateKey) => {
        const restoredActions = restored.qTable.get(stateKey);
        expect(restoredActions).toBeDefined();

        actions.forEach((value, action) => {
          expect(restoredActions.get(action)).toBe(value);
        });
      });
    });

    it('should preserve patterns', () => {
      const json = engine.toJSON();
      const restored = LearningEngine.fromJSON(json);

      const originalPatterns = engine.getPatterns();
      const restoredPatterns = restored.getPatterns();

      expect(restoredPatterns.successfulBluffs.length).toBe(originalPatterns.successfulBluffs.length);
      expect(restoredPatterns.failedBluffs.length).toBe(originalPatterns.failedBluffs.length);
    });

    it('should preserve strategy parameters', () => {
      const json = engine.toJSON();
      const restored = LearningEngine.fromJSON(json);

      const originalParams = engine.getStrategyParams();
      const restoredParams = restored.getStrategyParams();

      expect(restoredParams.aggressionLevel).toBe(originalParams.aggressionLevel);
      expect(restoredParams.bluffFrequency).toBe(originalParams.bluffFrequency);
    });
  });
});
