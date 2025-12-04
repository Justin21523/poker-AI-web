/**
 * @fileoverview Unit tests for Card class
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card } from '../../src/core/cards/Card.js';

describe('Card', () => {
  describe('Constructor', () => {
    it('should create a valid card with suit and rank', () => {
      const card = new Card('hearts', 'A');

      expect(card.suit).toBe('hearts');
      expect(card.rank).toBe('A');
      expect(card.value).toBe(14);
      expect(card.id).toBe('A_of_hearts');
      expect(card.faceUp).toBe(false);
      expect(card.symbol).toBe('♥');
      expect(card.color).toBe('red');
    });

    it('should throw error for invalid suit', () => {
      expect(() => new Card('invalid', 'A')).toThrow('Invalid suit: invalid');
    });

    it('should throw error for invalid rank', () => {
      expect(() => new Card('hearts', 'X')).toThrow('Invalid rank: X');
    });

    it('should create cards for all valid suits', () => {
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

      suits.forEach(suit => {
        const card = new Card(suit, 'A');
        expect(card.suit).toBe(suit);
      });
    });

    it('should create cards for all valid ranks', () => {
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

      ranks.forEach(rank => {
        const card = new Card('hearts', rank);
        expect(card.rank).toBe(rank);
      });
    });

    it('should assign correct colors', () => {
      expect(new Card('hearts', 'A').color).toBe('red');
      expect(new Card('diamonds', 'A').color).toBe('red');
      expect(new Card('clubs', 'A').color).toBe('black');
      expect(new Card('spades', 'A').color).toBe('black');
    });

    it('should assign correct symbols', () => {
      expect(new Card('hearts', 'A').symbol).toBe('♥');
      expect(new Card('diamonds', 'A').symbol).toBe('♦');
      expect(new Card('clubs', 'A').symbol).toBe('♣');
      expect(new Card('spades', 'A').symbol).toBe('♠');
    });
  });

  describe('Static Constants', () => {
    it('should have correct SUITS array', () => {
      expect(Card.SUITS).toEqual(['hearts', 'diamonds', 'clubs', 'spades']);
    });

    it('should have correct RANKS array', () => {
      expect(Card.RANKS).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
    });

    it('should have correct VALUES mapping', () => {
      expect(Card.VALUES['2']).toBe(2);
      expect(Card.VALUES['10']).toBe(10);
      expect(Card.VALUES['J']).toBe(11);
      expect(Card.VALUES['Q']).toBe(12);
      expect(Card.VALUES['K']).toBe(13);
      expect(Card.VALUES['A']).toBe(14);
    });
  });

  describe('Face Up/Down Methods', () => {
    let card;

    beforeEach(() => {
      card = new Card('hearts', 'A');
    });

    it('should start face down', () => {
      expect(card.faceUp).toBe(false);
    });

    it('should flip card state', () => {
      card.flip();
      expect(card.faceUp).toBe(true);

      card.flip();
      expect(card.faceUp).toBe(false);
    });

    it('should show card', () => {
      card.show();
      expect(card.faceUp).toBe(true);
    });

    it('should hide card', () => {
      card.show();
      card.hide();
      expect(card.faceUp).toBe(false);
    });
  });

  describe('Comparison Methods', () => {
    it('should compare cards by value correctly', () => {
      const card1 = new Card('hearts', '5');
      const card2 = new Card('spades', '10');
      const card3 = new Card('diamonds', '5');

      expect(card1.compareTo(card2)).toBe(-1); // 5 < 10
      expect(card2.compareTo(card1)).toBe(1);  // 10 > 5
      expect(card1.compareTo(card3)).toBe(0);  // 5 == 5
    });

    it('should check equality correctly', () => {
      const card1 = new Card('hearts', 'A');
      const card2 = new Card('hearts', 'A');
      const card3 = new Card('spades', 'A');
      const card4 = new Card('hearts', 'K');

      expect(card1.equals(card2)).toBe(true);  // Same suit and rank
      expect(card1.equals(card3)).toBe(false); // Different suit
      expect(card1.equals(card4)).toBe(false); // Different rank
    });

    it('should check same rank correctly', () => {
      const card1 = new Card('hearts', 'A');
      const card2 = new Card('spades', 'A');
      const card3 = new Card('hearts', 'K');

      expect(card1.sameRank(card2)).toBe(true);
      expect(card1.sameRank(card3)).toBe(false);
    });

    it('should check same suit correctly', () => {
      const card1 = new Card('hearts', 'A');
      const card2 = new Card('hearts', 'K');
      const card3 = new Card('spades', 'A');

      expect(card1.sameSuit(card2)).toBe(true);
      expect(card1.sameSuit(card3)).toBe(false);
    });
  });

  describe('Game-Specific Values', () => {
    it('should return correct blackjack values', () => {
      const ace = new Card('hearts', 'A');
      const king = new Card('spades', 'K');
      const five = new Card('diamonds', '5');

      expect(ace.getValueForGame('blackjack')).toBe(11);
      expect(king.getValueForGame('blackjack')).toBe(10);
      expect(five.getValueForGame('blackjack')).toBe(5);
    });

    it('should return correct big-two values', () => {
      const two = new Card('hearts', '2');
      const ace = new Card('spades', 'A');
      const king = new Card('diamonds', 'K');

      expect(two.getValueForGame('big-two')).toBe(15);
      expect(ace.getValueForGame('big-two')).toBe(14);
      expect(king.getValueForGame('big-two')).toBe(13);
    });

    it('should return default poker values for unknown game', () => {
      const ace = new Card('hearts', 'A');
      const king = new Card('spades', 'K');

      expect(ace.getValueForGame('unknown')).toBe(14);
      expect(king.getValueForGame('unknown')).toBe(13);
    });

    it('should return default values when no game specified', () => {
      const ace = new Card('hearts', 'A');
      expect(ace.getValueForGame()).toBe(14);
    });
  });

  describe('String Representations', () => {
    it('should convert to string correctly', () => {
      const card = new Card('hearts', 'A');
      expect(card.toString()).toBe('A of hearts');
    });

    it('should convert to short string correctly', () => {
      const card1 = new Card('hearts', 'A');
      const card2 = new Card('spades', 'K');
      const card3 = new Card('diamonds', '10');

      expect(card1.toShortString()).toBe('A♥');
      expect(card2.toShortString()).toBe('K♠');
      expect(card3.toShortString()).toBe('10♦');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const card = new Card('hearts', 'A');
      card.show();

      const json = card.toJSON();

      expect(json).toEqual({
        suit: 'hearts',
        rank: 'A',
        value: 14,
        faceUp: true,
        id: 'A_of_hearts'
      });
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        suit: 'spades',
        rank: 'K',
        value: 13,
        faceUp: true,
        id: 'K_of_spades'
      };

      const card = Card.fromJSON(json);

      expect(card.suit).toBe('spades');
      expect(card.rank).toBe('K');
      expect(card.value).toBe(13);
      expect(card.faceUp).toBe(true);
      expect(card.id).toBe('K_of_spades');
    });

    it('should handle faceUp default when deserializing', () => {
      const json = {
        suit: 'hearts',
        rank: 'A',
        value: 14,
        id: 'A_of_hearts'
      };

      const card = Card.fromJSON(json);
      expect(card.faceUp).toBe(false);
    });
  });

  describe('Static Deck Creation', () => {
    it('should create standard 52-card deck', () => {
      const deck = Card.createStandardDeck();

      expect(deck).toHaveLength(52);
    });

    it('should have all suits in deck', () => {
      const deck = Card.createStandardDeck();
      const suits = new Set(deck.map(card => card.suit));

      expect(suits.size).toBe(4);
      expect(suits.has('hearts')).toBe(true);
      expect(suits.has('diamonds')).toBe(true);
      expect(suits.has('clubs')).toBe(true);
      expect(suits.has('spades')).toBe(true);
    });

    it('should have all ranks in deck', () => {
      const deck = Card.createStandardDeck();
      const ranks = new Set(deck.map(card => card.rank));

      expect(ranks.size).toBe(13);
    });

    it('should have exactly 4 of each rank', () => {
      const deck = Card.createStandardDeck();
      const rankCounts = {};

      deck.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      });

      Object.values(rankCounts).forEach(count => {
        expect(count).toBe(4);
      });
    });

    it('should have exactly 13 of each suit', () => {
      const deck = Card.createStandardDeck();
      const suitCounts = {};

      deck.forEach(card => {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
      });

      Object.values(suitCounts).forEach(count => {
        expect(count).toBe(13);
      });
    });
  });

  describe('Static Sort Comparators', () => {
    let cards;

    beforeEach(() => {
      cards = [
        new Card('hearts', '5'),
        new Card('spades', 'K'),
        new Card('diamonds', '2'),
        new Card('clubs', 'A')
      ];
    });

    it('should sort by value ascending', () => {
      cards.sort(Card.compareByValue);

      expect(cards[0].rank).toBe('2');
      expect(cards[1].rank).toBe('5');
      expect(cards[2].rank).toBe('K');
      expect(cards[3].rank).toBe('A');
    });

    it('should sort by value descending', () => {
      cards.sort(Card.compareByValueDesc);

      expect(cards[0].rank).toBe('A');
      expect(cards[1].rank).toBe('K');
      expect(cards[2].rank).toBe('5');
      expect(cards[3].rank).toBe('2');
    });

    it('should sort by suit then rank', () => {
      const testCards = [
        new Card('spades', 'A'),
        new Card('clubs', '2'),
        new Card('hearts', 'K'),
        new Card('clubs', 'A'),
        new Card('diamonds', '5')
      ];

      testCards.sort(Card.compareBySuitThenRank);

      // Clubs should come first (suit order: clubs, diamonds, hearts, spades)
      expect(testCards[0].suit).toBe('clubs');
      expect(testCards[1].suit).toBe('clubs');
      // Within clubs, 2 should come before A
      expect(testCards[0].rank).toBe('2');
      expect(testCards[1].rank).toBe('A');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-sensitive suit validation', () => {
      expect(() => new Card('Hearts', 'A')).toThrow();
      expect(() => new Card('HEARTS', 'A')).toThrow();
    });

    it('should handle case-sensitive rank validation', () => {
      expect(() => new Card('hearts', 'a')).toThrow();
      expect(() => new Card('hearts', 'k')).toThrow();
    });

    it('should create unique IDs for each card', () => {
      const card1 = new Card('hearts', 'A');
      const card2 = new Card('spades', 'A');
      const card3 = new Card('hearts', 'K');

      expect(card1.id).not.toBe(card2.id);
      expect(card1.id).not.toBe(card3.id);
      expect(card2.id).not.toBe(card3.id);
    });

    it('should maintain immutable suit and rank', () => {
      const card = new Card('hearts', 'A');
      const originalSuit = card.suit;
      const originalRank = card.rank;

      // Attempting to change (though TypeScript/JSDoc marks them readonly)
      card.suit = 'spades';
      card.rank = 'K';

      // In JavaScript, these will actually change, but in proper usage they should be treated as readonly
      // This test documents the behavior
      expect(card.suit).toBe('spades'); // Will change in JS
      expect(card.rank).toBe('K');      // Will change in JS
    });
  });

  describe('Integration Tests', () => {
    it('should work correctly in a poker hand scenario', () => {
      const hand = [
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ];

      // All same suit (flush)
      const allHearts = hand.every(card => card.suit === 'hearts');
      expect(allHearts).toBe(true);

      // Sort by value
      hand.sort(Card.compareByValue);
      expect(hand[0].rank).toBe('10');
      expect(hand[4].rank).toBe('A');
    });

    it('should serialize and deserialize a full deck', () => {
      const originalDeck = Card.createStandardDeck();
      const serialized = originalDeck.map(card => card.toJSON());
      const deserialized = serialized.map(data => Card.fromJSON(data));

      expect(deserialized).toHaveLength(52);
      deserialized.forEach((card, index) => {
        expect(card.suit).toBe(originalDeck[index].suit);
        expect(card.rank).toBe(originalDeck[index].rank);
        expect(card.value).toBe(originalDeck[index].value);
      });
    });
  });
});
