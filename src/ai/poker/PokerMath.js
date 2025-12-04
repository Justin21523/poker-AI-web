/**
 * @fileoverview Poker mathematics and probability calculations
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Mathematical utilities for poker AI including:
 * - Hand strength evaluation
 * - Equity calculation (Monte Carlo simulation)
 * - Pot odds and implied odds
 * - Draw detection (flush draws, straight draws)
 * - Outs calculation
 */

import { PokerHandEvaluator } from '../../games/poker/PokerHandEvaluator.js';
import { Card } from '../../core/cards/Card.js';
import { Deck } from '../../core/cards/Deck.js';

/**
 * Starting hand rankings (David Sklansky groups 1-9)
 * Lower group number = stronger hand
 */
const STARTING_HAND_GROUPS = {
  1: ['AA', 'KK', 'QQ', 'JJ', 'AKs'],
  2: ['TT', 'AQs', 'AJs', 'KQs', 'AK'],
  3: ['99', 'JTs', 'QJs', 'KJs', 'ATs', 'AQ'],
  4: ['T9s', 'KQ', 'QTs', 'J9s', 'AJ', '88', 'KTs'],
  5: ['77', 'Q9s', 'K9s', 'AT', 'QJ', 'JT', '66', 'T8s', '98s', 'J8s', 'ATs', 'Q8s'],
  6: ['55', '44', '33', '22', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'Q7s'],
  7: ['KJ', 'KT', 'QT', 'J9', 'T9', '98', '87s', '76s', '65s', '54s', 'K9', 'Q9'],
  8: ['J8', 'J7s', 'T7s', '97s', '87', '86s', '76', '75s', '65', '54', 'K8', 'K7', 'Q8'],
  9: ['J6s', 'J5s', 'J4s', 'J3s', 'J2s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s', '96s', '95s', '94s', '93s', '92s', '85s', '84s', '83s', '82s']
};

/**
 * Poker mathematics and probability calculations
 */
export class PokerMath {
  /**
   * Evaluate hand strength from 0 to 1
   * 0 = weakest possible hand
   * 1 = strongest possible hand (relative to situation)
   *
   * @param {Card[]} holeCards - Player's 2 hole cards
   * @param {Card[]} communityCards - Community cards (0-5)
   * @returns {number} Hand strength from 0 to 1
   */
  static evaluateHandStrength(holeCards, communityCards = []) {
    const allCards = [...holeCards, ...communityCards];

    if (allCards.length < 2) {
      return 0;
    }

    // Pre-flop: use starting hand rankings
    if (communityCards.length === 0) {
      const handString = this._getHandString(holeCards[0], holeCards[1]);
      return this._getStartingHandStrength(handString);
    }

    // Post-flop: evaluate using hand evaluator
    if (allCards.length >= 5) {
      const evaluation = PokerHandEvaluator.evaluate(allCards);
      // Normalize rank to 0-1 (rank 0 = high card → 0.1, rank 9 = royal flush → 1.0)
      return (evaluation.rank + 1) / 10;
    }

    // Flop (3 community cards): estimate strength based on current hand + potential
    const evaluation = PokerHandEvaluator.evaluate([...allCards, ...this._createDummyCards(5 - allCards.length)]);
    return evaluation.rank / 10;
  }

  /**
   * Calculate equity (win probability) using Monte Carlo simulation
   *
   * @param {Card[]} holeCards - Player's hole cards
   * @param {Card[]} communityCards - Current community cards
   * @param {number} numOpponents - Number of opponents
   * @param {number} iterations - Number of simulations (default: 1000)
   * @returns {number} Equity from 0 to 1
   */
  static calculateEquity(holeCards, communityCards = [], numOpponents = 1, iterations = 1000) {
    if (holeCards.length !== 2) {
      throw new Error('Must have exactly 2 hole cards');
    }

    let wins = 0;
    let ties = 0;

    // Create a deck excluding known cards
    const knownCards = [...holeCards, ...communityCards];
    const deck = this._createDeckExcluding(knownCards);

    for (let i = 0; i < iterations; i++) {
      // Shuffle deck
      this._shuffleArray(deck);

      // Deal remaining community cards
      const simCommunity = [...communityCards];
      let deckIndex = 0;
      while (simCommunity.length < 5) {
        simCommunity.push(deck[deckIndex++]);
      }

      // Deal opponent hands
      const opponentHands = [];
      for (let j = 0; j < numOpponents; j++) {
        opponentHands.push([deck[deckIndex++], deck[deckIndex++]]);
      }

      // Evaluate all hands
      const playerHand = PokerHandEvaluator.evaluate([...holeCards, ...simCommunity]);
      const opponentEvals = opponentHands.map(hand =>
        PokerHandEvaluator.evaluate([...hand, ...simCommunity])
      );

      // Determine result
      const allHands = [playerHand, ...opponentEvals];
      const winners = PokerHandEvaluator.determineWinners(allHands);

      if (winners.length === 1 && winners[0] === 0) {
        wins++;
      } else if (winners.includes(0)) {
        ties++;
      }
    }

    return (wins + ties / 2) / iterations;
  }

  /**
   * Calculate pot odds
   *
   * @param {number} potSize - Current pot size
   * @param {number} callAmount - Amount to call
   * @returns {number} Pot odds as a ratio (e.g., 3 means 3:1)
   */
  static calculatePotOdds(potSize, callAmount) {
    if (callAmount === 0) return Infinity;
    return potSize / callAmount;
  }

  /**
   * Calculate implied odds
   * Estimates additional chips that can be won on future streets
   *
   * @param {number} potSize - Current pot size
   * @param {number} callAmount - Amount to call
   * @param {number} stackDepth - Effective stack depth
   * @param {number} impliedFactor - Multiplier for potential future bets (default: 1.5)
   * @returns {number} Implied odds ratio
   */
  static calculateImpliedOdds(potSize, callAmount, stackDepth, impliedFactor = 1.5) {
    if (callAmount === 0) return Infinity;
    const potentialWinnings = stackDepth * impliedFactor;
    return (potSize + potentialWinnings) / callAmount;
  }

  /**
   * Determine if a call is profitable based on equity and pot odds
   *
   * @param {number} equity - Win probability (0-1)
   * @param {number} potOdds - Pot odds ratio
   * @returns {boolean} True if call is profitable
   */
  static shouldCallBasedOnOdds(equity, potOdds) {
    const requiredEquity = 1 / (potOdds + 1);
    return equity >= requiredEquity;
  }

  /**
   * Find flush draw in hand
   *
   * @param {Card[]} cards - All available cards
   * @returns {Object|null} Flush draw info or null
   */
  static findFlushDraw(cards) {
    const suitCounts = {};
    cards.forEach(card => {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });

    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count === 4) {
        return {
          type: 'flush_draw',
          suit: suit,
          outs: 9, // 13 cards of suit - 4 already seen = 9 outs
          probability: 9 / 47 // Approximate
        };
      }
    }

    return null;
  }

  /**
   * Find straight draw in hand
   *
   * @param {Card[]} cards - All available cards
   * @returns {Object|null} Straight draw info or null
   */
  static findStraightDraw(cards) {
    const values = cards.map(card => card.value).sort((a, b) => a - b);
    const uniqueValues = [...new Set(values)];

    // Need at least 4 cards for a straight draw
    if (uniqueValues.length < 4) {
      return null;
    }

    // Check if already have a straight (5 consecutive values)
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
        return null; // Already a made straight, not a draw
      }
    }

    // Check for open-ended straight draw (8 outs)
    // Need 4 consecutive values
    for (let i = 0; i <= uniqueValues.length - 4; i++) {
      if (uniqueValues[i + 3] - uniqueValues[i] === 3) {
        return {
          type: 'open_ended_straight_draw',
          outs: 8,
          probability: 8 / 47
        };
      }
    }

    // Check for gutshot straight draw (4 outs)
    // Need 4 cards spanning 5 consecutive values with exactly one missing card in the middle
    // Example: 9-8-6-5 (missing 7) or J-10-8-7 (missing 9)
    for (let i = 0; i <= uniqueValues.length - 4; i++) {
      const fourCards = uniqueValues.slice(i, i + 4);
      const span = fourCards[3] - fourCards[0];

      // If 4 cards span 5 values (difference of 4), there's exactly one missing
      if (span === 4) {
        // Check if there's exactly one gap (one pair of adjacent cards has gap > 1)
        let gapCount = 0;
        for (let j = 0; j < 3; j++) {
          if (fourCards[j + 1] - fourCards[j] > 1) {
            gapCount++;
          }
        }

        // Exactly one gap means it's a gutshot
        if (gapCount === 1) {
          return {
            type: 'gutshot_straight_draw',
            outs: 4,
            probability: 4 / 47
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate total outs for improving hand
   *
   * @param {Card[]} holeCards - Player's hole cards
   * @param {Card[]} communityCards - Community cards
   * @returns {number} Number of outs
   */
  static calculateOuts(holeCards, communityCards) {
    let outs = 0;

    const allCards = [...holeCards, ...communityCards];

    // Check for flush draw
    const flushDraw = this.findFlushDraw(allCards);
    if (flushDraw) {
      outs += flushDraw.outs;
    }

    // Check for straight draw
    const straightDraw = this.findStraightDraw(allCards);
    if (straightDraw) {
      outs += straightDraw.outs;
    }

    return outs;
  }

  /**
   * Get starting hand rank (1-9, Sklansky groups)
   *
   * @param {Card} card1 - First hole card
   * @param {Card} card2 - Second hole card
   * @returns {number} Group number (1 = best, 9 = worst)
   */
  static getStartingHandRank(card1, card2) {
    const handString = this._getHandString(card1, card2);

    for (let group = 1; group <= 9; group++) {
      if (STARTING_HAND_GROUPS[group].includes(handString)) {
        return group;
      }
    }

    return 9; // Worst group if not found
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get hand string representation (e.g., "AKs", "QQ", "T9o")
   * @private
   */
  static _getHandString(card1, card2) {
    // Convert rank to single character
    const rankToChar = (rank) => {
      if (rank === '10') return 'T';
      return rank;
    };

    const rank1 = rankToChar(card1.rank);
    const rank2 = rankToChar(card2.rank);
    const suited = card1.suit === card2.suit;

    // Order by value (higher first)
    const orderedRanks = card1.value > card2.value ?
      [rank1, rank2] : [rank2, rank1];

    const handString = orderedRanks.join('');

    if (card1.rank === card2.rank) {
      return handString; // Pair (e.g., "AA", "TT")
    }

    return handString + (suited ? 's' : ''); // Add 's' for suited, nothing for offsuit
  }

  /**
   * Get starting hand strength (0-1) based on Sklansky groups
   * @private
   */
  static _getStartingHandStrength(handString) {
    for (let group = 1; group <= 9; group++) {
      if (STARTING_HAND_GROUPS[group].includes(handString)) {
        // Group 1 = 1.0, Group 9 = ~0.1
        return 1 - ((group - 1) / 9);
      }
    }
    return 0.1; // Default for unranked hands
  }

  /**
   * Create dummy cards for incomplete boards
   * @private
   */
  static _createDummyCards(count) {
    const dummies = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    for (let i = 0; i < count; i++) {
      dummies.push(new Card(suits[i % 4], '2'));
    }
    return dummies;
  }

  /**
   * Create a deck excluding specific cards
   * @private
   */
  static _createDeckExcluding(excludedCards) {
    const deck = [];
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    const excludedSet = new Set(
      excludedCards.map(card => `${card.rank}${card.suit}`)
    );

    for (const suit of suits) {
      for (const rank of ranks) {
        const cardId = `${rank}${suit}`;
        if (!excludedSet.has(cardId)) {
          deck.push(new Card(suit, rank));
        }
      }
    }

    return deck;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * @private
   */
  static _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
