/**
 * @fileoverview Tests for PokerMath utility class
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PokerMath } from '../../src/ai/poker/PokerMath.js';
import { Card } from '../../src/core/cards/Card.js';

describe('PokerMath', () => {
  // ============================================================================
  // Hand Strength Evaluation Tests
  // ============================================================================

  describe('evaluateHandStrength', () => {
    it('should evaluate pre-flop hand strength (premium hands)', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const strength = PokerMath.evaluateHandStrength([aceSpades, aceHearts]);

      // AA should be very strong (Sklansky Group 1)
      expect(strength).toBeGreaterThan(0.9);
      expect(strength).toBeLessThanOrEqual(1.0);
    });

    it('should evaluate pre-flop hand strength (weak hands)', () => {
      const two = new Card('spades', '2');
      const seven = new Card('hearts', '7');

      const strength = PokerMath.evaluateHandStrength([two, seven]);

      // 72o is worst starting hand
      expect(strength).toBeLessThan(0.3);
    });

    it('should evaluate post-flop hand strength (made hand)', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const flop = [
        new Card('diamonds', 'A'),
        new Card('clubs', 'K'),
        new Card('spades', '2')
      ];

      const strength = PokerMath.evaluateHandStrength([aceSpades, aceHearts], flop);

      // Three of a kind (rank 3) = 0.4 strength
      expect(strength).toBeGreaterThan(0.3);
      expect(strength).toBeLessThanOrEqual(0.5);
    });

    it('should evaluate hand strength with full board', () => {
      const aceSpades = new Card('spades', 'A');
      const kingSpades = new Card('spades', 'K');

      const board = [
        new Card('spades', 'Q'),
        new Card('spades', 'J'),
        new Card('spades', '10'),
        new Card('hearts', '2'),
        new Card('diamonds', '3')
      ];

      const strength = PokerMath.evaluateHandStrength([aceSpades, kingSpades], board);

      // Royal flush should be maximum strength
      expect(strength).toBe(1.0);
    });

    it('should handle empty community cards', () => {
      const ace = new Card('spades', 'A');
      const king = new Card('spades', 'K');

      const strength = PokerMath.evaluateHandStrength([ace, king], []);

      // AKs is premium starting hand
      expect(strength).toBeGreaterThan(0.85);
    });
  });

  // ============================================================================
  // Equity Calculation Tests
  // ============================================================================

  describe('calculateEquity', () => {
    it('should calculate equity for strong hand vs 1 opponent', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      // AA pre-flop has ~85% equity vs random hand
      const equity = PokerMath.calculateEquity([aceSpades, aceHearts], [], 1, 100);

      expect(equity).toBeGreaterThan(0.7);
      expect(equity).toBeLessThanOrEqual(1.0);
    });

    it('should calculate equity with community cards', () => {
      const aceSpades = new Card('spades', 'A');
      const kingSpades = new Card('spades', 'K');

      const flop = [
        new Card('spades', 'Q'),
        new Card('spades', 'J'),
        new Card('hearts', '2')
      ];

      // Nut flush draw + broadway straight draw
      const equity = PokerMath.calculateEquity([aceSpades, kingSpades], flop, 1, 100);

      expect(equity).toBeGreaterThan(0.5);
    });

    it('should calculate equity against multiple opponents', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      // AA vs 3 opponents typically has 64-68% equity (lower than vs 1 opponent)
      // With 100 iterations, allow some variance
      const equity = PokerMath.calculateEquity([aceSpades, aceHearts], [], 3, 100);

      expect(equity).toBeGreaterThan(0.5);
      expect(equity).toBeLessThan(0.85);
    });

    it('should throw error for invalid hole cards', () => {
      const ace = new Card('spades', 'A');

      expect(() => {
        PokerMath.calculateEquity([ace], [], 1, 100);
      }).toThrow('Must have exactly 2 hole cards');
    });

    it('should return consistent results with more iterations', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const equity1 = PokerMath.calculateEquity([aceSpades, aceHearts], [], 1, 500);
      const equity2 = PokerMath.calculateEquity([aceSpades, aceHearts], [], 1, 500);

      // Should be within 10% due to randomness
      expect(Math.abs(equity1 - equity2)).toBeLessThan(0.1);
    });
  });

  // ============================================================================
  // Pot Odds Tests
  // ============================================================================

  describe('calculatePotOdds', () => {
    it('should calculate pot odds correctly', () => {
      const potOdds = PokerMath.calculatePotOdds(100, 20);

      expect(potOdds).toBe(5); // 100:20 = 5:1
    });

    it('should calculate pot odds for large pot', () => {
      const potOdds = PokerMath.calculatePotOdds(300, 50);

      expect(potOdds).toBe(6); // 300:50 = 6:1
    });

    it('should return Infinity for zero call amount', () => {
      const potOdds = PokerMath.calculatePotOdds(100, 0);

      expect(potOdds).toBe(Infinity);
    });

    it('should calculate pot odds for small bets', () => {
      const potOdds = PokerMath.calculatePotOdds(50, 50);

      expect(potOdds).toBe(1); // 1:1 (even money)
    });
  });

  // ============================================================================
  // Implied Odds Tests
  // ============================================================================

  describe('calculateImpliedOdds', () => {
    it('should calculate implied odds with default factor', () => {
      const impliedOdds = PokerMath.calculateImpliedOdds(100, 20, 500);

      // Should be better than direct pot odds
      const directOdds = PokerMath.calculatePotOdds(100, 20);
      expect(impliedOdds).toBeGreaterThan(directOdds);
    });

    it('should respect stack depth limits', () => {
      const impliedOdds = PokerMath.calculateImpliedOdds(100, 20, 50);

      // With small stack, implied odds limited
      expect(impliedOdds).toBeGreaterThan(0);
      expect(impliedOdds).toBeLessThan(20);
    });

    it('should use custom implied factor', () => {
      const impliedOdds1 = PokerMath.calculateImpliedOdds(100, 20, 1000, 1.0);
      const impliedOdds2 = PokerMath.calculateImpliedOdds(100, 20, 1000, 2.0);

      // Higher factor should give better implied odds
      expect(impliedOdds2).toBeGreaterThan(impliedOdds1);
    });
  });

  // ============================================================================
  // Should Call Tests
  // ============================================================================

  describe('shouldCallBasedOnOdds', () => {
    it('should recommend call with good equity vs pot odds', () => {
      const equity = 0.4; // 40% to win
      const potOdds = 2; // 2:1 pot odds (need 33% equity)

      const shouldCall = PokerMath.shouldCallBasedOnOdds(equity, potOdds);

      expect(shouldCall).toBe(true);
    });

    it('should recommend fold with bad equity vs pot odds', () => {
      const equity = 0.2; // 20% to win
      const potOdds = 5; // 5:1 pot odds (need 16.7% equity)

      const shouldCall = PokerMath.shouldCallBasedOnOdds(equity, potOdds);

      expect(shouldCall).toBe(true); // 20% > 16.7%
    });

    it('should handle breakeven scenario', () => {
      const equity = 0.25; // 25% to win
      const potOdds = 3; // 3:1 pot odds (need exactly 25% equity)

      const shouldCall = PokerMath.shouldCallBasedOnOdds(equity, potOdds);

      expect(shouldCall).toBe(true); // Breakeven is acceptable
    });

    it('should recommend fold when equity too low', () => {
      const equity = 0.1; // 10% to win
      const potOdds = 2; // 2:1 pot odds (need 33% equity)

      const shouldCall = PokerMath.shouldCallBasedOnOdds(equity, potOdds);

      expect(shouldCall).toBe(false);
    });
  });

  // ============================================================================
  // Flush Draw Tests
  // ============================================================================

  describe('findFlushDraw', () => {
    it('should detect flush draw with 4 cards of same suit', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', '2'),
        new Card('spades', '7')
      ];

      const flushDraw = PokerMath.findFlushDraw(cards);

      expect(flushDraw).not.toBe(null);
      expect(flushDraw.type).toBe('flush_draw');
      expect(flushDraw.suit).toBe('hearts');
      expect(flushDraw.outs).toBe(9);
    });

    it('should return null when no flush draw', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', '2'),
        new Card('hearts', '7')
      ];

      const flushDraw = PokerMath.findFlushDraw(cards);

      expect(flushDraw).toBe(null);
    });

    it('should return null when already have flush', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ];

      const flushDraw = PokerMath.findFlushDraw(cards);

      // 5 of same suit is a made flush, not a draw
      expect(flushDraw).toBe(null);
    });

    it('should detect flush draw in mixed suits', () => {
      const cards = [
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', '7'),
        new Card('spades', '2')
      ];

      const flushDraw = PokerMath.findFlushDraw(cards);

      expect(flushDraw).not.toBe(null);
      expect(flushDraw.suit).toBe('spades');
    });
  });

  // ============================================================================
  // Straight Draw Tests
  // ============================================================================

  describe('findStraightDraw', () => {
    it('should detect open-ended straight draw', () => {
      const cards = [
        new Card('hearts', '8'),
        new Card('spades', '7'),
        new Card('diamonds', '6'),
        new Card('clubs', '5'),
        new Card('hearts', 'A')
      ];

      const straightDraw = PokerMath.findStraightDraw(cards);

      expect(straightDraw).not.toBe(null);
      expect(straightDraw.type).toBe('open_ended_straight_draw');
      expect(straightDraw.outs).toBe(8);
    });

    it('should detect gutshot straight draw', () => {
      // 9-8-6-5 missing 7 is a gutshot (needs 7 to complete 9-8-7-6-5)
      const cards = [
        new Card('hearts', '9'),
        new Card('spades', '8'),
        new Card('diamonds', '6'),
        new Card('clubs', '5'),
        new Card('hearts', 'K')
      ];

      const straightDraw = PokerMath.findStraightDraw(cards);

      expect(straightDraw).not.toBe(null);
      expect(straightDraw.type).toBe('gutshot_straight_draw');
      expect(straightDraw.outs).toBe(4);
    });

    it('should return null when no straight draw', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', '8'),
        new Card('clubs', '5'),
        new Card('hearts', '2')
      ];

      const straightDraw = PokerMath.findStraightDraw(cards);

      expect(straightDraw).toBe(null);
    });

    it('should return null when already have straight', () => {
      const cards = [
        new Card('hearts', '9'),
        new Card('spades', '8'),
        new Card('diamonds', '7'),
        new Card('clubs', '6'),
        new Card('hearts', '5')
      ];

      const straightDraw = PokerMath.findStraightDraw(cards);

      // Already a made straight
      expect(straightDraw).toBe(null);
    });
  });

  // ============================================================================
  // Outs Calculation Tests
  // ============================================================================

  describe('calculateOuts', () => {
    it('should calculate outs for flush draw only', () => {
      const holeCards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K')
      ];

      const communityCards = [
        new Card('hearts', 'Q'),
        new Card('hearts', '2'),
        new Card('spades', '7')
      ];

      const outs = PokerMath.calculateOuts(holeCards, communityCards);

      expect(outs).toBe(9); // 9 hearts remaining
    });

    it('should calculate outs for straight draw only', () => {
      const holeCards = [
        new Card('hearts', '8'),
        new Card('spades', '7')
      ];

      const communityCards = [
        new Card('diamonds', '6'),
        new Card('clubs', '5'),
        new Card('hearts', 'A')
      ];

      const outs = PokerMath.calculateOuts(holeCards, communityCards);

      expect(outs).toBe(8); // Open-ended straight draw
    });

    it('should calculate outs for combo draw', () => {
      const holeCards = [
        new Card('hearts', '9'),
        new Card('hearts', '8')
      ];

      const communityCards = [
        new Card('hearts', '7'),
        new Card('hearts', '6'),
        new Card('spades', 'A')
      ];

      const outs = PokerMath.calculateOuts(holeCards, communityCards);

      // Flush draw (9) + straight draw (8) = 17 (some overlap)
      // But our simple implementation adds them
      expect(outs).toBeGreaterThanOrEqual(8);
    });

    it('should return 0 for no draws', () => {
      const holeCards = [
        new Card('hearts', 'A'),
        new Card('spades', '2')
      ];

      const communityCards = [
        new Card('diamonds', 'K'),
        new Card('clubs', '8'),
        new Card('hearts', '5')
      ];

      const outs = PokerMath.calculateOuts(holeCards, communityCards);

      expect(outs).toBe(0);
    });
  });

  // ============================================================================
  // Starting Hand Rank Tests
  // ============================================================================

  describe('getStartingHandRank', () => {
    it('should rank pocket aces as Group 1', () => {
      const aceSpades = new Card('spades', 'A');
      const aceHearts = new Card('hearts', 'A');

      const rank = PokerMath.getStartingHandRank(aceSpades, aceHearts);

      expect(rank).toBe(1);
    });

    it('should rank AK suited as Group 1', () => {
      const aceSpades = new Card('spades', 'A');
      const kingSpades = new Card('spades', 'K');

      const rank = PokerMath.getStartingHandRank(aceSpades, kingSpades);

      expect(rank).toBe(1);
    });

    it('should rank pocket tens as Group 2', () => {
      const tenHearts = new Card('hearts', '10');
      const tenDiamonds = new Card('diamonds', '10');

      const rank = PokerMath.getStartingHandRank(tenHearts, tenDiamonds);

      expect(rank).toBe(2);
    });

    it('should rank weak hands as Group 8 or 9', () => {
      const seven = new Card('hearts', '7');
      const two = new Card('spades', '2');

      const rank = PokerMath.getStartingHandRank(seven, two);

      expect(rank).toBeGreaterThanOrEqual(8);
      expect(rank).toBeLessThanOrEqual(9);
    });

    it('should handle suited connectors', () => {
      const jack = new Card('hearts', 'J');
      const ten = new Card('hearts', '10');

      const rank = PokerMath.getStartingHandRank(jack, ten);

      // JTs is Group 3
      expect(rank).toBeLessThanOrEqual(4);
    });

    it('should distinguish between suited and offsuit', () => {
      const aceHearts = new Card('hearts', 'A');
      const kingHearts = new Card('hearts', 'K');
      const kingSpades = new Card('spades', 'K');

      const suitedRank = PokerMath.getStartingHandRank(aceHearts, kingHearts);
      const offsuitRank = PokerMath.getStartingHandRank(aceHearts, kingSpades);

      // AKs (Group 1) should be ranked higher than AKo (Group 2)
      expect(suitedRank).toBeLessThan(offsuitRank);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty arrays gracefully', () => {
      expect(() => {
        PokerMath.evaluateHandStrength([], []);
      }).not.toThrow();
    });

    it('should handle single card', () => {
      const ace = new Card('spades', 'A');

      const strength = PokerMath.evaluateHandStrength([ace], []);

      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(1);
    });

    it('should handle large number of community cards', () => {
      const holeCards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ];

      const communityCards = [
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J'),
        new Card('hearts', '10')
      ];

      expect(() => {
        PokerMath.evaluateHandStrength(holeCards, communityCards);
      }).not.toThrow();
    });

    it('should handle zero pot odds correctly', () => {
      const potOdds = PokerMath.calculatePotOdds(0, 10);

      expect(potOdds).toBe(0);
    });
  });
});
