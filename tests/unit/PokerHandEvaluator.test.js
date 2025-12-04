/**
 * @fileoverview Unit tests for PokerHandEvaluator
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect } from 'vitest';
import { PokerHandEvaluator } from '../../src/games/poker/PokerHandEvaluator.js';
import { Card } from '../../src/core/cards/Card.js';
import { POKER_HAND_RANKS } from '../../src/utils/constants/GameConstants.js';

describe('PokerHandEvaluator', () => {
  describe('Basic Validation', () => {
    it('should throw error for less than 5 cards', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ];

      expect(() => PokerHandEvaluator.evaluate(cards)).toThrow('at least 5 cards required');
    });

    it('should evaluate exactly 5 cards', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J'),
        new Card('hearts', '10')
      ];

      const result = PokerHandEvaluator.evaluate(cards);
      expect(result).toBeDefined();
      expect(result.cards).toHaveLength(5);
    });

    it('should evaluate 7 cards (Texas Hold\'em)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J'),
        new Card('hearts', '10'),
        new Card('spades', '9'),
        new Card('diamonds', '8')
      ];

      const result = PokerHandEvaluator.evaluate(cards);
      expect(result).toBeDefined();
      expect(result.cards).toHaveLength(5);
    });
  });

  describe('Royal Flush', () => {
    it('should detect royal flush', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.ROYAL_FLUSH);
      expect(result.rankName).toBe('Royal Flush');
      expect(result.description).toContain('Royal Flush');
    });

    it('should detect royal flush from 7 cards', () => {
      const cards = [
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('spades', 'Q'),
        new Card('spades', 'J'),
        new Card('spades', '10'),
        new Card('hearts', '2'),
        new Card('diamonds', '3')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.ROYAL_FLUSH);
    });
  });

  describe('Straight Flush', () => {
    it('should detect straight flush', () => {
      const cards = [
        new Card('diamonds', '9'),
        new Card('diamonds', '8'),
        new Card('diamonds', '7'),
        new Card('diamonds', '6'),
        new Card('diamonds', '5')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.STRAIGHT_FLUSH);
      expect(result.rankName).toBe('Straight Flush');
      expect(result.primaryValues[0]).toBe(9);
    });

    it('should detect low straight flush (A-2-3-4-5)', () => {
      const cards = [
        new Card('clubs', 'A'),
        new Card('clubs', '5'),
        new Card('clubs', '4'),
        new Card('clubs', '3'),
        new Card('clubs', '2')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.STRAIGHT_FLUSH);
      expect(result.primaryValues[0]).toBe(5); // 5-high
    });
  });

  describe('Four of a Kind', () => {
    it('should detect four of a kind', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'A'),
        new Card('hearts', 'K')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FOUR_OF_A_KIND);
      expect(result.rankName).toBe('Four of a Kind');
      expect(result.primaryValues[0]).toBe(14); // Aces
      expect(result.kickers[0]).toBe(13); // King kicker
    });

    it('should choose best four of a kind from 7 cards', () => {
      const cards = [
        new Card('hearts', 'K'),
        new Card('spades', 'K'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'K'),
        new Card('hearts', 'A'),
        new Card('spades', '2'),
        new Card('diamonds', '3')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FOUR_OF_A_KIND);
      expect(result.primaryValues[0]).toBe(13); // Kings
      expect(result.kickers[0]).toBe(14); // Ace kicker (best)
    });
  });

  describe('Full House', () => {
    it('should detect full house', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'K'),
        new Card('hearts', 'K')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FULL_HOUSE);
      expect(result.rankName).toBe('Full House');
      expect(result.primaryValues[0]).toBe(14); // Aces
      expect(result.primaryValues[1]).toBe(13); // Kings
      expect(result.description).toContain('Aces over Kings');
    });

    it('should choose best full house from 7 cards', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'K'),
        new Card('hearts', 'K'),
        new Card('spades', 'Q'),
        new Card('diamonds', 'Q')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FULL_HOUSE);
      expect(result.primaryValues[0]).toBe(14); // Aces
      expect(result.primaryValues[1]).toBe(13); // Kings (higher pair)
    });
  });

  describe('Flush', () => {
    it('should detect flush', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('hearts', 'J'),
        new Card('hearts', '9'),
        new Card('hearts', '6'),
        new Card('hearts', '3')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FLUSH);
      expect(result.rankName).toBe('Flush');
      expect(result.primaryValues[0]).toBe(14); // Ace high
    });

    it('should choose best 5 cards for flush from 7', () => {
      const cards = [
        new Card('diamonds', 'A'),
        new Card('diamonds', 'K'),
        new Card('diamonds', 'Q'),
        new Card('diamonds', 'J'),
        new Card('diamonds', '9'),
        new Card('diamonds', '5'),
        new Card('hearts', '2')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.FLUSH);
      // Should use A-K-Q-J-9 (best 5)
      expect(result.cards[0].rank).toBe('A');
      expect(result.cards[4].rank).toBe('9');
    });
  });

  describe('Straight', () => {
    it('should detect straight', () => {
      const cards = [
        new Card('hearts', '9'),
        new Card('spades', '8'),
        new Card('diamonds', '7'),
        new Card('clubs', '6'),
        new Card('hearts', '5')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.STRAIGHT);
      expect(result.rankName).toBe('Straight');
      expect(result.primaryValues[0]).toBe(9);
    });

    it('should detect ace-high straight', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J'),
        new Card('hearts', '10')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.STRAIGHT);
      expect(result.primaryValues[0]).toBe(14);
    });

    it('should detect low straight (A-2-3-4-5 wheel)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', '5'),
        new Card('diamonds', '4'),
        new Card('clubs', '3'),
        new Card('hearts', '2')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.STRAIGHT);
      expect(result.primaryValues[0]).toBe(5); // 5-high straight
    });
  });

  describe('Three of a Kind', () => {
    it('should detect three of a kind', () => {
      const cards = [
        new Card('hearts', 'Q'),
        new Card('spades', 'Q'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J'),
        new Card('hearts', '9')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.THREE_OF_A_KIND);
      expect(result.rankName).toBe('Three of a Kind');
      expect(result.primaryValues[0]).toBe(12); // Queens
      expect(result.kickers).toHaveLength(2);
      expect(result.kickers[0]).toBe(11); // Jack
      expect(result.kickers[1]).toBe(9);
    });
  });

  describe('Two Pair', () => {
    it('should detect two pair', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'K'),
        new Card('hearts', 'Q')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.TWO_PAIR);
      expect(result.rankName).toBe('Two Pair');
      expect(result.primaryValues[0]).toBe(14); // Aces
      expect(result.primaryValues[1]).toBe(13); // Kings
      expect(result.kickers[0]).toBe(12); // Queen
    });

    it('should choose best two pair from 7 cards', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'K'),
        new Card('hearts', 'Q'),
        new Card('spades', 'Q'),
        new Card('diamonds', 'J')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.TWO_PAIR);
      expect(result.primaryValues[0]).toBe(14); // Aces
      expect(result.primaryValues[1]).toBe(13); // Kings (not Queens)
      expect(result.kickers[0]).toBe(12); // Queen (best remaining card)
    });
  });

  describe('One Pair', () => {
    it('should detect one pair', () => {
      const cards = [
        new Card('hearts', 'J'),
        new Card('spades', 'J'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'K'),
        new Card('hearts', 'Q')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.ONE_PAIR);
      expect(result.rankName).toBe('One Pair');
      expect(result.primaryValues[0]).toBe(11); // Jacks
      expect(result.kickers).toHaveLength(3);
      expect(result.kickers[0]).toBe(14); // Ace
      expect(result.kickers[1]).toBe(13); // King
      expect(result.kickers[2]).toBe(12); // Queen
    });
  });

  describe('High Card', () => {
    it('should detect high card (no pair)', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', '9'),
        new Card('hearts', '7')
      ];

      const result = PokerHandEvaluator.evaluate(cards);

      expect(result.rank).toBe(POKER_HAND_RANKS.HIGH_CARD);
      expect(result.rankName).toBe('High Card');
      expect(result.primaryValues[0]).toBe(14); // Ace
      expect(result.kickers).toHaveLength(4);
    });
  });

  describe('Hand Comparison', () => {
    it('should compare different ranks correctly', () => {
      const flush = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('hearts', 'J'),
        new Card('hearts', '9'),
        new Card('hearts', '6'),
        new Card('hearts', '3')
      ]);

      const straight = PokerHandEvaluator.evaluate([
        new Card('hearts', '9'),
        new Card('spades', '8'),
        new Card('diamonds', '7'),
        new Card('clubs', '6'),
        new Card('hearts', '5')
      ]);

      expect(PokerHandEvaluator.compareHands(flush, straight)).toBe(1); // Flush wins
      expect(PokerHandEvaluator.compareHands(straight, flush)).toBe(-1);
    });

    it('should compare same rank with different values', () => {
      const acePair = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'Q'),
        new Card('hearts', 'J')
      ]);

      const kingPair = PokerHandEvaluator.evaluate([
        new Card('hearts', 'K'),
        new Card('spades', 'K'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'Q'),
        new Card('hearts', 'J')
      ]);

      expect(PokerHandEvaluator.compareHands(acePair, kingPair)).toBe(1); // Ace pair wins
      expect(PokerHandEvaluator.compareHands(kingPair, acePair)).toBe(-1);
    });

    it('should compare same pairs with different kickers', () => {
      const hand1 = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'Q'),
        new Card('hearts', 'J')
      ]);

      const hand2 = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'K'),
        new Card('clubs', 'Q'),
        new Card('hearts', '10')
      ]);

      expect(PokerHandEvaluator.compareHands(hand1, hand2)).toBe(1); // Jack kicker wins
    });

    it('should detect perfect tie', () => {
      const hand1 = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ]);

      const hand2 = PokerHandEvaluator.evaluate([
        new Card('spades', 'A'),
        new Card('spades', 'K'),
        new Card('spades', 'Q'),
        new Card('spades', 'J'),
        new Card('spades', '10')
      ]);

      expect(PokerHandEvaluator.compareHands(hand1, hand2)).toBe(0); // Both royal flush
    });
  });

  describe('Determine Winners', () => {
    it('should determine single winner', () => {
      const hands = [
        PokerHandEvaluator.evaluate([
          new Card('hearts', 'A'),
          new Card('spades', 'A'),
          new Card('diamonds', 'K'),
          new Card('clubs', 'Q'),
          new Card('hearts', 'J')
        ]),
        PokerHandEvaluator.evaluate([
          new Card('hearts', 'K'),
          new Card('spades', 'K'),
          new Card('diamonds', 'A'),
          new Card('clubs', 'Q'),
          new Card('hearts', 'J')
        ])
      ];

      const winners = PokerHandEvaluator.determineWinners(hands);

      expect(winners).toEqual([0]); // First hand (ace pair) wins
    });

    it('should detect tie between multiple hands', () => {
      const hands = [
        PokerHandEvaluator.evaluate([
          new Card('hearts', 'A'),
          new Card('hearts', 'K'),
          new Card('hearts', 'Q'),
          new Card('hearts', 'J'),
          new Card('hearts', '10')
        ]),
        PokerHandEvaluator.evaluate([
          new Card('spades', 'A'),
          new Card('spades', 'K'),
          new Card('spades', 'Q'),
          new Card('spades', 'J'),
          new Card('spades', '10')
        ]),
        PokerHandEvaluator.evaluate([
          new Card('diamonds', 'K'),
          new Card('diamonds', 'K'),
          new Card('clubs', 'A'),
          new Card('hearts', 'Q'),
          new Card('spades', 'J')
        ])
      ];

      const winners = PokerHandEvaluator.determineWinners(hands);

      expect(winners).toEqual([0, 1]); // Both royal flushes tie
    });

    it('should handle empty array', () => {
      const winners = PokerHandEvaluator.determineWinners([]);
      expect(winners).toEqual([]);
    });

    it('should handle single hand', () => {
      const hands = [
        PokerHandEvaluator.evaluate([
          new Card('hearts', 'A'),
          new Card('spades', 'K'),
          new Card('diamonds', 'Q'),
          new Card('clubs', 'J'),
          new Card('hearts', '10')
        ])
      ];

      const winners = PokerHandEvaluator.determineWinners(hands);
      expect(winners).toEqual([0]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all same rank cards correctly', () => {
      // This shouldn't happen in real poker, but test robustness
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'A'),
        new Card('hearts', 'K')
      ];

      const result = PokerHandEvaluator.evaluate(cards);
      expect(result.rank).toBe(POKER_HAND_RANKS.FOUR_OF_A_KIND);
    });

    it('should correctly evaluate mixed suits and values', () => {
      const cards = [
        new Card('hearts', '2'),
        new Card('spades', '7'),
        new Card('diamonds', 'J'),
        new Card('clubs', 'K'),
        new Card('hearts', 'A')
      ];

      const result = PokerHandEvaluator.evaluate(cards);
      expect(result.rank).toBe(POKER_HAND_RANKS.HIGH_CARD);
    });
  });

  describe('Description', () => {
    it('should provide human-readable descriptions', () => {
      const royalFlush = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ]);

      const description = PokerHandEvaluator.describeHand(royalFlush);
      expect(description).toContain('Royal Flush');

      const fullHouse = PokerHandEvaluator.evaluate([
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('diamonds', 'A'),
        new Card('clubs', 'K'),
        new Card('hearts', 'K')
      ]);

      const fhDescription = PokerHandEvaluator.describeHand(fullHouse);
      expect(fhDescription).toContain('Full House');
      expect(fhDescription).toContain('Aces');
      expect(fhDescription).toContain('Kings');
    });
  });
});
