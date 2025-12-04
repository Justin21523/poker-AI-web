/**
 * @fileoverview Tests for MemorySystem and CircularBuffer
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySystem, MEMORY_TYPES } from '../../src/ai/learning/MemorySystem.js';
import { CircularBuffer } from '../../src/ai/utils/CircularBuffer.js';
import { Card } from '../../src/core/cards/Card.js';

describe('CircularBuffer', () => {
  let buffer;

  beforeEach(() => {
    buffer = new CircularBuffer(5);
  });

  describe('initialization', () => {
    it('should initialize with correct capacity', () => {
      expect(buffer.capacity).toBe(5);
      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('should throw error for non-positive capacity', () => {
      expect(() => new CircularBuffer(0)).toThrow();
      expect(() => new CircularBuffer(-5)).toThrow();
    });
  });

  describe('push and retrieval', () => {
    it('should push items', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.getSize()).toBe(3);
      expect(buffer.isEmpty()).toBe(false);
      expect(buffer.isFull()).toBe(false);
    });

    it('should retrieve all items in order', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      const all = buffer.getAll();
      expect(all).toEqual(['a', 'b', 'c']);
    });

    it('should overwrite oldest when full', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');
      buffer.push('d');
      buffer.push('e');

      expect(buffer.isFull()).toBe(true);

      buffer.push('f'); // Overwrites 'a'
      buffer.push('g'); // Overwrites 'b'

      const all = buffer.getAll();
      expect(all).toEqual(['c', 'd', 'e', 'f', 'g']);
      expect(buffer.getSize()).toBe(5);
    });

    it('should get last N items', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');
      buffer.push('d');
      buffer.push('e');

      expect(buffer.getLast(3)).toEqual(['c', 'd', 'e']);
      expect(buffer.getLast(10)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should get first N items', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.getFirst(2)).toEqual(['a', 'b']);
    });

    it('should get item by index', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.get(0)).toBe('a');
      expect(buffer.get(1)).toBe('b');
      expect(buffer.get(2)).toBe('c');
      expect(buffer.get(10)).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      buffer.push({ type: 'action', value: 1 });
      buffer.push({ type: 'decision', value: 2 });
      buffer.push({ type: 'action', value: 3 });
    });

    it('should filter items', () => {
      const actions = buffer.filter(item => item.type === 'action');
      expect(actions.length).toBe(2);
      expect(actions[0].value).toBe(1);
      expect(actions[1].value).toBe(3);
    });

    it('should map items', () => {
      const values = buffer.map(item => item.value);
      expect(values).toEqual([1, 2, 3]);
    });

    it('should find items', () => {
      const decision = buffer.find(item => item.type === 'decision');
      expect(decision.value).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.clear();

      expect(buffer.getSize()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      buffer.push('a');
      buffer.push('b');

      const json = buffer.toJSON();
      expect(json.capacity).toBe(5);
      expect(json.items).toEqual(['a', 'b']);
    });

    it('should restore from JSON', () => {
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      const json = buffer.toJSON();
      const restored = CircularBuffer.fromJSON(json);

      expect(restored.getSize()).toBe(3);
      expect(restored.getAll()).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('MemorySystem', () => {
  let memory;

  beforeEach(() => {
    memory = new MemorySystem({ workingMemorySize: 10 });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(memory.config.workingMemorySize).toBe(10);
      expect(memory.shortTerm.currentHand).toBeNull();
      expect(memory.longTerm.opponentProfiles.size).toBe(0);
      expect(memory.workingMemory).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const custom = new MemorySystem({
        workingMemorySize: 50,
        maxLongTermMemories: 500
      });

      expect(custom.config.workingMemorySize).toBe(50);
      expect(custom.config.maxLongTermMemories).toBe(500);
    });
  });

  describe('short-term memory', () => {
    it('should start new hand', () => {
      const aceSpades = new Card('spades', 'A');
      const kingSpades = new Card('spades', 'K');

      memory.startHand({
        handId: 'hand-1',
        holeCards: [aceSpades, kingSpades],
        position: 'button',
        stackSize: 1000
      });

      const hand = memory.getCurrentHand();
      expect(hand).not.toBeNull();
      expect(hand.handId).toBe('hand-1');
      expect(hand.holeCards.length).toBe(2);
      expect(hand.position).toBe('button');
      expect(hand.stackSize).toBe(1000);
    });

    it('should record actions', () => {
      memory.startHand({
        handId: 'hand-1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.recordAction({
        playerId: 'player1',
        type: 'raise',
        amount: 100,
        phase: 'pre-flop',
        isOurAction: true
      });

      const actions = memory.getObservedActions();
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('raise');
    });

    it('should update community cards', () => {
      memory.startHand({
        handId: 'hand-1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      const flop = [
        new Card('hearts', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J')
      ];

      memory.updateCommunityCards(flop);
      expect(memory.shortTerm.communityCards.length).toBe(3);
    });

    it('should update phase', () => {
      memory.startHand({
        handId: 'hand-1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.updatePhase('flop');
      expect(memory.shortTerm.phase).toBe('flop');
    });

    it('should update pot', () => {
      memory.startHand({
        handId: 'hand-1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.updatePot(50);
      memory.updatePot(100);

      expect(memory.shortTerm.potHistory).toContain(50);
      expect(memory.shortTerm.potHistory).toContain(100);
    });

    it('should end hand and move to working memory', () => {
      memory.startHand({
        handId: 'hand-1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.recordAction({
        playerId: 'ai',
        type: 'raise',
        amount: 100,
        phase: 'pre-flop',
        isOurAction: true
      });

      memory.endHand({
        won: true,
        profit: 200,
        handType: 'pair'
      });

      expect(memory.getCurrentHand()).toBeNull();
      expect(memory.workingMemory.getSize()).toBe(1);

      const recentHands = memory.getRecentHands(1);
      expect(recentHands.length).toBe(1);
      expect(recentHands[0].result.won).toBe(true);
      expect(recentHands[0].result.profit).toBe(200);
    });
  });

  describe('working memory', () => {
    it('should record decisions', () => {
      memory.recordDecision({
        situation: 'pre-flop-raised',
        action: 'call',
        expectedValue: 50,
        reasoning: 'pot odds favorable'
      });

      const decisions = memory.getRecentDecisions(10);
      expect(decisions.length).toBe(1);
      expect(decisions[0].action).toBe('call');
    });

    it('should query working memory', () => {
      memory.recordDecision({ situation: 'pre-flop', action: 'raise' });
      memory.recordDecision({ situation: 'flop', action: 'call' });
      memory.recordDecision({ situation: 'turn', action: 'fold' });

      const foldDecisions = memory.queryWorkingMemory(
        entry => entry.type === 'decision' && entry.action === 'fold'
      );

      expect(foldDecisions.length).toBe(1);
      expect(foldDecisions[0].situation).toBe('turn');
    });

    it('should retrieve recent hands', () => {
      // Play 3 hands
      for (let i = 0; i < 3; i++) {
        memory.startHand({
          handId: `hand-${i}`,
          holeCards: [],
          position: 'button',
          stackSize: 1000
        });

        memory.endHand({
          won: i % 2 === 0,
          profit: i * 100,
          handType: 'pair'
        });
      }

      const recentHands = memory.getRecentHands(2);
      expect(recentHands.length).toBe(2);
      expect(recentHands[1].hand.handId).toBe('hand-2');
    });
  });

  describe('long-term memory', () => {
    it('should store opponent profiles', () => {
      const profile = {
        vpip: 0.25,
        pfr: 0.20,
        aggression: 2.5
      };

      memory.storeOpponentProfile('player1', profile);

      const retrieved = memory.getOpponentProfile('player1');
      expect(retrieved).toBeDefined();
      expect(retrieved.vpip).toBe(0.25);
    });

    it('should get all opponent profiles', () => {
      memory.storeOpponentProfile('player1', { vpip: 0.25 });
      memory.storeOpponentProfile('player2', { vpip: 0.30 });

      const all = memory.getAllOpponentProfiles();
      expect(all.size).toBe(2);
    });

    it('should record strategy adjustments', () => {
      memory.recordStrategyAdjustment({
        type: 'aggression-increase',
        reason: 'opponents too passive',
        parameters: { aggressionFactor: 2.5 }
      });

      const adjustments = memory.getStrategyAdjustments(10);
      expect(adjustments.length).toBe(1);
      expect(adjustments[0].type).toBe('aggression-increase');
    });

    it('should limit strategy adjustments to 100', () => {
      for (let i = 0; i < 150; i++) {
        memory.recordStrategyAdjustment({
          type: 'test',
          reason: 'test',
          parameters: {}
        });
      }

      expect(memory.longTerm.strategyAdjustments.length).toBe(100);
    });

    it('should record successful strategies', () => {
      memory.recordSuccessfulStrategy({
        situation: 'button-pre-flop',
        action: 'raise',
        result: 100
      });

      expect(memory.longTerm.successfulStrategies.length).toBe(1);
    });

    it('should aggregate duplicate successful strategies', () => {
      memory.recordSuccessfulStrategy({
        situation: 'button-pre-flop',
        action: 'raise',
        result: 100
      });

      memory.recordSuccessfulStrategy({
        situation: 'button-pre-flop',
        action: 'raise',
        result: 150
      });

      expect(memory.longTerm.successfulStrategies.length).toBe(1);
      expect(memory.longTerm.successfulStrategies[0].successCount).toBe(2);
    });

    it('should get performance metrics', () => {
      // Play some hands
      memory.startHand({ handId: 'h1', holeCards: [], position: 'button', stackSize: 1000 });
      memory.endHand({ won: true, profit: 100 });

      memory.startHand({ handId: 'h2', holeCards: [], position: 'button', stackSize: 1000 });
      memory.endHand({ won: false, profit: -50 });

      const metrics = memory.getPerformanceMetrics();
      expect(metrics.handsPlayed).toBe(2);
      expect(metrics.handsWon).toBe(1);
      expect(metrics.totalProfit).toBe(50);
      expect(metrics.winRate).toBe(0.5);
    });
  });

  describe('memory consolidation', () => {
    it('should consolidate important memories', () => {
      // Play a winning hand
      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.recordAction({
        playerId: 'ai',
        type: 'raise',
        amount: 100,
        phase: 'pre-flop',
        isOurAction: true
      });

      memory.endHand({
        won: true,
        profit: 200,
        handType: 'flush'
      });

      memory.consolidateMemories(0.5);

      expect(memory.longTerm.successfulStrategies.length).toBeGreaterThan(0);
    });
  });

  describe('memory importance', () => {
    it('should assign higher importance to big wins', () => {
      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.endHand({
        won: true,
        profit: 500, // Big win
        handType: 'pair'
      });

      const hands = memory.getRecentHands(1);
      expect(hands[0].importance).toBeGreaterThan(0.5);
    });

    it('should assign higher importance to showdowns', () => {
      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.endHand({
        won: true,
        profit: 100,
        handType: 'pair',
        showdown: true
      });

      const hands = memory.getRecentHands(1);
      expect(hands[0].importance).toBeGreaterThan(0.5);
    });

    it('should assign higher importance to rare hands', () => {
      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.endHand({
        won: true,
        profit: 100,
        handType: 'full-house'
      });

      const hands = memory.getRecentHands(1);
      expect(hands[0].importance).toBeGreaterThan(0.5);
    });
  });

  describe('clear', () => {
    it('should clear all memory', () => {
      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      memory.storeOpponentProfile('player1', { vpip: 0.25 });
      memory.recordDecision({ situation: 'test', action: 'raise' });

      memory.clear();

      expect(memory.getCurrentHand()).toBeNull();
      expect(memory.longTerm.opponentProfiles.size).toBe(0);
      expect(memory.workingMemory.isEmpty()).toBe(true);
      expect(memory.longTerm.performanceMetrics.handsPlayed).toBe(0);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      // Setup some memory state
      memory.storeOpponentProfile('player1', { vpip: 0.25, pfr: 0.20 });
      memory.recordStrategyAdjustment({ type: 'test', reason: 'test', parameters: {} });

      memory.startHand({
        handId: 'h1',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });
      memory.endHand({ won: true, profit: 100 });
    });

    it('should serialize to JSON', () => {
      const json = memory.toJSON();

      expect(json.config).toBeDefined();
      expect(json.longTerm).toBeDefined();
      expect(json.workingMemory).toBeDefined();
      expect(json.totalMemories).toBeGreaterThan(0);
    });

    it('should not serialize current hand in short-term', () => {
      memory.startHand({
        handId: 'active',
        holeCards: [],
        position: 'button',
        stackSize: 1000
      });

      const json = memory.toJSON();
      expect(json.shortTerm.currentHand).toBeNull();
    });

    it('should restore from JSON', () => {
      const json = memory.toJSON();
      const restored = MemorySystem.fromJSON(json);

      expect(restored.config.workingMemorySize).toBe(memory.config.workingMemorySize);
      expect(restored.longTerm.opponentProfiles.size).toBe(1);
      expect(restored.workingMemory.getSize()).toBe(memory.workingMemory.getSize());
      expect(restored.totalMemories).toBe(memory.totalMemories);
    });

    it('should preserve performance metrics', () => {
      const json = memory.toJSON();
      const restored = MemorySystem.fromJSON(json);

      const originalMetrics = memory.getPerformanceMetrics();
      const restoredMetrics = restored.getPerformanceMetrics();

      expect(restoredMetrics.handsPlayed).toBe(originalMetrics.handsPlayed);
      expect(restoredMetrics.totalProfit).toBe(originalMetrics.totalProfit);
    });

    it('should preserve strategy adjustments', () => {
      const json = memory.toJSON();
      const restored = MemorySystem.fromJSON(json);

      const originalAdj = memory.getStrategyAdjustments(10);
      const restoredAdj = restored.getStrategyAdjustments(10);

      expect(restoredAdj.length).toBe(originalAdj.length);
    });
  });
});
