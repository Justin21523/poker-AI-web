/**
 * @fileoverview Card class representing a single playing card
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Card represents a single playing card with suit, rank, and value.
 * Supports JSON serialization and game-specific value calculations.
 *
 * @example
 * import { Card } from './Card.js';
 *
 * const aceOfSpades = new Card('spades', 'A');
 * console.log(aceOfSpades.toString()); // "A of spades"
 * console.log(aceOfSpades.value); // 14
 */

/**
 * Card class representing a single playing card
 */
export class Card {
  /**
   * Valid suits for a standard deck
   * @type {string[]}
   */
  static SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

  /**
   * Valid ranks for a standard deck
   * @type {string[]}
   */
  static RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  /**
   * Default value mapping for ranks
   * @type {Object.<string, number>}
   */
  static VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  /**
   * Unicode symbols for suits
   * @type {Object.<string, string>}
   */
  static SUIT_SYMBOLS = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  /**
   * Suit colors
   * @type {Object.<string, string>}
   */
  static SUIT_COLORS = {
    'hearts': 'red',
    'diamonds': 'red',
    'clubs': 'black',
    'spades': 'black'
  };

  /**
   * Creates a new Card
   * @param {string} suit - Card suit (hearts, diamonds, clubs, spades)
   * @param {string} rank - Card rank (2-10, J, Q, K, A)
   * @throws {Error} If suit or rank is invalid
   */
  constructor(suit, rank) {
    // Validate suit
    if (!Card.SUITS.includes(suit)) {
      throw new Error(`Invalid suit: ${suit}. Must be one of: ${Card.SUITS.join(', ')}`);
    }

    // Validate rank
    if (!Card.RANKS.includes(rank)) {
      throw new Error(`Invalid rank: ${rank}. Must be one of: ${Card.RANKS.join(', ')}`);
    }

    /**
     * Card suit
     * @type {string}
     * @readonly
     */
    this.suit = suit;

    /**
     * Card rank
     * @type {string}
     * @readonly
     */
    this.rank = rank;

    /**
     * Numeric value of the card
     * @type {number}
     * @readonly
     */
    this.value = Card.VALUES[rank];

    /**
     * Unique identifier for this card
     * @type {string}
     * @readonly
     */
    this.id = `${rank}_of_${suit}`;

    /**
     * Whether card is face up
     * @type {boolean}
     */
    this.faceUp = false;

    /**
     * Suit symbol
     * @type {string}
     * @readonly
     */
    this.symbol = Card.SUIT_SYMBOLS[suit];

    /**
     * Suit color
     * @type {string}
     * @readonly
     */
    this.color = Card.SUIT_COLORS[suit];
  }

  /**
   * Toggle card face up/down
   */
  flip() {
    this.faceUp = !this.faceUp;
  }

  /**
   * Show card (face up)
   */
  show() {
    this.faceUp = true;
  }

  /**
   * Hide card (face down)
   */
  hide() {
    this.faceUp = false;
  }

  /**
   * Compare this card to another card by value
   * @param {Card} otherCard - Card to compare to
   * @returns {number} -1 if this card is lower, 0 if equal, 1 if higher
   */
  compareTo(otherCard) {
    if (this.value < otherCard.value) return -1;
    if (this.value > otherCard.value) return 1;
    return 0;
  }

  /**
   * Check if this card equals another card
   * @param {Card} otherCard - Card to compare to
   * @returns {boolean} True if cards are identical (same suit and rank)
   */
  equals(otherCard) {
    return this.suit === otherCard.suit && this.rank === otherCard.rank;
  }

  /**
   * Check if this card has the same rank as another card
   * @param {Card} otherCard - Card to compare to
   * @returns {boolean} True if cards have the same rank
   */
  sameRank(otherCard) {
    return this.rank === otherCard.rank;
  }

  /**
   * Check if this card has the same suit as another card
   * @param {Card} otherCard - Card to compare to
   * @returns {boolean} True if cards have the same suit
   */
  sameSuit(otherCard) {
    return this.suit === otherCard.suit;
  }

  /**
   * Get game-specific value for this card
   * Different games may value cards differently
   * @param {string} gameType - Game type identifier
   * @returns {number} Game-specific value
   */
  getValueForGame(gameType) {
    // Default implementation - games can override this behavior
    // For example, in Blackjack, Aces can be 1 or 11
    switch (gameType) {
      case 'blackjack':
        // Aces are 11 by default in blackjack (can be adjusted during play)
        if (this.rank === 'A') return 11;
        // Face cards are 10
        if (['J', 'Q', 'K'].includes(this.rank)) return 10;
        return this.value;

      case 'big-two':
        // In Big Two, 2 is the highest card, then A, K, Q, etc.
        if (this.rank === '2') return 15;
        if (this.rank === 'A') return 14;
        return this.value;

      default:
        // Default poker-style values
        return this.value;
    }
  }

  /**
   * Get string representation of card
   * @returns {string} Card as string (e.g., "A of spades")
   */
  toString() {
    return `${this.rank} of ${this.suit}`;
  }

  /**
   * Get short string representation of card
   * @returns {string} Card as short string (e.g., "A`")
   */
  toShortString() {
    return `${this.rank}${this.symbol}`;
  }

  /**
   * Serialize card to JSON
   * @returns {Object} Card data as plain object
   */
  toJSON() {
    return {
      suit: this.suit,
      rank: this.rank,
      value: this.value,
      faceUp: this.faceUp,
      id: this.id
    };
  }

  /**
   * Create card from JSON data
   * @param {Object} data - Card data from JSON
   * @returns {Card} New card instance
   * @static
   */
  static fromJSON(data) {
    const card = new Card(data.suit, data.rank);
    card.faceUp = data.faceUp || false;
    return card;
  }

  /**
   * Create a standard 52-card deck
   * @returns {Card[]} Array of 52 cards
   * @static
   */
  static createStandardDeck() {
    const cards = [];
    for (const suit of Card.SUITS) {
      for (const rank of Card.RANKS) {
        cards.push(new Card(suit, rank));
      }
    }
    return cards;
  }

  /**
   * Sort comparator for sorting cards by value (ascending)
   * @param {Card} a - First card
   * @param {Card} b - Second card
   * @returns {number} Comparison result
   * @static
   */
  static compareByValue(a, b) {
    return a.value - b.value;
  }

  /**
   * Sort comparator for sorting cards by value (descending)
   * @param {Card} a - First card
   * @param {Card} b - Second card
   * @returns {number} Comparison result
   * @static
   */
  static compareByValueDesc(a, b) {
    return b.value - a.value;
  }

  /**
   * Sort comparator for sorting cards by suit then rank
   * @param {Card} a - First card
   * @param {Card} b - Second card
   * @returns {number} Comparison result
   * @static
   */
  static compareBySuitThenRank(a, b) {
    const suitOrder = { 'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3 };
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.value - b.value;
  }
}
