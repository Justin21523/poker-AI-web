/**
 * @fileoverview Tests for OpponentModeler and OpponentProfile
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpponentProfile,
  OpponentModeler,
  PLAYER_TYPES,
  POSITIONS
} from '../../src/ai/modeling/OpponentModeler.js';

describe('OpponentProfile', () => {
  let profile;

  beforeEach(() => {
    profile = new OpponentProfile('player1');
  });

  describe('initialization', () => {
    it('should initialize with correct player ID', () => {
      expect(profile.playerId).toBe('player1');
    });

    it('should initialize with zero statistics', () => {
      expect(profile.stats.vpip).toBe(0);
      expect(profile.stats.pfr).toBe(0);
      expect(profile.stats.aggression).toBe(0);
      expect(profile.handCount).toBe(0);
    });

    it('should initialize with unknown player type', () => {
      expect(profile.playerType).toBe(PLAYER_TYPES.UNKNOWN);
    });

    it('should initialize with zero confidence', () => {
      expect(profile.confidence).toBe(0);
    });

    it('should have timestamps', () => {
      expect(profile.createdAt).toBeGreaterThan(0);
      expect(profile.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('updateFromAction', () => {
    it('should track VPIP from pre-flop call', () => {
      profile.incrementHandCount();
      profile.updateFromAction({
        type: 'call',
        isPreflop: true,
        phase: 'pre-flop',
        facingBet: true
      });

      expect(profile.vpipCount).toBe(1);
      expect(profile.stats.vpip).toBe(1);
    });

    it('should track VPIP from pre-flop raise', () => {
      profile.incrementHandCount();
      profile.updateFromAction({
        type: 'raise',
        isPreflop: true,
        phase: 'pre-flop',
        amount: 100
      });

      expect(profile.vpipCount).toBe(1);
      expect(profile.pfrCount).toBe(1);
      expect(profile.stats.vpip).toBe(1);
      expect(profile.stats.pfr).toBe(1);
    });

    it('should not track VPIP for pre-flop fold', () => {
      profile.incrementHandCount();
      profile.updateFromAction({
        type: 'fold',
        isPreflop: true,
        phase: 'pre-flop'
      });

      expect(profile.vpipCount).toBe(0);
      expect(profile.stats.vpip).toBe(0);
    });

    it('should track aggression from bets and raises', () => {
      profile.incrementHandCount();

      // 2 aggressive actions, 1 passive
      profile.updateFromAction({ type: 'raise', phase: 'flop' });
      profile.updateFromAction({ type: 'bet', phase: 'turn' });
      profile.updateFromAction({ type: 'call', phase: 'river' });

      expect(profile.aggressiveActions).toBe(2);
      expect(profile.passiveActions).toBe(1);
      expect(profile.stats.aggression).toBe(2);
    });

    it('should track 3-bet frequency', () => {
      profile.incrementHandCount();

      profile.updateFromAction({
        type: 'raise',
        isThreeBet: true,
        phase: 'pre-flop'
      });

      profile.updateFromAction({
        type: 'fold',
        isThreeBet: true,
        phase: 'pre-flop'
      });

      expect(profile.threeBetCount).toBe(1);
      expect(profile.threeBetOpportunities).toBe(2);
      expect(profile.stats.threebet).toBe(0.5);
    });

    it('should track continuation bet frequency', () => {
      profile.incrementHandCount();

      profile.updateFromAction({
        type: 'bet',
        isContinuation: true,
        phase: 'flop'
      });

      profile.updateFromAction({
        type: 'check',
        isContinuation: true,
        phase: 'flop'
      });

      expect(profile.cBetCount).toBe(1);
      expect(profile.cBetOpportunities).toBe(2);
      expect(profile.stats.continuation).toBe(0.5);
    });

    it('should track fold to c-bet', () => {
      profile.incrementHandCount();

      profile.updateFromAction({
        type: 'fold',
        facingBet: true,
        phase: 'flop'
      });

      profile.updateFromAction({
        type: 'call',
        facingBet: true,
        phase: 'turn'
      });

      expect(profile.cBetFoldCount).toBe(1);
      expect(profile.cBetFaceCount).toBe(2);
      expect(profile.stats.foldToCBet).toBe(0.5);
    });

    it('should update position statistics', () => {
      profile.incrementHandCount();

      profile.updateFromAction({
        type: 'raise',
        isPreflop: true,
        position: POSITIONS.LATE,
        phase: 'pre-flop'
      });

      const lateStats = profile.positionStats[POSITIONS.LATE];
      expect(lateStats.handsPlayed).toBe(1);
      expect(lateStats.vpip).toBeGreaterThan(0);
      expect(lateStats.pfr).toBeGreaterThan(0);
    });
  });

  describe('recordShowdown', () => {
    it('should track showdown wins', () => {
      profile.recordShowdown({
        won: true,
        cards: [],
        handType: 'pair'
      });

      expect(profile.showdownCount).toBe(1);
      expect(profile.showdownWins).toBe(1);
      expect(profile.stats.wsd).toBe(1);
    });

    it('should track showdown losses', () => {
      profile.recordShowdown({
        won: false,
        cards: [],
        handType: 'high-card'
      });

      expect(profile.showdownCount).toBe(1);
      expect(profile.showdownWins).toBe(0);
      expect(profile.stats.wsd).toBe(0);
    });

    it('should track bluff frequency', () => {
      profile.recordShowdown({
        won: false,
        wasBluff: true,
        handType: 'high-card'
      });

      profile.recordShowdown({
        won: true,
        wasBluff: false,
        handType: 'flush'
      });

      expect(profile.patterns.bluffFrequency).toBe(0.5);
    });

    it('should track slow-play frequency', () => {
      profile.recordShowdown({
        won: true,
        wasSlowPlay: true,
        handType: 'full-house'
      });

      expect(profile.patterns.slowPlayFrequency).toBe(1);
    });
  });

  describe('classifyPlayerType', () => {
    it('should return UNKNOWN with insufficient data', () => {
      for (let i = 0; i < 5; i++) {
        profile.incrementHandCount();
      }

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.UNKNOWN);
    });

    it('should classify TAG (tight-aggressive)', () => {
      // Play 20 hands
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }

      // VPIP 20% (4/20), PFR 15% (3/20), high aggression
      profile.vpipCount = 4;
      profile.pfrCount = 3;
      profile.aggressiveActions = 8;
      profile.passiveActions = 2;
      profile._recalculateStats();

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.TAG);
    });

    it('should classify LAG (loose-aggressive)', () => {
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }

      // VPIP 40% (8/20), high aggression
      profile.vpipCount = 8;
      profile.pfrCount = 6;
      profile.aggressiveActions = 12;
      profile.passiveActions = 3;
      profile._recalculateStats();

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.LAG);
    });

    it('should classify TP (tight-passive)', () => {
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }

      // VPIP 20% (4/20), low aggression
      profile.vpipCount = 4;
      profile.pfrCount = 1;
      profile.aggressiveActions = 3;
      profile.passiveActions = 8;
      profile._recalculateStats();

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.TP);
    });

    it('should classify LP (loose-passive)', () => {
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }

      // VPIP 40% (8/20), low aggression
      profile.vpipCount = 8;
      profile.pfrCount = 2;
      profile.aggressiveActions = 4;
      profile.passiveActions = 10;
      profile._recalculateStats();

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.LP);
    });

    it('should classify BALANCED', () => {
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }

      // VPIP 28% (5.6/20), moderate aggression
      profile.vpipCount = 6;
      profile.pfrCount = 4;
      profile.aggressiveActions = 6;
      profile.passiveActions = 4;
      profile._recalculateStats();

      expect(profile.classifyPlayerType()).toBe(PLAYER_TYPES.BALANCED);
    });
  });

  describe('predictAction', () => {
    beforeEach(() => {
      // Add enough hands for prediction
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }
      profile.vpipCount = 4;
      profile.pfrCount = 3;
      profile.aggressiveActions = 8;
      profile.passiveActions = 2;
      profile._recalculateStats();
    });

    it('should return prediction with probabilities', () => {
      const prediction = profile.predictAction({
        phase: 'flop',
        position: POSITIONS.LATE,
        facingBet: false
      });

      expect(prediction).toHaveProperty('fold');
      expect(prediction).toHaveProperty('call');
      expect(prediction).toHaveProperty('raise');
      expect(prediction).toHaveProperty('confidence');

      // Probabilities should sum to ~1.0
      const sum = prediction.fold + prediction.call + prediction.raise;
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('should predict TAG player tends to raise', () => {
      profile.playerType = PLAYER_TYPES.TAG;

      const prediction = profile.predictAction({
        phase: 'flop',
        position: POSITIONS.LATE,
        facingBet: false
      });

      // TAG should have high raise probability when not facing bet
      expect(prediction.raise).toBeGreaterThan(0.4);
    });

    it('should predict LAG player is aggressive', () => {
      profile.playerType = PLAYER_TYPES.LAG;

      const prediction = profile.predictAction({
        phase: 'flop',
        position: POSITIONS.LATE,
        facingBet: true
      });

      // LAG should have high raise probability even facing bet
      expect(prediction.raise).toBeGreaterThan(0.3);
      expect(prediction.fold).toBeLessThan(0.4);
    });

    it('should predict LP player calls often', () => {
      profile.playerType = PLAYER_TYPES.LP;

      const prediction = profile.predictAction({
        phase: 'flop',
        position: POSITIONS.LATE,
        facingBet: true
      });

      // LP should have high call probability
      expect(prediction.call).toBeGreaterThan(0.4);
    });

    it('should adjust for bet size', () => {
      profile.playerType = PLAYER_TYPES.BALANCED;

      const smallBet = profile.predictAction({
        phase: 'flop',
        facingBet: true,
        betSize: 0.5
      });

      const largeBet = profile.predictAction({
        phase: 'flop',
        facingBet: true,
        betSize: 3
      });

      // Large bet should increase fold probability
      expect(largeBet.fold).toBeGreaterThan(smallBet.fold);
    });

    it('should adjust for position', () => {
      profile.playerType = PLAYER_TYPES.BALANCED;

      const earlyPos = profile.predictAction({
        phase: 'pre-flop',
        position: POSITIONS.EARLY,
        facingBet: false
      });

      const latePos = profile.predictAction({
        phase: 'pre-flop',
        position: POSITIONS.LATE,
        facingBet: false
      });

      // Late position should increase raise probability
      expect(latePos.raise).toBeGreaterThan(earlyPos.raise);
    });

    it('should return low confidence with insufficient data', () => {
      const newProfile = new OpponentProfile('player2');
      newProfile.incrementHandCount();

      const prediction = newProfile.predictAction({
        phase: 'flop',
        position: POSITIONS.LATE
      });

      expect(prediction.confidence).toBeLessThan(0.2);
    });
  });

  describe('calculateFoldProbability', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        profile.incrementHandCount();
      }
      profile.cBetFoldCount = 10;
      profile.cBetFaceCount = 20;
      profile._recalculateStats();
    });

    it('should calculate base fold probability', () => {
      const foldProb = profile.calculateFoldProbability(1);

      expect(foldProb).toBeGreaterThan(0);
      expect(foldProb).toBeLessThan(1);
    });

    it('should increase with bet size', () => {
      const smallBet = profile.calculateFoldProbability(1);
      const largeBet = profile.calculateFoldProbability(3);

      expect(largeBet).toBeGreaterThan(smallBet);
    });

    it('should adjust for tight-passive players', () => {
      profile.playerType = PLAYER_TYPES.TP;
      const foldProb = profile.calculateFoldProbability(1);

      // TP should fold more
      expect(foldProb).toBeGreaterThan(0.6);
    });

    it('should adjust for loose-passive players', () => {
      profile.playerType = PLAYER_TYPES.LP;
      const foldProb = profile.calculateFoldProbability(1);

      // LP should fold less
      expect(foldProb).toBeLessThan(0.5);
    });
  });

  describe('confidence calculation', () => {
    it('should increase confidence with more hands', () => {
      const confidences = [];

      [10, 30, 50, 100, 200].forEach(handCount => {
        const p = new OpponentProfile('test');
        for (let i = 0; i < handCount; i++) {
          p.incrementHandCount();
        }
        confidences.push(p.confidence);
      });

      // Confidence should increase
      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i]).toBeGreaterThan(confidences[i - 1]);
      }
    });

    it('should cap confidence at 0.95', () => {
      for (let i = 0; i < 500; i++) {
        profile.incrementHandCount();
      }

      expect(profile.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      profile.incrementHandCount();
      profile.updateFromAction({
        type: 'raise',
        isPreflop: true,
        phase: 'pre-flop'
      });

      const json = profile.toJSON();

      expect(json.playerId).toBe('player1');
      expect(json.stats).toBeDefined();
      expect(json.handCount).toBe(1);
      expect(json.playerType).toBeDefined();
    });

    it('should restore from JSON', () => {
      profile.incrementHandCount();
      profile.vpipCount = 1;
      profile._recalculateStats();

      const json = profile.toJSON();
      const restored = OpponentProfile.fromJSON(json);

      expect(restored.playerId).toBe(profile.playerId);
      expect(restored.handCount).toBe(profile.handCount);
      expect(restored.stats.vpip).toBe(profile.stats.vpip);
    });
  });
});

describe('OpponentModeler', () => {
  let modeler;

  beforeEach(() => {
    modeler = new OpponentModeler();
  });

  describe('profile management', () => {
    it('should create new profile for unknown player', () => {
      const profile = modeler.getProfile('player1');

      expect(profile).toBeDefined();
      expect(profile.playerId).toBe('player1');
    });

    it('should return existing profile', () => {
      const profile1 = modeler.getProfile('player1');
      const profile2 = modeler.getProfile('player1');

      expect(profile1).toBe(profile2);
    });

    it('should track multiple players', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');
      modeler.getProfile('player3');

      expect(modeler.profiles.size).toBe(3);
    });

    it('should remove specific profile', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');

      modeler.removeProfile('player1');

      expect(modeler.profiles.size).toBe(1);
      expect(modeler.profiles.has('player1')).toBe(false);
    });

    it('should clear all profiles', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');

      modeler.clear();

      expect(modeler.profiles.size).toBe(0);
    });
  });

  describe('action updates', () => {
    it('should update profile from action', () => {
      modeler.updateFromAction('player1', {
        type: 'raise',
        isPreflop: true,
        phase: 'pre-flop'
      });

      const profile = modeler.getProfile('player1');
      expect(profile.actionsObserved).toBe(1);
    });

    it('should record showdown', () => {
      modeler.recordShowdown('player1', {
        won: true,
        cards: []
      });

      const profile = modeler.getProfile('player1');
      expect(profile.showdownCount).toBe(1);
    });

    it('should increment hand counts for all players', () => {
      const playerIds = ['player1', 'player2', 'player3'];
      modeler.incrementHandCounts(playerIds);

      playerIds.forEach(id => {
        const profile = modeler.getProfile(id);
        expect(profile.handCount).toBe(1);
      });
    });
  });

  describe('player analysis', () => {
    beforeEach(() => {
      // Setup player with enough data
      const playerIds = ['player1'];
      for (let i = 0; i < 20; i++) {
        modeler.incrementHandCounts(playerIds);
      }

      // Make player TAG
      const profile = modeler.getProfile('player1');
      profile.vpipCount = 4;
      profile.pfrCount = 3;
      profile.aggressiveActions = 8;
      profile.passiveActions = 2;
      profile._recalculateStats();
    });

    it('should get player type', () => {
      const playerType = modeler.getPlayerType('player1');
      expect(playerType).toBe(PLAYER_TYPES.TAG);
    });

    it('should predict action', () => {
      const prediction = modeler.predictAction('player1', {
        phase: 'flop',
        position: POSITIONS.LATE,
        facingBet: false
      });

      expect(prediction).toHaveProperty('fold');
      expect(prediction).toHaveProperty('call');
      expect(prediction).toHaveProperty('raise');
    });

    it('should calculate fold probability', () => {
      const foldProb = modeler.calculateFoldProbability('player1', 2);

      expect(foldProb).toBeGreaterThan(0);
      expect(foldProb).toBeLessThan(1);
    });
  });

  describe('bulk operations', () => {
    it('should get all profiles', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');

      const allProfiles = modeler.getAllProfiles();

      expect(allProfiles.size).toBe(2);
      expect(allProfiles.has('player1')).toBe(true);
      expect(allProfiles.has('player2')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');

      const json = modeler.toJSON();

      expect(json.profiles).toBeDefined();
      expect(json.profiles.length).toBe(2);
      expect(json.timestamp).toBeDefined();
    });

    it('should restore from JSON', () => {
      modeler.getProfile('player1');
      modeler.getProfile('player2');

      const json = modeler.toJSON();
      const restored = OpponentModeler.fromJSON(json);

      expect(restored.profiles.size).toBe(2);
      expect(restored.profiles.has('player1')).toBe(true);
      expect(restored.profiles.has('player2')).toBe(true);
    });

    it('should preserve profile data when serializing', () => {
      modeler.incrementHandCounts(['player1']);
      modeler.updateFromAction('player1', {
        type: 'raise',
        isPreflop: true,
        phase: 'pre-flop'
      });

      const json = modeler.toJSON();
      const restored = OpponentModeler.fromJSON(json);

      const originalProfile = modeler.getProfile('player1');
      const restoredProfile = restored.getProfile('player1');

      expect(restoredProfile.handCount).toBe(originalProfile.handCount);
      expect(restoredProfile.actionsObserved).toBe(originalProfile.actionsObserved);
    });
  });
});
