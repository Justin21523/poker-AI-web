/**
 * @fileoverview Unit tests for Deck class
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deck } from '../../src/core/cards/Deck.js';
import { Card } from '../../src/core/cards/Card.js';
import { EventBus } from '../../src/core/events/EventBus.js';
import { GAME_EVENTS } from '../../src/core/events/EventTypes.js';

describe('Deck', () => {
  describe('Constructor', () => {
    it('should create a deck with default configuration', () => {
      const deck = new Deck();

      expect(deck.numDecks).toBe(1);
      expect(deck.includeJokers).toBe(false);
      expect(deck.autoShuffle).toBe(true);
      expect(deck.cards).toEqual([]);
      expect(deck.discardPile).toEqual([]);
    });

    it('should create a deck with custom configuration', () => {
      const eventBus = new EventBus();
      const deck = new Deck({
        eventBus,
        numDecks: 2,
        includeJokers: true,
        numJokers: 4,
        autoShuffle: false
      });

      expect(deck.numDecks).toBe(2);
      expect(deck.includeJokers).toBe(true);
      expect(deck.numJokers).toBe(4);
      expect(deck.autoShuffle).toBe(false);
      expect(deck.eventBus).toBe(eventBus);
    });
  });

  describe('Initialization', () => {
    it('should initialize with 52 cards for single deck', () => {
      const deck = new Deck();
      deck.initialize();

      expect(deck.cards).toHaveLength(52);
    });

    it('should initialize with 104 cards for double deck', () => {
      const deck = new Deck({ numDecks: 2 });
      deck.initialize();

      expect(deck.cards).toHaveLength(104);
    });

    it('should include jokers when configured', () => {
      const deck = new Deck({ includeJokers: true, numJokers: 2 });
      deck.initialize();

      expect(deck.cards).toHaveLength(54); // 52 + 2 jokers
    });

    it('should emit DECK_INITIALIZED event', () => {
      const eventBus = new EventBus();
      const handler = vi.fn();
      eventBus.on(GAME_EVENTS.DECK_INITIALIZED, handler);

      const deck = new Deck({ eventBus });
      deck.initialize();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        cardCount: 52,
        numDecks: 1,
        includeJokers: false
      });
    });

    it('should reset counters on initialization', () => {
      const deck = new Deck();
      deck.initialize();
      deck.shuffleCount = 5;
      deck.dealtCount = 10;

      deck.initialize();

      expect(deck.shuffleCount).toBe(0);
      expect(deck.dealtCount).toBe(0);
    });
  });

  describe('Joker Creation', () => {
    it('should create red joker', () => {
      const deck = new Deck({ includeJokers: true });
      deck.initialize();

      const jokers = deck.cards.filter(card => card.isJoker);
      const redJoker = jokers.find(j => j.jokerColor === 'red');

      expect(redJoker).toBeDefined();
      expect(redJoker.suit).toBe('joker');
      expect(redJoker.rank).toBe('JOKER');
      expect(redJoker.value).toBe(0);
    });

    it('should create black joker', () => {
      const deck = new Deck({ includeJokers: true });
      deck.initialize();

      const jokers = deck.cards.filter(card => card.isJoker);
      const blackJoker = jokers.find(j => j.jokerColor === 'black');

      expect(blackJoker).toBeDefined();
      expect(blackJoker.jokerColor).toBe('black');
    });

    it('should create correct number of jokers', () => {
      const deck = new Deck({ includeJokers: true, numJokers: 4 });
      deck.initialize();

      const jokers = deck.cards.filter(card => card.isJoker);
      expect(jokers).toHaveLength(4);
    });
  });

  describe('Shuffle', () => {
    it('should shuffle the deck', () => {
      const deck = new Deck();
      deck.initialize();

      const originalOrder = [...deck.cards];
      deck.shuffle();

      // Very unlikely to have the same order after shuffle
      expect(deck.cards).not.toEqual(originalOrder);
    });

    it('should maintain card count after shuffle', () => {
      const deck = new Deck();
      deck.initialize();

      const countBefore = deck.cards.length;
      deck.shuffle();

      expect(deck.cards.length).toBe(countBefore);
    });

    it('should increment shuffle count', () => {
      const deck = new Deck();
      deck.initialize();

      expect(deck.shuffleCount).toBe(0);
      deck.shuffle();
      expect(deck.shuffleCount).toBe(1);
      deck.shuffle();
      expect(deck.shuffleCount).toBe(2);
    });

    it('should emit CARDS_SHUFFLED event', () => {
      const eventBus = new EventBus();
      const handler = vi.fn();
      eventBus.on(GAME_EVENTS.CARDS_SHUFFLED, handler);

      const deck = new Deck({ eventBus });
      deck.initialize();
      deck.shuffle();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        cardCount: 52,
        shuffleCount: 1
      });
    });

    it('should be chainable', () => {
      const deck = new Deck();
      deck.initialize();

      const result = deck.shuffle();
      expect(result).toBe(deck);
    });
  });

  describe('Drawing Cards', () => {
    let deck;

    beforeEach(() => {
      deck = new Deck();
      deck.initialize();
    });

    it('should draw card from bottom', () => {
      const lastCard = deck.cards[deck.cards.length - 1];
      const drawnCard = deck.draw();

      expect(drawnCard).toEqual(lastCard);
      expect(deck.cards).toHaveLength(51);
    });

    it('should draw card from top', () => {
      const firstCard = deck.cards[0];
      const drawnCard = deck.drawFromTop();

      expect(drawnCard).toEqual(firstCard);
      expect(deck.cards).toHaveLength(51);
    });

    it('should increment dealt count', () => {
      expect(deck.dealtCount).toBe(0);
      deck.draw();
      expect(deck.dealtCount).toBe(1);
      deck.draw();
      expect(deck.dealtCount).toBe(2);
    });

    it('should emit CARDS_DEALT event', () => {
      const eventBus = new EventBus();
      const handler = vi.fn();
      eventBus.on(GAME_EVENTS.CARDS_DEALT, handler);

      const testDeck = new Deck({ eventBus });
      testDeck.initialize();
      testDeck.draw();

      expect(handler).toHaveBeenCalledWith({
        cardCount: 1,
        remainingCards: 51,
        dealtCount: 1
      });
    });

    it('should return null when deck is empty', () => {
      // Empty the deck
      while (deck.cards.length > 0) {
        deck.draw();
      }

      const card = deck.draw();
      expect(card).toBeNull();
    });

    it('should draw multiple cards', () => {
      const cards = deck.drawMultiple(5);

      expect(cards).toHaveLength(5);
      expect(deck.cards).toHaveLength(47);
    });

    it('should handle drawing more cards than available', () => {
      const smallDeck = new Deck();
      smallDeck.initialize();

      const cards = smallDeck.drawMultiple(100);

      expect(cards).toHaveLength(52);
      expect(smallDeck.cards).toHaveLength(0);
    });
  });

  describe('Auto-shuffle', () => {
    it('should auto-shuffle discard pile when deck empties', () => {
      const deck = new Deck({ autoShuffle: true });
      deck.initialize();

      // Draw all cards
      while (deck.cards.length > 0) {
        const card = deck.draw();
        deck.discard(card);
      }

      expect(deck.cards).toHaveLength(0);
      expect(deck.discardPile).toHaveLength(52);

      // Next draw should trigger reshuffle
      const card = deck.draw();

      expect(card).not.toBeNull();
      expect(deck.cards.length).toBeGreaterThan(0);
      expect(deck.discardPile).toHaveLength(0);
    });

    it('should not auto-shuffle when disabled', () => {
      const deck = new Deck({ autoShuffle: false });
      deck.initialize();

      // Draw all cards
      while (deck.cards.length > 0) {
        deck.draw();
      }

      const card = deck.draw();
      expect(card).toBeNull();
    });
  });

  describe('Peek', () => {
    let deck;

    beforeEach(() => {
      deck = new Deck();
      deck.initialize();
    });

    it('should peek at top card without removing it', () => {
      const originalLength = deck.cards.length;
      const topCard = deck.cards[deck.cards.length - 1];

      const peekedCard = deck.peek();

      expect(peekedCard).toEqual(topCard);
      expect(deck.cards).toHaveLength(originalLength);
    });

    it('should peek at specific index', () => {
      const secondCard = deck.cards[deck.cards.length - 2];
      const peekedCard = deck.peek(1);

      expect(peekedCard).toEqual(secondCard);
    });

    it('should return null for invalid index', () => {
      expect(deck.peek(100)).toBeNull();
      expect(deck.peek(-1)).toBeNull();
    });
  });

  describe('Discard Pile', () => {
    let deck;

    beforeEach(() => {
      deck = new Deck();
      deck.initialize();
    });

    it('should add card to discard pile', () => {
      const card = deck.draw();
      deck.discard(card);

      expect(deck.discardPile).toHaveLength(1);
      expect(deck.discardPile[0]).toEqual(card);
    });

    it('should add multiple cards to discard pile', () => {
      const cards = deck.drawMultiple(5);
      deck.discardMultiple(cards);

      expect(deck.discardPile).toHaveLength(5);
    });

    it('should reshuffle discard pile into deck', () => {
      const cards = deck.drawMultiple(10);
      deck.discardMultiple(cards);

      expect(deck.discardPile).toHaveLength(10);
      expect(deck.cards).toHaveLength(42);

      deck.reshuffleDiscardPile();

      expect(deck.discardPile).toHaveLength(0);
      expect(deck.cards).toHaveLength(10); // Only the 10 discarded cards
    });

    it('should emit DISCARD_SHUFFLED event', () => {
      const eventBus = new EventBus();
      const handler = vi.fn();
      eventBus.on(GAME_EVENTS.DISCARD_SHUFFLED, handler);

      const testDeck = new Deck({ eventBus });
      testDeck.initialize();
      const cards = testDeck.drawMultiple(10);
      testDeck.discardMultiple(cards);
      testDeck.reshuffleDiscardPile();

      expect(handler).toHaveBeenCalledWith({
        cardCount: 10
      });
    });
  });

  describe('Reset', () => {
    it('should reset deck to original state', () => {
      const deck = new Deck();
      deck.initialize();

      // Modify deck
      deck.draw();
      deck.draw();
      deck.shuffleCount = 5;

      deck.reset();

      expect(deck.cards).toHaveLength(52);
      expect(deck.discardPile).toHaveLength(0);
      expect(deck.dealtCount).toBe(0);
    });

    it('should shuffle after reset when requested', () => {
      const deck = new Deck();
      deck.initialize();

      const originalOrder = [...deck.cards];
      deck.reset(true);

      expect(deck.cards).not.toEqual(originalOrder);
    });

    it('should emit DECK_RESET event', () => {
      const eventBus = new EventBus();
      const handler = vi.fn();
      eventBus.on(GAME_EVENTS.DECK_RESET, handler);

      const deck = new Deck({ eventBus });
      deck.initialize();
      deck.reset();

      expect(handler).toHaveBeenCalledWith({
        cardCount: 52,
        shuffled: false
      });
    });

    it('should be chainable', () => {
      const deck = new Deck();
      deck.initialize();

      const result = deck.reset();
      expect(result).toBe(deck);
    });
  });

  describe('Queries', () => {
    let deck;

    beforeEach(() => {
      deck = new Deck();
      deck.initialize();
    });

    it('should get remaining count', () => {
      expect(deck.getRemainingCount()).toBe(52);
      deck.draw();
      expect(deck.getRemainingCount()).toBe(51);
    });

    it('should get discard count', () => {
      expect(deck.getDiscardCount()).toBe(0);
      const card = deck.draw();
      deck.discard(card);
      expect(deck.getDiscardCount()).toBe(1);
    });

    it('should check if deck is empty', () => {
      expect(deck.isEmpty()).toBe(false);

      while (deck.cards.length > 0) {
        deck.draw();
      }

      expect(deck.isEmpty()).toBe(true);
    });

    it('should get deck statistics', () => {
      deck.shuffle();
      deck.draw();
      const card = deck.draw();
      deck.discard(card);

      const stats = deck.getStats();

      expect(stats.remainingCards).toBe(50);
      expect(stats.discardedCards).toBe(1);
      expect(stats.totalCards).toBe(51);
      expect(stats.shuffleCount).toBe(1);
      expect(stats.dealtCount).toBe(2);
      expect(stats.originalSize).toBe(52);
    });
  });

  describe('Card Operations', () => {
    let deck;

    beforeEach(() => {
      deck = new Deck();
      deck.initialize();
    });

    it('should find cards by predicate', () => {
      const aces = deck.findCards(card => card.rank === 'A');
      expect(aces).toHaveLength(4);
    });

    it('should remove cards by predicate', () => {
      const removed = deck.removeCards(card => card.rank === 'A');

      expect(removed).toHaveLength(4);
      expect(deck.cards).toHaveLength(48);
    });

    it('should insert card at position', () => {
      const newCard = new Card('hearts', 'A');
      const originalLength = deck.cards.length;

      deck.insertCard(newCard, 0);

      expect(deck.cards).toHaveLength(originalLength + 1);
      expect(deck.cards[0]).toEqual(newCard);
    });

    it('should insert card at random position when not specified', () => {
      const newCard = new Card('hearts', 'A');
      const originalLength = deck.cards.length;

      deck.insertCard(newCard);

      expect(deck.cards).toHaveLength(originalLength + 1);
      expect(deck.cards).toContainEqual(newCard);
    });

    it('should cut the deck', () => {
      const topHalf = deck.cards.slice(26);
      const bottomHalf = deck.cards.slice(0, 26);

      deck.cut(26);

      expect(deck.cards.slice(0, 26)).toEqual(topHalf);
      expect(deck.cards.slice(26)).toEqual(bottomHalf);
    });

    it('should cut at middle by default', () => {
      const result = deck.cut();
      expect(result).toBe(deck);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON', () => {
      const deck = new Deck({ numDecks: 2, includeJokers: true });
      deck.initialize();
      deck.shuffle();
      deck.draw();

      const json = deck.toJSON();

      expect(json.numDecks).toBe(2);
      expect(json.includeJokers).toBe(true);
      expect(json.shuffleCount).toBe(1);
      expect(json.dealtCount).toBe(1);
      expect(json.cards).toHaveLength(107); // 2 decks * 52 + 2 decks * 2 jokers - 1 drawn = 108 - 1 = 107
      expect(json.discardPile).toHaveLength(0);
    });

    it('should deserialize from JSON', () => {
      const originalDeck = new Deck();
      originalDeck.initialize();
      originalDeck.shuffle();
      originalDeck.draw();

      const json = originalDeck.toJSON();
      const eventBus = new EventBus();
      const restoredDeck = Deck.fromJSON(json, eventBus);

      expect(restoredDeck.cards).toHaveLength(originalDeck.cards.length);
      expect(restoredDeck.numDecks).toBe(originalDeck.numDecks);
      expect(restoredDeck.shuffleCount).toBe(originalDeck.shuffleCount);
      expect(restoredDeck.dealtCount).toBe(originalDeck.dealtCount);
      expect(restoredDeck.eventBus).toBe(eventBus);
    });

    it('should preserve jokers in serialization', () => {
      const deck = new Deck({ includeJokers: true });
      deck.initialize();

      const json = deck.toJSON();
      const restored = Deck.fromJSON(json);

      const jokers = restored.cards.filter(card => card.isJoker);
      expect(jokers).toHaveLength(2);
    });
  });

  describe('Custom Deck Factory', () => {
    it('should use custom deck factory', () => {
      const customFactory = () => [
        new Card('hearts', 'A'),
        new Card('spades', 'K')
      ];

      const deck = new Deck({ customDeckFactory: customFactory });
      deck.initialize();

      expect(deck.cards).toHaveLength(2);
      expect(deck.cards[0].rank).toBe('A');
      expect(deck.cards[1].rank).toBe('K');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full game cycle', () => {
      const eventBus = new EventBus();
      const deck = new Deck({ eventBus });

      // Initialize
      deck.initialize();
      expect(deck.cards).toHaveLength(52);

      // Shuffle
      deck.shuffle();
      expect(deck.shuffleCount).toBe(1);

      // Deal hands
      const player1Hand = deck.drawMultiple(5);
      const player2Hand = deck.drawMultiple(5);

      expect(player1Hand).toHaveLength(5);
      expect(player2Hand).toHaveLength(5);
      expect(deck.getRemainingCount()).toBe(42);

      // Discard some cards
      deck.discardMultiple([player1Hand[0], player2Hand[0]]);
      expect(deck.getDiscardCount()).toBe(2);

      // Reset for new game
      deck.reset(true);
      expect(deck.cards).toHaveLength(52);
      expect(deck.discardPile).toHaveLength(0);
    });

    it('should handle multiple decks correctly', () => {
      const deck = new Deck({ numDecks: 3 });
      deck.initialize();

      expect(deck.cards).toHaveLength(156); // 52 * 3

      // Should have 12 aces (4 per deck)
      const aces = deck.cards.filter(card => card.rank === 'A');
      expect(aces).toHaveLength(12);
    });
  });
});
