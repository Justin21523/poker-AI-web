/**
 * @fileoverview Hand class for managing player card collections
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Hand manages a player's cards with sorting, querying, and
 * manipulation capabilities. Supports maximum size limits and owner tracking.
 *
 * @example
 * import { Hand } from './Hand.js';
 * import { Card } from './Card.js';
 *
 * const hand = new Hand({ ownerId: 'player1', maxSize: 5 });
 * hand.addCard(new Card('hearts', 'A'));
 * hand.sortByValue();
 * console.log(hand.getCards());
 */

import { Card } from './Card.js';

/**
 * Hand class for managing player cards
 */
export class Hand {
  /**
   * Sort order constants
   * @type {Object}
   * @static
   */
  static SORT_ORDER = {
    VALUE_ASC: 'value_asc',
    VALUE_DESC: 'value_desc',
    SUIT_THEN_RANK: 'suit_then_rank',
    RANK_THEN_SUIT: 'rank_then_suit',
    NONE: 'none'
  };

  /**
   * Creates a new Hand instance
   *
   * @param {Object} config - Hand configuration
   * @param {string} [config.ownerId] - ID of the player who owns this hand
   * @param {number} [config.maxSize] - Maximum number of cards allowed (null = unlimited)
   * @param {string} [config.sortOrder='none'] - Default sort order
   * @param {boolean} [config.autoSort=false] - Auto-sort when cards are added
   */
  constructor(config = {}) {
    /**
     * Cards in this hand
     * @type {Card[]}
     */
    this.cards = [];

    /**
     * Owner ID (player ID)
     * @type {string|null}
     */
    this.ownerId = config.ownerId || null;

    /**
     * Maximum hand size (null = unlimited)
     * @type {number|null}
     */
    this.maxSize = config.maxSize || null;

    /**
     * Current sort order
     * @type {string}
     */
    this.sortOrder = config.sortOrder || Hand.SORT_ORDER.NONE;

    /**
     * Auto-sort when cards added
     * @type {boolean}
     */
    this.autoSort = config.autoSort || false;
  }

  /**
   * Adds a card to the hand
   *
   * @param {Card} card - Card to add
   * @returns {boolean} True if card was added, false if hand is full
   * @throws {Error} If card is not a Card instance
   */
  addCard(card) {
    if (!card) {
      throw new Error('Hand: card is required');
    }

    // Check max size
    if (this.maxSize !== null && this.cards.length >= this.maxSize) {
      return false;
    }

    this.cards.push(card);

    if (this.autoSort) {
      this.sort(this.sortOrder);
    }

    return true;
  }

  /**
   * Adds multiple cards to the hand
   *
   * @param {Card[]} cards - Cards to add
   * @returns {number} Number of cards successfully added
   */
  addCards(cards) {
    let addedCount = 0;

    for (const card of cards) {
      if (this.addCard(card)) {
        addedCount++;
      } else {
        break; // Stop if hand is full
      }
    }

    return addedCount;
  }

  /**
   * Removes a card from the hand
   *
   * @param {Card} card - Card to remove
   * @returns {boolean} True if card was removed
   */
  removeCard(card) {
    const index = this.cards.findIndex(c => c.equals(card));

    if (index === -1) {
      return false;
    }

    this.cards.splice(index, 1);
    return true;
  }

  /**
   * Removes a card at a specific index
   *
   * @param {number} index - Index of card to remove
   * @returns {Card|null} Removed card or null if index invalid
   */
  removeCardAt(index) {
    if (index < 0 || index >= this.cards.length) {
      return null;
    }

    const removed = this.cards.splice(index, 1);
    return removed[0];
  }

  /**
   * Removes all cards matching a predicate
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
   * Gets a card at a specific index
   *
   * @param {number} index - Card index
   * @returns {Card|null} Card at index or null
   */
  getCardAt(index) {
    if (index < 0 || index >= this.cards.length) {
      return null;
    }
    return this.cards[index];
  }

  /**
   * Gets all cards in the hand
   *
   * @returns {Card[]} Array of cards (copy)
   */
  getCards() {
    return [...this.cards];
  }

  /**
   * Gets the number of cards in the hand
   *
   * @returns {number} Card count
   */
  getCount() {
    return this.cards.length;
  }

  /**
   * Checks if the hand is empty
   *
   * @returns {boolean} True if hand has no cards
   */
  isEmpty() {
    return this.cards.length === 0;
  }

  /**
   * Checks if the hand is full
   *
   * @returns {boolean} True if hand is at max size
   */
  isFull() {
    return this.maxSize !== null && this.cards.length >= this.maxSize;
  }

  /**
   * Clears all cards from the hand
   *
   * @returns {Card[]} Removed cards
   */
  clear() {
    const removedCards = [...this.cards];
    this.cards = [];
    return removedCards;
  }

  /**
   * Checks if hand contains a specific card
   *
   * @param {Card} card - Card to check
   * @returns {boolean} True if card is in hand
   */
  hasCard(card) {
    return this.cards.some(c => c.equals(card));
  }

  /**
   * Checks if hand contains a card matching predicate
   *
   * @param {Function} predicate - Function that returns true for matching cards
   * @returns {boolean} True if matching card found
   */
  hasCardMatching(predicate) {
    return this.cards.some(predicate);
  }

  /**
   * Finds cards by rank
   *
   * @param {string} rank - Card rank to find (e.g., 'A', 'K', '10')
   * @returns {Card[]} Cards with matching rank
   */
  findCardsByRank(rank) {
    return this.cards.filter(card => card.rank === rank);
  }

  /**
   * Finds cards by suit
   *
   * @param {string} suit - Card suit to find (e.g., 'hearts', 'spades')
   * @returns {Card[]} Cards with matching suit
   */
  findCardsBySuit(suit) {
    return this.cards.filter(card => card.suit === suit);
  }

  /**
   * Finds cards by value
   *
   * @param {number} value - Card value to find
   * @returns {Card[]} Cards with matching value
   */
  findCardsByValue(value) {
    return this.cards.filter(card => card.value === value);
  }

  /**
   * Finds cards matching a predicate
   *
   * @param {Function} predicate - Function that returns true for matching cards
   * @returns {Card[]} Matching cards
   */
  findCards(predicate) {
    return this.cards.filter(predicate);
  }

  /**
   * Gets the highest value card in the hand
   *
   * @returns {Card|null} Highest card or null if hand is empty
   */
  getHighestCard() {
    if (this.cards.length === 0) return null;

    return this.cards.reduce((highest, card) =>
      card.value > highest.value ? card : highest
    );
  }

  /**
   * Gets the lowest value card in the hand
   *
   * @returns {Card|null} Lowest card or null if hand is empty
   */
  getLowestCard() {
    if (this.cards.length === 0) return null;

    return this.cards.reduce((lowest, card) =>
      card.value < lowest.value ? card : lowest
    );
  }

  /**
   * Counts cards by rank
   *
   * @returns {Object.<string, number>} Map of rank to count
   */
  countByRank() {
    const counts = {};
    for (const card of this.cards) {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    }
    return counts;
  }

  /**
   * Counts cards by suit
   *
   * @returns {Object.<string, number>} Map of suit to count
   */
  countBySuit() {
    const counts = {};
    for (const card of this.cards) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
    return counts;
  }

  /**
   * Gets unique ranks in the hand
   *
   * @returns {string[]} Array of unique ranks
   */
  getUniqueRanks() {
    return [...new Set(this.cards.map(card => card.rank))];
  }

  /**
   * Gets unique suits in the hand
   *
   * @returns {string[]} Array of unique suits
   */
  getUniqueSuits() {
    return [...new Set(this.cards.map(card => card.suit))];
  }

  /**
   * Sorts the hand using specified order
   *
   * @param {string} [order] - Sort order (uses current sortOrder if not specified)
   * @returns {Hand} This hand for chaining
   */
  sort(order = null) {
    const sortOrder = order || this.sortOrder;

    switch (sortOrder) {
      case Hand.SORT_ORDER.VALUE_ASC:
        this.sortByValue();
        break;
      case Hand.SORT_ORDER.VALUE_DESC:
        this.sortByValueDesc();
        break;
      case Hand.SORT_ORDER.SUIT_THEN_RANK:
        this.sortBySuitThenRank();
        break;
      case Hand.SORT_ORDER.RANK_THEN_SUIT:
        this.sortByRankThenSuit();
        break;
      case Hand.SORT_ORDER.NONE:
      default:
        // No sorting
        break;
    }

    return this;
  }

  /**
   * Sorts cards by value (ascending)
   *
   * @returns {Hand} This hand for chaining
   */
  sortByValue() {
    this.cards.sort(Card.compareByValue);
    return this;
  }

  /**
   * Sorts cards by value (descending)
   *
   * @returns {Hand} This hand for chaining
   */
  sortByValueDesc() {
    this.cards.sort(Card.compareByValueDesc);
    return this;
  }

  /**
   * Sorts cards by suit then rank
   *
   * @returns {Hand} This hand for chaining
   */
  sortBySuitThenRank() {
    this.cards.sort(Card.compareBySuitThenRank);
    return this;
  }

  /**
   * Sorts cards by rank then suit
   *
   * @returns {Hand} This hand for chaining
   */
  sortByRankThenSuit() {
    this.cards.sort((a, b) => {
      const valueDiff = a.value - b.value;
      if (valueDiff !== 0) return valueDiff;

      const suitOrder = { 'clubs': 0, 'diamonds': 1, 'hearts': 2, 'spades': 3 };
      return suitOrder[a.suit] - suitOrder[b.suit];
    });
    return this;
  }

  /**
   * Sorts cards using custom comparator
   *
   * @param {Function} comparator - Comparison function
   * @returns {Hand} This hand for chaining
   */
  sortCustom(comparator) {
    this.cards.sort(comparator);
    return this;
  }

  /**
   * Reverses the order of cards
   *
   * @returns {Hand} This hand for chaining
   */
  reverse() {
    this.cards.reverse();
    return this;
  }

  /**
   * Swaps two cards by index
   *
   * @param {number} index1 - First card index
   * @param {number} index2 - Second card index
   * @returns {boolean} True if swap was successful
   */
  swap(index1, index2) {
    if (index1 < 0 || index1 >= this.cards.length ||
        index2 < 0 || index2 >= this.cards.length) {
      return false;
    }

    [this.cards[index1], this.cards[index2]] = [this.cards[index2], this.cards[index1]];
    return true;
  }

  /**
   * Shows all cards (sets faceUp = true)
   *
   * @returns {Hand} This hand for chaining
   */
  showAll() {
    this.cards.forEach(card => card.show());
    return this;
  }

  /**
   * Hides all cards (sets faceUp = false)
   *
   * @returns {Hand} This hand for chaining
   */
  hideAll() {
    this.cards.forEach(card => card.hide());
    return this;
  }

  /**
   * Flips all cards
   *
   * @returns {Hand} This hand for chaining
   */
  flipAll() {
    this.cards.forEach(card => card.flip());
    return this;
  }

  /**
   * Calculates total value of all cards
   *
   * @param {string} [gameType] - Game type for game-specific values
   * @returns {number} Total value
   */
  getTotalValue(gameType = null) {
    return this.cards.reduce((total, card) => {
      const value = gameType ? card.getValueForGame(gameType) : card.value;
      return total + value;
    }, 0);
  }

  /**
   * Gets string representation of hand
   *
   * @returns {string} Hand as string
   */
  toString() {
    if (this.cards.length === 0) {
      return 'Empty hand';
    }
    return this.cards.map(card => card.toString()).join(', ');
  }

  /**
   * Gets short string representation of hand
   *
   * @returns {string} Hand as short string
   */
  toShortString() {
    if (this.cards.length === 0) {
      return '[]';
    }
    return '[' + this.cards.map(card => card.toShortString()).join(' ') + ']';
  }

  /**
   * Serializes hand to JSON
   *
   * @returns {Object} Hand data as plain object
   */
  toJSON() {
    return {
      cards: this.cards.map(card => card.toJSON()),
      ownerId: this.ownerId,
      maxSize: this.maxSize,
      sortOrder: this.sortOrder,
      autoSort: this.autoSort
    };
  }

  /**
   * Creates hand from JSON data
   *
   * @param {Object} data - Hand data from JSON
   * @returns {Hand} New hand instance
   * @static
   */
  static fromJSON(data) {
    const hand = new Hand({
      ownerId: data.ownerId,
      maxSize: data.maxSize,
      sortOrder: data.sortOrder,
      autoSort: data.autoSort
    });

    hand.cards = data.cards.map(cardData => Card.fromJSON(cardData));

    return hand;
  }

  /**
   * Creates a copy of this hand
   *
   * @returns {Hand} New hand with same cards and config
   */
  clone() {
    const clonedHand = new Hand({
      ownerId: this.ownerId,
      maxSize: this.maxSize,
      sortOrder: this.sortOrder,
      autoSort: this.autoSort
    });

    clonedHand.cards = this.cards.map(card => Card.fromJSON(card.toJSON()));

    return clonedHand;
  }

  /**
   * Transfers cards to another hand
   *
   * @param {Hand} targetHand - Hand to transfer cards to
   * @param {number|Card[]} cardsOrCount - Cards to transfer or count
   * @returns {Card[]} Transferred cards
   */
  transferTo(targetHand, cardsOrCount) {
    const transferredCards = [];

    if (typeof cardsOrCount === 'number') {
      // Transfer count cards
      const count = Math.min(cardsOrCount, this.cards.length);
      for (let i = 0; i < count; i++) {
        const card = this.cards.pop();
        if (targetHand.addCard(card)) {
          transferredCards.push(card);
        } else {
          // Target hand is full, return card to this hand
          this.cards.push(card);
          break;
        }
      }
    } else if (Array.isArray(cardsOrCount)) {
      // Transfer specific cards
      for (const card of cardsOrCount) {
        if (this.removeCard(card)) {
          if (targetHand.addCard(card)) {
            transferredCards.push(card);
          } else {
            // Target hand is full, return card to this hand
            this.addCard(card);
            break;
          }
        }
      }
    }

    return transferredCards;
  }
}
