/**
 * @fileoverview Unit tests for Hand class
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hand } from '../../src/core/cards/Hand.js';
import { Card } from '../../src/core/cards/Card.js';

describe('Hand', () => {
  describe('Constructor', () => {
    it('should create an empty hand with default configuration', () => {
      const hand = new Hand();

      expect(hand.cards).toEqual([]);
      expect(hand.ownerId).toBeNull();
      expect(hand.maxSize).toBeNull();
      expect(hand.sortOrder).toBe(Hand.SORT_ORDER.NONE);
      expect(hand.autoSort).toBe(false);
    });

    it('should create a hand with custom configuration', () => {
      const hand = new Hand({
        ownerId: 'player1',
        maxSize: 5,
        sortOrder: Hand.SORT_ORDER.VALUE_ASC,
        autoSort: true
      });

      expect(hand.ownerId).toBe('player1');
      expect(hand.maxSize).toBe(5);
      expect(hand.sortOrder).toBe(Hand.SORT_ORDER.VALUE_ASC);
      expect(hand.autoSort).toBe(true);
    });
  });

  describe('Adding Cards', () => {
    let hand;

    beforeEach(() => {
      hand = new Hand();
    });

    it('should add a card to the hand', () => {
      const card = new Card('hearts', 'A');
      const result = hand.addCard(card);

      expect(result).toBe(true);
      expect(hand.cards).toHaveLength(1);
      expect(hand.cards[0]).toBe(card);
    });

    it('should add multiple cards', () => {
      const cards = [
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q')
      ];

      const addedCount = hand.addCards(cards);

      expect(addedCount).toBe(3);
      expect(hand.cards).toHaveLength(3);
    });

    it('should respect max size limit', () => {
      hand = new Hand({ maxSize: 2 });

      const card1 = new Card('hearts', 'A');
      const card2 = new Card('spades', 'K');
      const card3 = new Card('diamonds', 'Q');

      expect(hand.addCard(card1)).toBe(true);
      expect(hand.addCard(card2)).toBe(true);
      expect(hand.addCard(card3)).toBe(false); // Should fail

      expect(hand.cards).toHaveLength(2);
    });

    it('should auto-sort when enabled', () => {
      hand = new Hand({
        autoSort: true,
        sortOrder: Hand.SORT_ORDER.VALUE_ASC
      });

      hand.addCard(new Card('hearts', 'K'));
      hand.addCard(new Card('spades', '5'));
      hand.addCard(new Card('diamonds', 'A'));

      expect(hand.cards[0].rank).toBe('5');
      expect(hand.cards[1].rank).toBe('K');
      expect(hand.cards[2].rank).toBe('A');
    });

    it('should throw error when adding null card', () => {
      expect(() => hand.addCard(null)).toThrow('Hand: card is required');
    });
  });

  describe('Removing Cards', () => {
    let hand;
    let card1, card2, card3;

    beforeEach(() => {
      hand = new Hand();
      card1 = new Card('hearts', 'A');
      card2 = new Card('spades', 'K');
      card3 = new Card('diamonds', 'Q');

      hand.addCards([card1, card2, card3]);
    });

    it('should remove a specific card', () => {
      const result = hand.removeCard(card2);

      expect(result).toBe(true);
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards).not.toContain(card2);
    });

    it('should return false when removing non-existent card', () => {
      const nonExistentCard = new Card('clubs', '2');
      const result = hand.removeCard(nonExistentCard);

      expect(result).toBe(false);
      expect(hand.cards).toHaveLength(3);
    });

    it('should remove card at index', () => {
      const removed = hand.removeCardAt(1);

      expect(removed).toBe(card2);
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards).not.toContain(card2);
    });

    it('should return null for invalid index', () => {
      expect(hand.removeCardAt(10)).toBeNull();
      expect(hand.removeCardAt(-1)).toBeNull();
      expect(hand.cards).toHaveLength(3);
    });

    it('should remove multiple cards by predicate', () => {
      const removed = hand.removeCards(card => card.rank === 'A' || card.rank === 'K');

      expect(removed).toHaveLength(2);
      expect(hand.cards).toHaveLength(1);
      expect(hand.cards[0]).toBe(card3);
    });

    it('should clear all cards', () => {
      const removed = hand.clear();

      expect(removed).toHaveLength(3);
      expect(hand.cards).toHaveLength(0);
      expect(hand.isEmpty()).toBe(true);
    });
  });

  describe('Queries', () => {
    let hand;

    beforeEach(() => {
      hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('diamonds', '5')
      ]);
    });

    it('should get card at index', () => {
      const card = hand.getCardAt(0);
      expect(card).toBeDefined();
      expect(card.rank).toBe('A');
    });

    it('should return null for invalid index', () => {
      expect(hand.getCardAt(10)).toBeNull();
    });

    it('should get all cards (copy)', () => {
      const cards = hand.getCards();

      expect(cards).toHaveLength(5);
      expect(cards).not.toBe(hand.cards); // Should be a copy
    });

    it('should get card count', () => {
      expect(hand.getCount()).toBe(5);
    });

    it('should check if empty', () => {
      expect(hand.isEmpty()).toBe(false);

      hand.clear();
      expect(hand.isEmpty()).toBe(true);
    });

    it('should check if full', () => {
      const limitedHand = new Hand({ maxSize: 2 });
      expect(limitedHand.isFull()).toBe(false);

      limitedHand.addCard(new Card('hearts', 'A'));
      expect(limitedHand.isFull()).toBe(false);

      limitedHand.addCard(new Card('spades', 'K'));
      expect(limitedHand.isFull()).toBe(true);
    });

    it('should check if hand has card', () => {
      const aceOfHearts = new Card('hearts', 'A');
      const twoOfClubs = new Card('clubs', '2');

      expect(hand.hasCard(aceOfHearts)).toBe(true);
      expect(hand.hasCard(twoOfClubs)).toBe(false);
    });

    it('should check if hand has card matching predicate', () => {
      expect(hand.hasCardMatching(card => card.rank === 'A')).toBe(true);
      expect(hand.hasCardMatching(card => card.rank === '2')).toBe(false);
    });

    it('should find cards by rank', () => {
      const aces = hand.findCardsByRank('A');
      expect(aces).toHaveLength(2);
      expect(aces.every(card => card.rank === 'A')).toBe(true);
    });

    it('should find cards by suit', () => {
      const hearts = hand.findCardsBySuit('hearts');
      expect(hearts).toHaveLength(3);
      expect(hearts.every(card => card.suit === 'hearts')).toBe(true);
    });

    it('should find cards by value', () => {
      const fourteens = hand.findCardsByValue(14);
      expect(fourteens).toHaveLength(2); // Both aces
    });

    it('should find cards by predicate', () => {
      const highCards = hand.findCards(card => card.value >= 13);
      expect(highCards).toHaveLength(3); // 2 Aces, 1 King (Queen is 12)
    });

    it('should get highest card', () => {
      const highest = hand.getHighestCard();
      expect(highest.rank).toBe('A');
    });

    it('should get lowest card', () => {
      const lowest = hand.getLowestCard();
      expect(lowest.rank).toBe('5');
    });

    it('should return null for highest/lowest in empty hand', () => {
      hand.clear();
      expect(hand.getHighestCard()).toBeNull();
      expect(hand.getLowestCard()).toBeNull();
    });

    it('should count cards by rank', () => {
      const counts = hand.countByRank();

      expect(counts['A']).toBe(2);
      expect(counts['K']).toBe(1);
      expect(counts['Q']).toBe(1);
      expect(counts['5']).toBe(1);
    });

    it('should count cards by suit', () => {
      const counts = hand.countBySuit();

      expect(counts['hearts']).toBe(3);
      expect(counts['spades']).toBe(1);
      expect(counts['diamonds']).toBe(1);
    });

    it('should get unique ranks', () => {
      const ranks = hand.getUniqueRanks();

      expect(ranks).toHaveLength(4); // A, K, Q, 5
      expect(ranks).toContain('A');
      expect(ranks).toContain('K');
      expect(ranks).toContain('Q');
      expect(ranks).toContain('5');
    });

    it('should get unique suits', () => {
      const suits = hand.getUniqueSuits();

      expect(suits).toHaveLength(3); // hearts, spades, diamonds
      expect(suits).toContain('hearts');
      expect(suits).toContain('spades');
      expect(suits).toContain('diamonds');
    });
  });

  describe('Sorting', () => {
    let hand;

    beforeEach(() => {
      hand = new Hand();
      hand.addCards([
        new Card('hearts', 'K'),
        new Card('spades', '5'),
        new Card('diamonds', 'A'),
        new Card('clubs', '10'),
        new Card('hearts', 'Q')
      ]);
    });

    it('should sort by value ascending', () => {
      hand.sortByValue();

      expect(hand.cards[0].rank).toBe('5');
      expect(hand.cards[4].rank).toBe('A');
    });

    it('should sort by value descending', () => {
      hand.sortByValueDesc();

      expect(hand.cards[0].rank).toBe('A');
      expect(hand.cards[4].rank).toBe('5');
    });

    it('should sort by suit then rank', () => {
      hand.sortBySuitThenRank();

      // Clubs, diamonds, hearts, spades
      expect(hand.cards[0].suit).toBe('clubs');
      expect(hand.cards[1].suit).toBe('diamonds');
    });

    it('should sort by rank then suit', () => {
      hand.sortByRankThenSuit();

      expect(hand.cards[0].rank).toBe('5');
      expect(hand.cards[4].rank).toBe('A');
    });

    it('should sort using custom comparator', () => {
      hand.sortCustom((a, b) => a.rank.localeCompare(b.rank));

      // String sort: "10", "5", "A", "K", "Q"
      expect(hand.cards[0].rank).toBe('10');
    });

    it('should be chainable', () => {
      const result = hand.sortByValue();
      expect(result).toBe(hand);
    });

    it('should sort using sort order constant', () => {
      hand.sortOrder = Hand.SORT_ORDER.VALUE_DESC;
      hand.sort();

      expect(hand.cards[0].rank).toBe('A');
    });

    it('should reverse card order', () => {
      const firstCard = hand.cards[0];
      const lastCard = hand.cards[4];

      hand.reverse();

      expect(hand.cards[0]).toBe(lastCard);
      expect(hand.cards[4]).toBe(firstCard);
    });

    it('should swap two cards', () => {
      const card1 = hand.cards[0];
      const card2 = hand.cards[2];

      const result = hand.swap(0, 2);

      expect(result).toBe(true);
      expect(hand.cards[0]).toBe(card2);
      expect(hand.cards[2]).toBe(card1);
    });

    it('should return false for invalid swap', () => {
      expect(hand.swap(0, 10)).toBe(false);
      expect(hand.swap(-1, 2)).toBe(false);
    });
  });

  describe('Face Up/Down Operations', () => {
    let hand;

    beforeEach(() => {
      hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q')
      ]);
    });

    it('should show all cards', () => {
      hand.showAll();

      expect(hand.cards.every(card => card.faceUp)).toBe(true);
    });

    it('should hide all cards', () => {
      hand.showAll();
      hand.hideAll();

      expect(hand.cards.every(card => !card.faceUp)).toBe(true);
    });

    it('should flip all cards', () => {
      hand.flipAll();

      expect(hand.cards.every(card => card.faceUp)).toBe(true);

      hand.flipAll();

      expect(hand.cards.every(card => !card.faceUp)).toBe(true);
    });

    it('should be chainable', () => {
      const result = hand.showAll();
      expect(result).toBe(hand);
    });
  });

  describe('Value Calculations', () => {
    let hand;

    beforeEach(() => {
      hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', '5')
      ]);
    });

    it('should calculate total value (default)', () => {
      const total = hand.getTotalValue();
      expect(total).toBe(14 + 13 + 5); // 32
    });

    it('should calculate total value for blackjack', () => {
      const total = hand.getTotalValue('blackjack');
      expect(total).toBe(11 + 10 + 5); // 26
    });

    it('should calculate total value for big-two', () => {
      const total = hand.getTotalValue('big-two');
      expect(total).toBe(14 + 13 + 5); // 32
    });
  });

  describe('String Representations', () => {
    it('should convert to string', () => {
      const hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ]);

      expect(hand.toString()).toBe('A of hearts, K of spades');
    });

    it('should convert empty hand to string', () => {
      const hand = new Hand();
      expect(hand.toString()).toBe('Empty hand');
    });

    it('should convert to short string', () => {
      const hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ]);

      expect(hand.toShortString()).toBe('[A♥ K♠]');
    });

    it('should convert empty hand to short string', () => {
      const hand = new Hand();
      expect(hand.toShortString()).toBe('[]');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON', () => {
      const hand = new Hand({
        ownerId: 'player1',
        maxSize: 5,
        sortOrder: Hand.SORT_ORDER.VALUE_ASC,
        autoSort: true
      });

      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ]);

      const json = hand.toJSON();

      expect(json.ownerId).toBe('player1');
      expect(json.maxSize).toBe(5);
      expect(json.sortOrder).toBe(Hand.SORT_ORDER.VALUE_ASC);
      expect(json.autoSort).toBe(true);
      expect(json.cards).toHaveLength(2);
    });

    it('should deserialize from JSON', () => {
      const json = {
        ownerId: 'player1',
        maxSize: 5,
        sortOrder: Hand.SORT_ORDER.VALUE_DESC,
        autoSort: true,
        cards: [
          { suit: 'hearts', rank: 'A', value: 14, faceUp: true, id: 'A_of_hearts' },
          { suit: 'spades', rank: 'K', value: 13, faceUp: false, id: 'K_of_spades' }
        ]
      };

      const hand = Hand.fromJSON(json);

      expect(hand.ownerId).toBe('player1');
      expect(hand.maxSize).toBe(5);
      expect(hand.sortOrder).toBe(Hand.SORT_ORDER.VALUE_DESC);
      expect(hand.autoSort).toBe(true);
      expect(hand.cards).toHaveLength(2);
      expect(hand.cards[0].rank).toBe('A');
      expect(hand.cards[1].rank).toBe('K');
    });
  });

  describe('Clone', () => {
    it('should create a copy of the hand', () => {
      const original = new Hand({
        ownerId: 'player1',
        maxSize: 5
      });

      original.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ]);

      const cloned = original.clone();

      expect(cloned).not.toBe(original);
      expect(cloned.ownerId).toBe(original.ownerId);
      expect(cloned.maxSize).toBe(original.maxSize);
      expect(cloned.cards).toHaveLength(original.cards.length);
      expect(cloned.cards).not.toBe(original.cards); // Different array
    });
  });

  describe('Transfer', () => {
    let hand1, hand2;

    beforeEach(() => {
      hand1 = new Hand();
      hand2 = new Hand();

      hand1.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K'),
        new Card('diamonds', 'Q'),
        new Card('clubs', 'J')
      ]);
    });

    it('should transfer cards by count', () => {
      const transferred = hand1.transferTo(hand2, 2);

      expect(transferred).toHaveLength(2);
      expect(hand1.cards).toHaveLength(2);
      expect(hand2.cards).toHaveLength(2);
    });

    it('should transfer specific cards', () => {
      const cardsToTransfer = [hand1.cards[0], hand1.cards[2]];
      const transferred = hand1.transferTo(hand2, cardsToTransfer);

      expect(transferred).toHaveLength(2);
      expect(hand1.cards).toHaveLength(2);
      expect(hand2.cards).toHaveLength(2);
    });

    it('should stop transfer when target is full', () => {
      hand2 = new Hand({ maxSize: 2 });

      const transferred = hand1.transferTo(hand2, 4);

      expect(transferred).toHaveLength(2);
      expect(hand1.cards).toHaveLength(2);
      expect(hand2.cards).toHaveLength(2);
    });

    it('should handle transferring more cards than available', () => {
      const transferred = hand1.transferTo(hand2, 10);

      expect(transferred).toHaveLength(4);
      expect(hand1.cards).toHaveLength(0);
      expect(hand2.cards).toHaveLength(4);
    });
  });

  describe('Integration Tests', () => {
    it('should handle a poker hand scenario', () => {
      const hand = new Hand({
        ownerId: 'player1',
        maxSize: 5,
        sortOrder: Hand.SORT_ORDER.VALUE_DESC,
        autoSort: true
      });

      // Deal cards
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('hearts', 'K'),
        new Card('hearts', 'Q'),
        new Card('hearts', 'J'),
        new Card('hearts', '10')
      ]);

      // Check for flush
      const suits = hand.getUniqueSuits();
      expect(suits).toHaveLength(1);

      // Check for straight
      hand.sortByValue();
      const values = hand.cards.map(c => c.value);
      const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
      expect(isStraight).toBe(true);

      // Royal flush!
      expect(hand.cards[0].rank).toBe('10');
      expect(hand.cards[4].rank).toBe('A');
    });

    it('should handle blackjack scenario', () => {
      const hand = new Hand();
      hand.addCards([
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ]);

      const blackjackValue = hand.getTotalValue('blackjack');
      expect(blackjackValue).toBe(21); // Blackjack!
    });

    it('should handle discard and redraw', () => {
      const hand = new Hand({ maxSize: 5 });

      // Initial deal
      hand.addCards([
        new Card('hearts', '2'),
        new Card('spades', '3'),
        new Card('diamonds', '7'),
        new Card('clubs', 'K'),
        new Card('hearts', 'A')
      ]);

      // Discard low cards
      hand.removeCards(card => card.value < 7);

      expect(hand.cards).toHaveLength(3);

      // Draw new cards
      hand.addCards([
        new Card('spades', 'Q'),
        new Card('diamonds', 'J')
      ]);

      expect(hand.cards).toHaveLength(5);
      expect(hand.isFull()).toBe(true);
    });
  });
});
