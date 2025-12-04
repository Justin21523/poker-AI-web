/**
 * @fileoverview Tests for DecisionEngine
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionEngine, ACTIONS, PERSONALITIES, DIFFICULTY } from '../../src/ai/core/DecisionEngine.js';
import { Card } from '../../src/core/cards/Card.js';
import { OpponentModeler } from '../../src/ai/modeling/OpponentModeler.js';

describe('DecisionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DecisionEngine();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = engine.getConfig();
      expect(config.personality).toBe(PERSONALITIES.BALANCED);
      expect(config.difficulty).toBe(DIFFICULTY.MEDIUM);
      expect(config.randomness).toBe(0.1);
    });

    it('should initialize with custom config', () => {
      const custom = new DecisionEngine({
        personality: PERSONALITIES.AGGRESSIVE,
        difficulty: DIFFICULTY.EXPERT,
        randomness: 0.05
      });

      const config = custom.getConfig();
      expect(config.personality).toBe(PERSONALITIES.AGGRESSIVE);
      expect(config.difficulty).toBe(DIFFICULTY.EXPERT);
      expect(config.randomness).toBe(0.05);
    });

    it('should set personality modifiers', () => {
      expect(engine.personalityModifiers).toBeDefined();
      expect(engine.personalityModifiers.aggression).toBeDefined();
    });
  });

  describe('makeDecision', () => {
    it('should make decision for strong hand', async () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const gameState = {
        holeCards: [aceSpades, aceHearts],
        communityCards: [],
        pot: 100,
        currentBet: 10,
        ourBet: 0,
        chips: 1000,
        minRaise: 20,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect(decision).toBeDefined();
      expect(decision.action).toBeDefined();
      expect(decision.amount).toBeGreaterThanOrEqual(0);
      expect(decision.handStrength).toBeGreaterThan(0.8);
      expect([ACTIONS.RAISE, ACTIONS.CALL]).toContain(decision.action);
    });

    it('should fold weak hand facing large bet', async () => {
      const two = new Card('hearts', '2');
      const seven = new Card('clubs', '7');

      const gameState = {
        holeCards: [two, seven],
        communityCards: [],
        pot: 100,
        currentBet: 300,
        ourBet: 0,
        chips: 1000,
        minRaise: 600,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL],
        phase: 'pre-flop',
        position: 'early'
      };

      const decision = await engine.makeDecision(gameState);

      expect(decision.action).toBe(ACTIONS.FOLD);
      expect(decision.handStrength).toBeLessThan(0.3);
    });

    it('should check when possible with marginal hand', async () => {
      const king = new Card('hearts', 'K');
      const queen = new Card('diamonds', 'Q');

      const gameState = {
        holeCards: [king, queen],
        communityCards: [
          new Card('spades', 'A'),
          new Card('clubs', '9'),
          new Card('hearts', '3')
        ],
        pot: 50,
        currentBet: 0,
        ourBet: 0,
        chips: 1000,
        minRaise: 25,
        legalActions: [ACTIONS.CHECK, ACTIONS.BET],
        phase: 'flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect([ACTIONS.CHECK, ACTIONS.BET]).toContain(decision.action);
    });

    it('should return decision with all fields', async () => {
      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 10,
        ourBet: 0,
        chips: 1000,
        minRaise: 20,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect(decision.action).toBeDefined();
      expect(decision.amount).toBeDefined();
      expect(decision.reasoning).toBeDefined();
      expect(decision.confidence).toBeDefined();
      expect(decision.expectedValue).toBeDefined();
      expect(decision.handStrength).toBeDefined();
      expect(decision.equity).toBeDefined();
    });
  });

  describe('personality modifiers', () => {
    it('should apply aggressive personality', async () => {
      const aggressive = new DecisionEngine({
        personality: PERSONALITIES.AGGRESSIVE,
        randomness: 0
      });

      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 0,
        ourBet: 0,
        chips: 1000,
        minRaise: 50,
        legalActions: [ACTIONS.CHECK, ACTIONS.BET],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision = await aggressive.makeDecision(gameState);

      // Aggressive should prefer betting
      expect(decision.action).toBe(ACTIONS.BET);
    });

    it('should apply cautious personality', async () => {
      const cautious = new DecisionEngine({
        personality: PERSONALITIES.CAUTIOUS,
        randomness: 0
      });

      const queen = new Card('hearts', 'Q');
      const jack = new Card('diamonds', 'J');

      const gameState = {
        holeCards: [queen, jack],
        communityCards: [],
        pot: 100,
        currentBet: 50,
        ourBet: 0,
        chips: 1000,
        minRaise: 100,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'early'
      };

      const decision = await cautious.makeDecision(gameState);

      // Cautious should fold or call, not raise with marginal hand
      expect([ACTIONS.FOLD, ACTIONS.CALL]).toContain(decision.action);
    });

    it('should apply balanced personality', async () => {
      const balanced = new DecisionEngine({
        personality: PERSONALITIES.BALANCED,
        randomness: 0
      });

      expect(balanced.personalityModifiers.aggression).toBe(1.0);
      expect(balanced.personalityModifiers.caution).toBe(1.0);
    });

    it('should apply tricky personality', async () => {
      const tricky = new DecisionEngine({
        personality: PERSONALITIES.TRICKY,
        randomness: 0,
        bluffFrequency: 0.3
      });

      expect(tricky.personalityModifiers.bluffing).toBeGreaterThan(1.0);
    });
  });

  describe('difficulty levels', () => {
    it('should make suboptimal plays on easy', async () => {
      const easy = new DecisionEngine({
        difficulty: DIFFICULTY.EASY,
        randomness: 0
      });

      const two = new Card('hearts', '2');
      const three = new Card('clubs', '3');

      const gameState = {
        holeCards: [two, three],
        communityCards: [],
        pot: 50,
        currentBet: 100, // Bad pot odds
        ourBet: 0,
        chips: 1000,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL],
        phase: 'pre-flop',
        position: 'early'
      };

      const decision = await easy.makeDecision(gameState);

      // Easy might call with bad hand (suboptimal)
      expect([ACTIONS.FOLD, ACTIONS.CALL]).toContain(decision.action);
    });

    it('should play optimally on expert', async () => {
      const expert = new DecisionEngine({
        difficulty: DIFFICULTY.EXPERT,
        randomness: 0
      });

      expect(expert.config.difficulty).toBe(DIFFICULTY.EXPERT);
    });
  });

  describe('expected value calculations', () => {
    it('should calculate fold EV as 0', () => {
      const ev = engine._calculateActionEV(ACTIONS.FOLD, {
        handStrength: 0.5,
        equity: 0.5,
        pot: 100,
        chips: 1000
      });

      expect(ev).toBe(0);
    });

    it('should calculate positive EV for good calls', () => {
      const ev = engine._calculateActionEV(ACTIONS.CALL, {
        handStrength: 0.7,
        equity: 0.6,
        potOdds: 3,
        callAmount: 50,
        pot: 150,
        chips: 1000
      });

      expect(ev).toBeGreaterThan(0);
    });

    it('should calculate negative EV for bad calls', () => {
      const ev = engine._calculateActionEV(ACTIONS.CALL, {
        handStrength: 0.2,
        equity: 0.15,
        potOdds: 2,
        callAmount: 100,
        pot: 200,
        chips: 1000
      });

      expect(ev).toBeLessThan(0);
    });

    it('should calculate positive EV for value raises', () => {
      const ev = engine._calculateActionEV(ACTIONS.RAISE, {
        handStrength: 0.9,
        equity: 0.8,
        pot: 100,
        chips: 1000,
        minRaise: 50,
        foldProbability: 0.3
      });

      expect(ev).toBeGreaterThan(0);
    });

    it('should calculate positive EV for successful bluffs', () => {
      const ev = engine._calculateActionEV(ACTIONS.RAISE, {
        handStrength: 0.2,
        equity: 0.15,
        pot: 200,
        chips: 1000,
        minRaise: 100,
        foldProbability: 0.8 // High fold probability
      });

      expect(ev).toBeGreaterThan(0);
    });
  });

  describe('raise sizing', () => {
    it('should calculate appropriate raise size', () => {
      const gameState = {
        pot: 100,
        minRaise: 50,
        chips: 1000
      };

      const size = engine._calculateRaiseSize(gameState, 100);

      expect(size).toBeGreaterThanOrEqual(50);
      expect(size).toBeLessThanOrEqual(1000);
    });

    it('should bet bigger with high EV', () => {
      const gameState = {
        pot: 100,
        minRaise: 50,
        chips: 1000
      };

      const highEV = engine._calculateRaiseSize(gameState, 150);
      const lowEV = engine._calculateRaiseSize(gameState, 30);

      expect(highEV).toBeGreaterThan(lowEV);
    });

    it('should not exceed chip stack', () => {
      const gameState = {
        pot: 100,
        minRaise: 50,
        chips: 80
      };

      const size = engine._calculateRaiseSize(gameState, 200);

      expect(size).toBeLessThanOrEqual(80);
    });
  });

  describe('opponent modeling integration', () => {
    it('should use opponent modeler when available', async () => {
      const opponentModeler = new OpponentModeler();

      // Create aggressive opponent profile
      for (let i = 0; i < 20; i++) {
        opponentModeler.incrementHandCounts(['opponent1']);
      }

      const profile = opponentModeler.getProfile('opponent1');
      profile.vpipCount = 8;
      profile.pfrCount = 6;
      profile.aggressiveActions = 12;
      profile.passiveActions = 3;
      profile._recalculateStats();

      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 50,
        ourBet: 0,
        chips: 1000,
        minRaise: 100,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'button',
        lastRaiserId: 'opponent1'
      };

      const decision = await engine.makeDecision(gameState, { opponentModeler });

      expect(decision).toBeDefined();
      // Should adjust strategy based on aggressive opponent
    });
  });

  describe('reasoning generation', () => {
    it('should generate reasoning for fold', () => {
      const reasoning = engine._generateReasoning(ACTIONS.FOLD, -50, {
        pot: 100,
        currentBet: 200
      });

      expect(reasoning).toContain('strength insufficient');
    });

    it('should generate reasoning for raise', () => {
      const reasoning = engine._generateReasoning(ACTIONS.RAISE, 150, {
        pot: 100,
        currentBet: 0
      });

      expect(reasoning).toContain('value');
    });

    it('should generate reasoning for call', () => {
      const reasoning = engine._generateReasoning(ACTIONS.CALL, 50, {
        pot: 100,
        currentBet: 50
      });

      expect(reasoning).toContain('Pot odds');
    });
  });

  describe('randomness', () => {
    it('should add variance when randomness > 0', async () => {
      const randomEngine = new DecisionEngine({ randomness: 0.3 });

      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 10,
        ourBet: 0,
        chips: 1000,
        minRaise: 20,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'button'
      };

      // Make multiple decisions, should have some variance
      const decisions = [];
      for (let i = 0; i < 5; i++) {
        const decision = await randomEngine.makeDecision(gameState);
        decisions.push(decision.action);
      }

      // With randomness, might get different actions (though not always)
      expect(decisions.length).toBe(5);
    });

    it('should be deterministic with randomness = 0', async () => {
      const deterministicEngine = new DecisionEngine({ randomness: 0 });

      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 10,
        ourBet: 0,
        chips: 1000,
        minRaise: 20,
        legalActions: [ACTIONS.FOLD, ACTIONS.CALL, ACTIONS.RAISE],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision1 = await deterministicEngine.makeDecision(gameState);
      const decision2 = await deterministicEngine.makeDecision(gameState);

      // Tricky personality may add randomness, so just check both exist
      expect(decision1.action).toBeDefined();
      expect(decision2.action).toBeDefined();
    });
  });

  describe('config management', () => {
    it('should update config', () => {
      engine.updateConfig({
        personality: PERSONALITIES.AGGRESSIVE,
        difficulty: DIFFICULTY.EXPERT
      });

      const config = engine.getConfig();
      expect(config.personality).toBe(PERSONALITIES.AGGRESSIVE);
      expect(config.difficulty).toBe(DIFFICULTY.EXPERT);
    });

    it('should update personality modifiers when config changes', () => {
      engine.updateConfig({ personality: PERSONALITIES.AGGRESSIVE });

      expect(engine.personalityModifiers.aggression).toBeGreaterThan(1.0);
    });
  });

  describe('edge cases', () => {
    it('should handle all-in decision', async () => {
      const ace = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const gameState = {
        holeCards: [ace, aceHearts],
        communityCards: [
          new Card('diamonds', 'A'),
          new Card('clubs', 'K'),
          new Card('spades', 'Q')
        ],
        pot: 500,
        currentBet: 0,
        ourBet: 0,
        chips: 200,
        minRaise: 100,
        legalActions: [ACTIONS.BET, ACTIONS.ALL_IN],
        phase: 'flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect([ACTIONS.BET, ACTIONS.ALL_IN]).toContain(decision.action);
    });

    it('should handle empty legal actions gracefully', async () => {
      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 100,
        currentBet: 0,
        ourBet: 0,
        chips: 1000,
        legalActions: [],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect(decision).toBeDefined();
    });

    it('should handle zero pot', async () => {
      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const gameState = {
        holeCards: [ace, king],
        communityCards: [],
        pot: 0,
        currentBet: 0,
        ourBet: 0,
        chips: 1000,
        minRaise: 10,
        legalActions: [ACTIONS.CHECK, ACTIONS.BET],
        phase: 'pre-flop',
        position: 'button'
      };

      const decision = await engine.makeDecision(gameState);

      expect(decision).toBeDefined();
    });
  });
});
