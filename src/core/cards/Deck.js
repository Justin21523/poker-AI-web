/**
 * @fileoverview Deck class for managing card collections with shuffle and deal operations
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Deck manages a collection of cards with shuffle, draw, and reset operations.
 * Integrates with EventBus for game event notifications and supports multiple deck configurations.
 *
 * @example
 * import { Deck } from './Deck.js';
 * import { EventBus } from '../events/EventBus.js';
 *
 * const eventBus = new EventBus();
 * const deck = new Deck({ eventBus, numDecks: 1, includeJokers: false });
 * deck.initialize();
 * deck.shuffle();
 * const card = deck.draw();
 */

import { Card } from './Card.js';
import { GAME_EVENTS } from '../events/EventTypes.js';

/**
 * Deck class for managing card collections
 */
export class Deck {
  /**
   * Creates a new Deck instance
   *
   * @param {Object} config - Deck configuration
   * @param {EventBus} [config.eventBus] - EventBus instance for notifications
   * @param {number} [config.numDecks=1] - Number of standard 52-card decks to use
   * @param {boolean} [config.includeJokers=false] - Whether to include jokers
   * @param {number} [config.numJokers=2] - Number of jokers per deck (if included)
   * @param {boolean} [config.autoShuffle=true] - Auto-shuffle when deck is empty
   * @param {Function} [config.customDeckFactory] - Custom deck creation function
   */
  constructor(config = {}) {
    /**
     * EventBus for game notifications
     * @type {EventBus|null}
     */
    this.eventBus = config.eventBus || null;

    /**
     * Number of standard decks to use
     * @type {number}
     */
    this.numDecks = config.numDecks || 1;

    /**
     * Whether to include jokers
     * @type {boolean}
     */
    this.includeJokers = config.includeJokers || false;

    /**
     * Number of jokers per deck
     * @type {number}
     */
    this.numJokers = config.numJokers || 2;

    /**
     * Auto-shuffle when deck runs out
     * @type {boolean}
     */
    this.autoShuffle = config.autoShuffle !== false;

    /**
     * Custom deck factory function
     * @type {Function|null}
     */
    this.customDeckFactory = config.customDeckFactory || null;

    /**
     * Main card array (draw from here)
     * @type {Card[]}
     */
    this.cards = [];

    /**
     * Discard pile
     * @type {Card[]}
     */
    this.discardPile = [];

    /**
     * Original cards for reset
     * @type {Card[]}
     * @private
     */
    this._originalCards = [];

    /**
     * Number of shuffles performed
     * @type {number}
     */
    this.shuffleCount = 0;

    /**
     * Number of cards dealt
     * @type {number}
     */
    this.dealtCount = 0;
  }

  /**
   * Initializes the deck with cards
   * Creates cards based on configuration (numDecks, jokers, etc.)
   *
   * @returns {Deck} This deck for chaining
   */
  initialize() {
    this.cards = [];
    this.discardPile = [];
    this.shuffleCount = 0;
    this.dealtCount = 0;

    // Use custom factory if provided
    if (this.customDeckFactory) {
      this.cards = this.customDeckFactory();
    } else {
      // Create standard deck(s)
      for (let i = 0; i < this.numDecks; i++) {
        const standardDeck = Card.createStandardDeck();
        this.cards.push(...standardDeck);

        // Add jokers if configured
        if (this.includeJokers) {
          for (let j = 0; j < this.numJokers; j++) {
            const jokerColor = j % 2 === 0 ? 'red' : 'black';
            this.cards.push(this.createJoker(jokerColor, i * this.numJokers + j));
          }
        }
      }
    }

    // Store original cards for reset
    this._originalCards = this.cards.map(card => ({
      suit: card.suit,
      rank: card.rank,
      isJoker: card.isJoker || false,
      jokerColor: card.jokerColor
    }));

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.DECK_INITIALIZED, {
        cardCount: this.cards.length,
        numDecks: this.numDecks,
        includeJokers: this.includeJokers
      });
    }

    return this;
  }

  /**
   * Creates a joker card
   * @private
   * @param {string} color - Joker color (red or black)
   * @param {number} index - Joker index for unique ID
   * @returns {Object} Joker card object
   */
  createJoker(color, index) {
    return {
      suit: 'joker',
      rank: 'JOKER',
      value: 0,
      id: `joker_${color}_${index}`,
      faceUp: false,
      symbol: '<Ï',
      color: color,
      isJoker: true,
      jokerColor: color,
      flip() { this.faceUp = !this.faceUp; },
      show() { this.faceUp = true; },
      hide() { this.faceUp = false; },
      toString() { return `${color} Joker`; },
      toShortString() { return '<Ï'; },
      toJSON() {
        return {
          suit: this.suit,
          rank: this.rank,
          value: this.value,
          faceUp: this.faceUp,
          id: this.id,
          isJoker: true,
          jokerColor: this.jokerColor
        };
      }
    };
  }

  /**
   * Shuffles the deck using Fisher-Yates algorithm
   * @returns {Deck} This deck for chaining
   */
  shuffle() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    this.shuffleCount++;

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.CARDS_SHUFFLED, {
        cardCount: this.cards.length,
        shuffleCount: this.shuffleCount
      });
    }

    return this;
  }

  /**
   * Draws a card from the deck
   * If deck is empty and autoShuffle is enabled, reshuffles discard pile
   *
   * @returns {Card|null} Drawn card or null if deck is empty
   */
  draw() {
    // Auto-shuffle discard pile if deck is empty
    if (this.cards.length === 0 && this.autoShuffle && this.discardPile.length > 0) {
      this.reshuffleDiscardPile();
    }

    if (this.cards.length === 0) {
      return null;
    }

    const card = this.cards.pop();
    this.dealtCount++;

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.CARDS_DEALT, {
        cardCount: 1,
        remainingCards: this.cards.length,
        dealtCount: this.dealtCount
      });
    }

    return card;
  }

  /**
   * Draws a card from the top of the deck (index 0)
   * @returns {Card|null} Drawn card or null if deck is empty
   */
  drawFromTop() {
    // Auto-shuffle discard pile if deck is empty
    if (this.cards.length === 0 && this.autoShuffle && this.discardPile.length > 0) {
      this.reshuffleDiscardPile();
    }

    if (this.cards.length === 0) {
      return null;
    }

    const card = this.cards.shift();
    this.dealtCount++;

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.CARDS_DEALT, {
        cardCount: 1,
        remainingCards: this.cards.length,
        dealtCount: this.dealtCount
      });
    }

    return card;
  }

  /**
   * Draws multiple cards from the deck
   *
   * @param {number} count - Number of cards to draw
   * @returns {Card[]} Array of drawn cards
   */
  drawMultiple(count) {
    const drawnCards = [];

    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card === null) {
        break; // Stop if deck runs out
      }
      drawnCards.push(card);
    }

    return drawnCards;
  }

  /**
   * Peeks at the top card without removing it
   *
   * @param {number} [index=0] - Index to peek at (0 = top)
   * @returns {Card|null} Card at index or null
   */
  peek(index = 0) {
    if (index < 0 || index >= this.cards.length) {
      return null;
    }
    return this.cards[this.cards.length - 1 - index];
  }

  /**
   * Adds a card to the discard pile
   *
   * @param {Card} card - Card to discard
   */
  discard(card) {
    this.discardPile.push(card);
  }

  /**
   * Adds multiple cards to the discard pile
   *
   * @param {Card[]} cards - Cards to discard
   */
  discardMultiple(cards) {
    this.discardPile.push(...cards);
  }

  /**
   * Reshuffles the discard pile back into the deck
   */
  reshuffleDiscardPile() {
    this.cards = [...this.discardPile];
    this.discardPile = [];
    this.shuffle();

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.DISCARD_SHUFFLED, {
        cardCount: this.cards.length
      });
    }
  }

  /**
   * Resets the deck to its original state
   * Recreates all cards and clears discard pile
   *
   * @param {boolean} [autoShuffle=false] - Whether to shuffle after reset
   * @returns {Deck} This deck for chaining
   */
  reset(autoShuffle = false) {
    this.cards = [];
    this.discardPile = [];
    this.dealtCount = 0;

    // Recreate cards from original configuration
    for (const cardData of this._originalCards) {
      if (cardData.isJoker) {
        this.cards.push(this.createJoker(cardData.jokerColor, this.cards.length));
      } else {
        this.cards.push(new Card(cardData.suit, cardData.rank));
      }
    }

    if (autoShuffle) {
      this.shuffle();
    }

    if (this.eventBus) {
      this.eventBus.emit(GAME_EVENTS.DECK_RESET, {
        cardCount: this.cards.length,
        shuffled: autoShuffle
      });
    }

    return this;
  }

  /**
   * Gets the number of cards remaining in the deck
   *
   * @returns {number} Number of cards in deck
   */
  getRemainingCount() {
    return this.cards.length;
  }

  /**
   * Gets the number of cards in the discard pile
   *
   * @returns {number} Number of discarded cards
   */
  getDiscardCount() {
    return this.discardPile.length;
  }

  /**
   * Checks if the deck is empty
   *
   * @returns {boolean} True if deck has no cards
   */
  isEmpty() {
    return this.cards.length === 0;
  }

  /**
   * Gets deck statistics
   *
   * @returns {Object} Deck statistics
   */
  getStats() {
    return {
      remainingCards: this.cards.length,
      discardedCards: this.discardPile.length,
      totalCards: this.cards.length + this.discardPile.length,
      shuffleCount: this.shuffleCount,
      dealtCount: this.dealtCount,
      originalSize: this._originalCards.length
    };
  }

  /**
   * Serializes deck to JSON
   *
   * @returns {Object} Deck data as plain object
   */
  toJSON() {
    return {
      cards: this.cards.map(card => card.toJSON()),
      discardPile: this.discardPile.map(card => card.toJSON()),
      numDecks: this.numDecks,
      includeJokers: this.includeJokers,
      shuffleCount: this.shuffleCount,
      dealtCount: this.dealtCount,
      autoShuffle: this.autoShuffle
    };
  }

  /**
   * Creates a deck from JSON data
   *
   * @param {Object} data - Deck data from JSON
   * @param {EventBus} [eventBus] - EventBus instance
   * @returns {Deck} New deck instance
   * @static
   */
  static fromJSON(data, eventBus = null) {
    const deck = new Deck({
      eventBus,
      numDecks: data.numDecks,
      includeJokers: data.includeJokers,
      autoShuffle: data.autoShuffle
    });

    // Restore cards
    deck.cards = data.cards.map(cardData => {
      if (cardData.isJoker) {
        return deck.createJoker(cardData.jokerColor, 0);
      }
      return Card.fromJSON(cardData);
    });

    // Restore discard pile
    deck.discardPile = data.discardPile.map(cardData => {
      if (cardData.isJoker) {
        return deck.createJoker(cardData.jokerColor, 0);
      }
      return Card.fromJSON(cardData);
    });

    deck.shuffleCount = data.shuffleCount || 0;
    deck.dealtCount = data.dealtCount || 0;

    // Store original cards
    deck._originalCards = deck.cards.map(card => ({
      suit: card.suit,
      rank: card.rank,
      isJoker: card.isJoker || false,
      jokerColor: card.jokerColor
    }));

    return deck;
  }

  /**
   * Finds cards matching a predicate
   *
   * @param {Function} predicate - Function that returns true for matching cards
   * @returns {Card[]} Array of matching cards
   */
  findCards(predicate) {
    return this.cards.filter(predicate);
  }

  /**
   * Removes specific cards from the deck
   *
   * @param {Function} predicate - Function that returns true for cards to remove
   * @returns {Card[]} Removed cards
   */
  removeCards(predicate) {
    const removedCards = [];
    this.cards = this.cards.filter(card => {
      if (predicate(card)) {
        removedCards.push(card);
        return false;
      }
      return true;
    });
    return removedCards;
  }

  /**
   * Inserts a card at a specific position
   *
   * @param {Card} card - Card to insert
   * @param {number} [position] - Position to insert (default: random)
   */
  insertCard(card, position = null) {
    if (position === null) {
      position = Math.floor(Math.random() * (this.cards.length + 1));
    }
    this.cards.splice(position, 0, card);
  }

  /**
   * Cuts the deck at a specific position
   * Moves cards from position to end to the beginning
   *
   * @param {number} [position] - Cut position (default: middle)
   * @returns {Deck} This deck for chaining
   */
  cut(position = null) {
    if (position === null) {
      position = Math.floor(this.cards.length / 2);
    }

    const bottomHalf = this.cards.slice(0, position);
    const topHalf = this.cards.slice(position);
    this.cards = [...topHalf, ...bottomHalf];

    return this;
  }
}
