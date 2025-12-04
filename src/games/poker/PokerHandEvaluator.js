/**
 * @fileoverview Poker hand evaluation system for Texas Hold'em
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Evaluates poker hands from 7 cards (2 hole cards + 5 community cards)
 * and determines the best 5-card hand using standard poker rankings.
 *
 * @example
 * import { PokerHandEvaluator } from './PokerHandEvaluator.js';
 *
 * const cards = [
 *   new Card('hearts', 'A'),
 *   new Card('hearts', 'K'),
 *   // ... 5 more cards
 * ];
 *
 * const result = PokerHandEvaluator.evaluate(cards);
 * console.log(result.rankName); // "Royal Flush"
 */

import { Card } from '../../core/cards/Card.js';
import { POKER_HAND_RANKS, POKER_HAND_NAMES } from '../../utils/constants/GameConstants.js';

/**
 * Poker hand evaluator using combinatorial analysis
 */
export class PokerHandEvaluator {
  /**
   * Evaluates the best 5-card poker hand from given cards
   *
   * @param {Card[]} cards - Array of cards (typically 7 for Texas Hold'em)
   * @returns {HandEvaluation} Best hand evaluation result
   *
   * @example
   * const result = PokerHandEvaluator.evaluate(sevenCards);
   * console.log(result.rankName); // "Full House"
   * console.log(result.description); // "Full House, Aces over Kings"
   */
  static evaluate(cards) {
    if (!cards || cards.length < 5) {
      throw new Error('PokerHandEvaluator: at least 5 cards required');
    }

    // For 5 cards, evaluate directly
    if (cards.length === 5) {
      return this._evaluateFiveCards(cards);
    }

    // For more than 5 cards, find best combination
    return this._findBestHand(cards);
  }

  /**
   * Compares two poker hands
   *
   * @param {HandEvaluation} hand1 - First hand evaluation
   * @param {HandEvaluation} hand2 - Second hand evaluation
   * @returns {number} -1 if hand1 loses, 0 if tie, 1 if hand1 wins
   */
  static compareHands(hand1, hand2) {
    // Compare by rank first
    if (hand1.rank !== hand2.rank) {
      return hand1.rank > hand2.rank ? 1 : -1;
    }

    // Same rank, compare primary values
    for (let i = 0; i < hand1.primaryValues.length; i++) {
      if (hand1.primaryValues[i] !== hand2.primaryValues[i]) {
        return hand1.primaryValues[i] > hand2.primaryValues[i] ? 1 : -1;
      }
    }

    // Compare kickers
    for (let i = 0; i < hand1.kickers.length; i++) {
      if (i >= hand2.kickers.length) break;
      if (hand1.kickers[i] !== hand2.kickers[i]) {
        return hand1.kickers[i] > hand2.kickers[i] ? 1 : -1;
      }
    }

    return 0; // Perfect tie
  }

  /**
   * Finds best 5-card hand from more than 5 cards
   * @private
   */
  static _findBestHand(cards) {
    const combinations = this._getCombinations(cards, 5);
    let bestHand = null;

    for (const combo of combinations) {
      const evaluation = this._evaluateFiveCards(combo);

      if (!bestHand || this.compareHands(evaluation, bestHand) > 0) {
        bestHand = evaluation;
      }
    }

    return bestHand;
  }

  /**
   * Evaluates exactly 5 cards
   * @private
   */
  static _evaluateFiveCards(cards) {
    if (cards.length !== 5) {
      throw new Error('_evaluateFiveCards requires exactly 5 cards');
    }

    // Sort by value descending
    const sorted = [...cards].sort((a, b) => b.value - a.value);

    // Check each hand type from best to worst
    let result;

    result = this._checkRoyalFlush(sorted);
    if (result) return result;

    result = this._checkStraightFlush(sorted);
    if (result) return result;

    result = this._checkFourOfKind(sorted);
    if (result) return result;

    result = this._checkFullHouse(sorted);
    if (result) return result;

    result = this._checkFlush(sorted);
    if (result) return result;

    result = this._checkStraight(sorted);
    if (result) return result;

    result = this._checkThreeOfKind(sorted);
    if (result) return result;

    result = this._checkTwoPair(sorted);
    if (result) return result;

    result = this._checkOnePair(sorted);
    if (result) return result;

    return this._checkHighCard(sorted);
  }

  /**
   * Checks for Royal Flush (A-K-Q-J-10 of same suit)
   * @private
   */
  static _checkRoyalFlush(cards) {
    const flush = this._isFlush(cards);
    if (!flush) return null;

    const straight = this._isStraight(cards);
    if (!straight) return null;

    // Check if it's A-K-Q-J-10
    if (cards[0].value === 14 && cards[4].value === 10) {
      return {
        rank: POKER_HAND_RANKS.ROYAL_FLUSH,
        rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.ROYAL_FLUSH],
        cards: [...cards],
        primaryValues: [14],
        kickers: [],
        description: `Royal Flush of ${flush.suit}`
      };
    }

    return null;
  }

  /**
   * Checks for Straight Flush
   * @private
   */
  static _checkStraightFlush(cards) {
    const flush = this._isFlush(cards);
    if (!flush) return null;

    const straight = this._isStraight(cards);
    if (!straight) return null;

    return {
      rank: POKER_HAND_RANKS.STRAIGHT_FLUSH,
      rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.STRAIGHT_FLUSH],
      cards: [...cards],
      primaryValues: [straight.highCard],
      kickers: [],
      description: `Straight Flush, ${cards[0].rank} high`
    };
  }

  /**
   * Checks for Four of a Kind
   * @private
   */
  static _checkFourOfKind(cards) {
    const groups = this._groupByRank(cards);

    for (const [rank, rankCards] of Object.entries(groups)) {
      if (rankCards.length === 4) {
        const kicker = cards.find(c => c.rank !== rank);

        return {
          rank: POKER_HAND_RANKS.FOUR_OF_A_KIND,
          rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.FOUR_OF_A_KIND],
          cards: [...rankCards, kicker],
          primaryValues: [rankCards[0].value],
          kickers: [kicker.value],
          description: `Four of a Kind, ${this._pluralizeRank(rank)}`
        };
      }
    }

    return null;
  }

  /**
   * Checks for Full House (three of a kind + pair)
   * @private
   */
  static _checkFullHouse(cards) {
    const groups = this._groupByRank(cards);
    let threeKind = null;
    let pair = null;

    // Find three of a kind and pair
    for (const rankCards of Object.values(groups)) {
      if (rankCards.length === 3 && !threeKind) {
        threeKind = rankCards;
      } else if (rankCards.length === 2 && !pair) {
        pair = rankCards;
      }
    }

    if (threeKind && pair) {
      return {
        rank: POKER_HAND_RANKS.FULL_HOUSE,
        rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.FULL_HOUSE],
        cards: [...threeKind, ...pair],
        primaryValues: [threeKind[0].value, pair[0].value],
        kickers: [],
        description: `Full House, ${this._pluralizeRank(threeKind[0].rank)} over ${this._pluralizeRank(pair[0].rank)}`
      };
    }

    return null;
  }

  /**
   * Checks for Flush (5 cards of same suit)
   * @private
   */
  static _checkFlush(cards) {
    const flush = this._isFlush(cards);
    if (!flush) return null;

    return {
      rank: POKER_HAND_RANKS.FLUSH,
      rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.FLUSH],
      cards: [...cards],
      primaryValues: cards.map(c => c.value),
      kickers: [],
      description: `Flush, ${cards[0].rank} high`
    };
  }

  /**
   * Checks for Straight (5 consecutive cards)
   * @private
   */
  static _checkStraight(cards) {
    const straight = this._isStraight(cards);
    if (!straight) return null;

    return {
      rank: POKER_HAND_RANKS.STRAIGHT,
      rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.STRAIGHT],
      cards: straight.isLowAce ?
        [cards[1], cards[2], cards[3], cards[4], cards[0]] : // A-2-3-4-5, put ace last
        [...cards],
      primaryValues: [straight.highCard],
      kickers: [],
      description: `Straight, ${straight.isLowAce ? '5' : cards[0].rank} high`
    };
  }

  /**
   * Checks for Three of a Kind
   * @private
   */
  static _checkThreeOfKind(cards) {
    const groups = this._groupByRank(cards);

    for (const [rank, rankCards] of Object.entries(groups)) {
      if (rankCards.length === 3) {
        const kickers = cards
          .filter(c => c.rank !== rank)
          .sort((a, b) => b.value - a.value);

        return {
          rank: POKER_HAND_RANKS.THREE_OF_A_KIND,
          rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.THREE_OF_A_KIND],
          cards: [...rankCards, ...kickers],
          primaryValues: [rankCards[0].value],
          kickers: kickers.map(c => c.value),
          description: `Three of a Kind, ${this._pluralizeRank(rank)}`
        };
      }
    }

    return null;
  }

  /**
   * Checks for Two Pair
   * @private
   */
  static _checkTwoPair(cards) {
    const groups = this._groupByRank(cards);
    const pairs = [];

    for (const rankCards of Object.values(groups)) {
      if (rankCards.length === 2) {
        pairs.push(rankCards);
      }
    }

    if (pairs.length >= 2) {
      // Sort pairs by value
      pairs.sort((a, b) => b[0].value - a[0].value);

      const topPairs = pairs.slice(0, 2);
      const kicker = cards.find(c =>
        c.rank !== topPairs[0][0].rank && c.rank !== topPairs[1][0].rank
      );

      return {
        rank: POKER_HAND_RANKS.TWO_PAIR,
        rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.TWO_PAIR],
        cards: [...topPairs[0], ...topPairs[1], kicker],
        primaryValues: [topPairs[0][0].value, topPairs[1][0].value],
        kickers: [kicker.value],
        description: `Two Pair, ${this._pluralizeRank(topPairs[0][0].rank)} and ${this._pluralizeRank(topPairs[1][0].rank)}`
      };
    }

    return null;
  }

  /**
   * Checks for One Pair
   * @private
   */
  static _checkOnePair(cards) {
    const groups = this._groupByRank(cards);

    for (const [rank, rankCards] of Object.entries(groups)) {
      if (rankCards.length === 2) {
        const kickers = cards
          .filter(c => c.rank !== rank)
          .sort((a, b) => b.value - a.value);

        return {
          rank: POKER_HAND_RANKS.ONE_PAIR,
          rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.ONE_PAIR],
          cards: [...rankCards, ...kickers],
          primaryValues: [rankCards[0].value],
          kickers: kickers.map(c => c.value),
          description: `Pair of ${this._pluralizeRank(rank)}`
        };
      }
    }

    return null;
  }

  /**
   * Checks for High Card (no other hand)
   * @private
   */
  static _checkHighCard(cards) {
    return {
      rank: POKER_HAND_RANKS.HIGH_CARD,
      rankName: POKER_HAND_NAMES[POKER_HAND_RANKS.HIGH_CARD],
      cards: [...cards],
      primaryValues: [cards[0].value],
      kickers: cards.slice(1).map(c => c.value),
      description: `High Card, ${cards[0].rank}`
    };
  }

  /**
   * Checks if cards form a flush
   * @private
   */
  static _isFlush(cards) {
    const suit = cards[0].suit;
    if (cards.every(c => c.suit === suit)) {
      return { suit };
    }
    return null;
  }

  /**
   * Checks if cards form a straight
   * @private
   */
  static _isStraight(cards) {
    // Check regular straight (consecutive values)
    let isConsecutive = true;
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].value !== cards[i - 1].value - 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive) {
      return { highCard: cards[0].value, isLowAce: false };
    }

    // Check for A-2-3-4-5 (wheel/low straight)
    if (cards[0].value === 14 && // Ace
        cards[1].value === 5 &&
        cards[2].value === 4 &&
        cards[3].value === 3 &&
        cards[4].value === 2) {
      return { highCard: 5, isLowAce: true };
    }

    return null;
  }

  /**
   * Groups cards by rank
   * @private
   */
  static _groupByRank(cards) {
    const groups = {};

    for (const card of cards) {
      if (!groups[card.rank]) {
        groups[card.rank] = [];
      }
      groups[card.rank].push(card);
    }

    return groups;
  }

  /**
   * Pluralizes rank name for descriptions
   * @private
   */
  static _pluralizeRank(rank) {
    const rankNames = {
      'A': 'Aces',
      'K': 'Kings',
      'Q': 'Queens',
      'J': 'Jacks',
      '10': 'Tens',
      '9': 'Nines',
      '8': 'Eights',
      '7': 'Sevens',
      '6': 'Sixes',
      '5': 'Fives',
      '4': 'Fours',
      '3': 'Threes',
      '2': 'Twos'
    };
    return rankNames[rank] || `${rank}s`;
  }

  /**
   * Gets all combinations of k cards from array
   * @private
   */
  static _getCombinations(arr, k) {
    if (k === 1) return arr.map(item => [item]);
    if (k === arr.length) return [arr];

    const combinations = [];

    for (let i = 0; i <= arr.length - k; i++) {
      const head = arr[i];
      const tailCombos = this._getCombinations(arr.slice(i + 1), k - 1);

      for (const tail of tailCombos) {
        combinations.push([head, ...tail]);
      }
    }

    return combinations;
  }

  /**
   * Gets a human-readable description of the hand
   *
   * @param {HandEvaluation} evaluation - Hand evaluation result
   * @returns {string} Description string
   */
  static describeHand(evaluation) {
    return evaluation.description;
  }

  /**
   * Determines winner(s) from multiple hand evaluations
   *
   * @param {HandEvaluation[]} hands - Array of hand evaluations
   * @returns {number[]} Array of winning hand indices (multiple for ties)
   */
  static determineWinners(hands) {
    if (!hands || hands.length === 0) {
      return [];
    }

    if (hands.length === 1) {
      return [0];
    }

    let bestHandIndices = [0];
    let bestHand = hands[0];

    for (let i = 1; i < hands.length; i++) {
      const comparison = this.compareHands(hands[i], bestHand);

      if (comparison > 0) {
        // New best hand
        bestHandIndices = [i];
        bestHand = hands[i];
      } else if (comparison === 0) {
        // Tie
        bestHandIndices.push(i);
      }
    }

    return bestHandIndices;
  }
}

/**
 * @typedef {Object} HandEvaluation
 * @property {number} rank - Hand rank (0-9)
 * @property {string} rankName - Human-readable rank name
 * @property {Card[]} cards - The 5 cards that make up this hand
 * @property {number[]} primaryValues - Primary card values for comparison
 * @property {number[]} kickers - Kicker card values for tiebreaking
 * @property {string} description - Human-readable description
 */
