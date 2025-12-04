/**
 * @fileoverview Decision engine for poker AI
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Core decision-making system that combines:
 * - Hand strength evaluation (PokerMath)
 * - Opponent modeling (OpponentModeler)
 * - Expected value calculation
 * - Personality modifiers
 * - Strategic adjustments
 *
 * Decision Pipeline:
 * 1. Evaluate hand strength
 * 2. Calculate equity
 * 3. Compute pot odds
 * 4. Analyze opponents
 * 5. Calculate EV for each action
 * 6. Apply personality modifiers
 * 7. Add controlled randomness
 * 8. Select optimal action
 */

import { PokerMath } from '../poker/PokerMath.js';

/**
 * Action types
 */
export const ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  BET: 'bet',
  RAISE: 'raise',
  ALL_IN: 'all-in'
};

/**
 * Personality types
 */
export const PERSONALITIES = {
  AGGRESSIVE: 'aggressive',
  CAUTIOUS: 'cautious',
  BALANCED: 'balanced',
  TRICKY: 'tricky'
};

/**
 * Difficulty levels
 */
export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert'
};

/**
 * DecisionEngine - Core AI decision making
 */
export class DecisionEngine {
  /**
   * Create decision engine
   * @param {Object} config - Configuration
   * @param {string} config.personality - Personality type (default: 'balanced')
   * @param {string} config.difficulty - Difficulty level (default: 'medium')
   * @param {number} config.randomness - Randomness factor 0-1 (default: 0.1)
   * @param {number} config.bluffFrequency - Bluff frequency 0-1 (default: 0.15)
   */
  constructor(config = {}) {
    this.config = {
      personality: config.personality || PERSONALITIES.BALANCED,
      difficulty: config.difficulty || DIFFICULTY.MEDIUM,
      randomness: config.randomness !== undefined ? config.randomness : 0.1,
      bluffFrequency: config.bluffFrequency !== undefined ? config.bluffFrequency : 0.15
    };

    // Personality modifiers
    this.personalityModifiers = this._getPersonalityModifiers();
  }

  /**
   * Make decision for given game state
   * @param {Object} gameState - Current game state
   * @param {Card[]} gameState.holeCards - Player's hole cards
   * @param {Card[]} gameState.communityCards - Community cards
   * @param {number} gameState.pot - Current pot size
   * @param {number} gameState.currentBet - Current bet to call
   * @param {number} gameState.ourBet - Our current bet this round
   * @param {number} gameState.chips - Our chip stack
   * @param {number} gameState.minRaise - Minimum raise amount
   * @param {string[]} gameState.legalActions - Legal actions
   * @param {string} gameState.phase - Game phase
   * @param {string} gameState.position - Our position
   * @param {Object} context - Additional context
   * @param {Object} context.opponentModeler - Opponent modeling system
   * @param {Object} context.memory - Memory system
   * @returns {Object} Decision with action and amount
   */
  async makeDecision(gameState, context = {}) {
    // Step 1: Evaluate hand strength
    const handStrength = PokerMath.evaluateHandStrength(
      gameState.holeCards,
      gameState.communityCards
    );

    // Step 2: Calculate equity (if post-flop)
    let equity = handStrength;
    if (gameState.communityCards.length >= 3) {
      equity = PokerMath.calculateEquity(
        gameState.holeCards,
        gameState.communityCards,
        this._estimateActiveOpponents(gameState),
        100 // Quick simulation for real-time decisions
      );
    }

    // Step 3: Calculate pot odds
    const callAmount = gameState.currentBet - gameState.ourBet;
    const potOdds = callAmount > 0
      ? PokerMath.calculatePotOdds(gameState.pot, callAmount)
      : Infinity;

    // Step 4: Analyze opponents (if available)
    let opponentAggression = 0.5;
    let foldProbability = 0.5;

    if (context.opponentModeler && gameState.lastRaiserId) {
      const profile = context.opponentModeler.getProfile(gameState.lastRaiserId);
      if (profile) {
        opponentAggression = profile.stats.aggression / 5; // Normalize to 0-1
        foldProbability = profile.calculateFoldProbability(
          (gameState.minRaise || callAmount) / gameState.pot
        );
      }
    }

    // Step 5: Calculate EV for each legal action
    const actionEVs = {};

    for (const action of gameState.legalActions) {
      actionEVs[action] = this._calculateActionEV(action, {
        handStrength,
        equity,
        potOdds,
        callAmount,
        pot: gameState.pot,
        chips: gameState.chips,
        minRaise: gameState.minRaise,
        phase: gameState.phase,
        position: gameState.position,
        opponentAggression,
        foldProbability
      });
    }

    // Step 6: Apply personality modifiers
    this._applyPersonalityModifiers(actionEVs, {
      handStrength,
      equity,
      phase: gameState.phase
    });

    // Step 7: Apply difficulty adjustments
    this._applyDifficultyAdjustments(actionEVs, {
      handStrength,
      equity,
      potOdds
    });

    // Step 8: Add controlled randomness
    if (this.config.randomness > 0) {
      this._addRandomness(actionEVs, this.config.randomness);
    }

    // Step 9: Select best action
    const decision = this._selectAction(actionEVs, gameState);

    return {
      action: decision.action,
      amount: decision.amount,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      expectedValue: decision.ev,
      handStrength,
      equity
    };
  }

  /**
   * Calculate expected value for an action
   * @param {string} action - Action type
   * @param {Object} context - Context data
   * @returns {number} Expected value
   * @private
   */
  _calculateActionEV(action, context) {
    const {
      handStrength,
      equity,
      potOdds,
      callAmount,
      pot,
      chips,
      minRaise,
      phase,
      opponentAggression,
      foldProbability
    } = context;

    switch (action) {
      case ACTIONS.FOLD:
        return 0; // Folding always has EV of 0

      case ACTIONS.CHECK:
        // Check has positive EV if we can see next card for free
        return equity * pot * 0.5; // Conservative estimate

      case ACTIONS.CALL:
        // EV = (equity * pot_after_call) - call_amount
        if (callAmount === 0) return 0;
        const shouldCall = PokerMath.shouldCallBasedOnOdds(equity, potOdds);
        if (shouldCall) {
          return (equity * (pot + callAmount * 2)) - callAmount;
        }
        return -callAmount * 0.5; // Negative EV for bad calls

      case ACTIONS.BET:
      case ACTIONS.RAISE:
        // EV = (fold_prob * pot) + ((1 - fold_prob) * (equity * pot_after_raise - raise_amount))
        const raiseAmount = minRaise || pot * 0.5;
        const potAfterRaise = pot + raiseAmount * 2;

        // Value betting with strong hand
        if (handStrength > 0.7 || equity > 0.6) {
          return (foldProbability * pot) +
                 ((1 - foldProbability) * (equity * potAfterRaise - raiseAmount));
        }

        // Bluffing with weak hand
        if (handStrength < 0.3 && foldProbability > 0.5) {
          return (foldProbability * pot) - ((1 - foldProbability) * raiseAmount);
        }

        // Semi-bluff with drawing hand
        if (handStrength < 0.5 && equity > 0.35) {
          return (foldProbability * pot * 0.7) +
                 ((1 - foldProbability) * (equity * potAfterRaise - raiseAmount) * 0.8);
        }

        return -raiseAmount * 0.3; // Conservative negative for unclear situations

      case ACTIONS.ALL_IN:
        // All-in is high risk, high reward
        if (handStrength > 0.8 || equity > 0.7) {
          // Strong hand - go for value
          return equity * (pot + chips * 2) - chips;
        } else if (foldProbability > 0.7 && pot > chips * 0.5) {
          // Bluff all-in with high fold equity
          return foldProbability * pot - chips * 0.5;
        }
        return -chips * 0.5; // Very negative for weak all-ins

      default:
        return 0;
    }
  }

  /**
   * Apply personality modifiers to action EVs
   * @param {Object} actionEVs - Action expected values
   * @param {Object} context - Context data
   * @private
   */
  _applyPersonalityModifiers(actionEVs, context) {
    const { handStrength, equity, phase } = context;
    const mods = this.personalityModifiers;

    // Apply modifiers
    if (actionEVs[ACTIONS.RAISE]) {
      actionEVs[ACTIONS.RAISE] *= mods.aggression;
    }
    if (actionEVs[ACTIONS.BET]) {
      actionEVs[ACTIONS.BET] *= mods.aggression;
    }
    if (actionEVs[ACTIONS.CALL]) {
      actionEVs[ACTIONS.CALL] *= mods.caution;
    }
    if (actionEVs[ACTIONS.FOLD]) {
      actionEVs[ACTIONS.FOLD] *= mods.caution;
    }

    // Tricky personality: occasionally make unexpected plays
    if (this.config.personality === PERSONALITIES.TRICKY) {
      if (handStrength > 0.8 && Math.random() < 0.3) {
        // Slow play strong hands
        if (actionEVs[ACTIONS.CHECK]) {
          actionEVs[ACTIONS.CHECK] *= 1.5;
        }
        if (actionEVs[ACTIONS.CALL]) {
          actionEVs[ACTIONS.CALL] *= 1.3;
        }
      }

      if (handStrength < 0.3 && Math.random() < this.config.bluffFrequency) {
        // Bluff more with weak hands
        if (actionEVs[ACTIONS.RAISE]) {
          actionEVs[ACTIONS.RAISE] *= 1.8;
        }
        if (actionEVs[ACTIONS.BET]) {
          actionEVs[ACTIONS.BET] *= 1.8;
        }
      }
    }
  }

  /**
   * Apply difficulty adjustments
   * @param {Object} actionEVs - Action expected values
   * @param {Object} context - Context data
   * @private
   */
  _applyDifficultyAdjustments(actionEVs, context) {
    const { handStrength, equity, potOdds } = context;

    switch (this.config.difficulty) {
      case DIFFICULTY.EASY:
        // Easy: Make more mistakes, less optimal
        // Overvalue calling
        if (actionEVs[ACTIONS.CALL]) {
          actionEVs[ACTIONS.CALL] *= 1.3;
        }
        // Undervalue folding weak hands
        if (handStrength < 0.3 && actionEVs[ACTIONS.FOLD]) {
          actionEVs[ACTIONS.FOLD] *= 0.7;
        }
        break;

      case DIFFICULTY.MEDIUM:
        // Medium: Occasionally make mistakes
        if (Math.random() < 0.2) {
          const randomAction = Object.keys(actionEVs)[
            Math.floor(Math.random() * Object.keys(actionEVs).length)
          ];
          actionEVs[randomAction] *= 1.2;
        }
        break;

      case DIFFICULTY.HARD:
        // Hard: Play near-optimal, minor mistakes
        // Correctly value pot odds
        if (actionEVs[ACTIONS.CALL] && potOdds < Infinity) {
          const requiredEquity = 1 / (potOdds + 1);
          if (equity < requiredEquity) {
            actionEVs[ACTIONS.CALL] *= 0.6;
          }
        }
        break;

      case DIFFICULTY.EXPERT:
        // Expert: Optimal play, advanced strategies
        // Exploit opponent tendencies more
        // Correctly value implied odds
        // Make optimal bluffs
        if (actionEVs[ACTIONS.RAISE] && handStrength < 0.3) {
          // Better bluff detection/execution
          actionEVs[ACTIONS.RAISE] *= 1.2;
        }
        break;
    }
  }

  /**
   * Add controlled randomness to prevent predictability
   * @param {Object} actionEVs - Action expected values
   * @param {number} randomnessFactor - Randomness factor (0-1)
   * @private
   */
  _addRandomness(actionEVs, randomnessFactor) {
    for (const action in actionEVs) {
      const variance = (Math.random() - 0.5) * randomnessFactor * 2;
      actionEVs[action] *= (1 + variance);
    }
  }

  /**
   * Select action based on EVs
   * @param {Object} actionEVs - Action expected values
   * @param {Object} gameState - Game state
   * @returns {Object} Selected action with details
   * @private
   */
  _selectAction(actionEVs, gameState) {
    // Find action with highest EV
    let bestAction = null;
    let bestEV = -Infinity;

    for (const [action, ev] of Object.entries(actionEVs)) {
      if (ev > bestEV) {
        bestEV = ev;
        bestAction = action;
      }
    }

    // Determine amount for betting actions
    let amount = 0;
    if (bestAction === ACTIONS.CALL) {
      amount = gameState.currentBet - gameState.ourBet;
    } else if (bestAction === ACTIONS.RAISE || bestAction === ACTIONS.BET) {
      // Determine raise size based on situation
      amount = this._calculateRaiseSize(gameState, bestEV);
    } else if (bestAction === ACTIONS.ALL_IN) {
      amount = gameState.chips;
    }

    // Generate reasoning
    const reasoning = this._generateReasoning(bestAction, bestEV, gameState);

    // Calculate confidence (based on EV difference from next best)
    const sortedEVs = Object.values(actionEVs).sort((a, b) => b - a);
    const confidence = sortedEVs.length > 1
      ? Math.min(1, Math.abs(sortedEVs[0] - sortedEVs[1]) / Math.max(Math.abs(sortedEVs[0]), 1))
      : 1;

    return {
      action: bestAction,
      amount,
      ev: bestEV,
      reasoning,
      confidence
    };
  }

  /**
   * Calculate raise size based on situation
   * @param {Object} gameState - Game state
   * @param {number} ev - Expected value
   * @returns {number} Raise amount
   * @private
   */
  _calculateRaiseSize(gameState, ev) {
    const { pot, minRaise, chips } = gameState;

    // Base raise: minimum or 50% pot
    let raiseSize = Math.max(minRaise || pot * 0.5, pot * 0.5);

    // Adjust based on EV
    if (ev > pot) {
      // Very strong - bet bigger
      raiseSize = Math.min(pot * 0.75, chips);
    } else if (ev > pot * 0.5) {
      // Strong - standard bet
      raiseSize = Math.min(pot * 0.6, chips);
    } else if (ev > 0) {
      // Moderate - smaller bet
      raiseSize = Math.min(pot * 0.4, chips);
    }

    // Ensure within legal range
    raiseSize = Math.max(minRaise || 0, Math.min(raiseSize, chips));

    return Math.round(raiseSize);
  }

  /**
   * Generate reasoning for decision
   * @param {string} action - Selected action
   * @param {number} ev - Expected value
   * @param {Object} gameState - Game state
   * @returns {string} Reasoning text
   * @private
   */
  _generateReasoning(action, ev, gameState) {
    const reasons = [];

    if (action === ACTIONS.FOLD) {
      reasons.push('Hand strength insufficient');
      if (gameState.currentBet > gameState.pot) {
        reasons.push('Bet too large relative to pot');
      }
    } else if (action === ACTIONS.CHECK) {
      reasons.push('No bet to call, conserving chips');
    } else if (action === ACTIONS.CALL) {
      reasons.push('Pot odds favorable');
      if (ev > 0) {
        reasons.push('Positive expected value');
      }
    } else if (action === ACTIONS.RAISE || action === ACTIONS.BET) {
      if (ev > gameState.pot) {
        reasons.push('Strong hand for value');
      } else if (ev > 0) {
        reasons.push('Semi-bluff or value bet');
      } else {
        reasons.push('Bluff attempt');
      }
    } else if (action === ACTIONS.ALL_IN) {
      reasons.push('Maximum pressure play');
    }

    return reasons.join(', ');
  }

  /**
   * Get personality modifiers
   * @returns {Object} Personality modifiers
   * @private
   */
  _getPersonalityModifiers() {
    switch (this.config.personality) {
      case PERSONALITIES.AGGRESSIVE:
        return {
          aggression: 1.4,
          caution: 0.7,
          bluffing: 1.5
        };

      case PERSONALITIES.CAUTIOUS:
        return {
          aggression: 0.7,
          caution: 1.3,
          bluffing: 0.6
        };

      case PERSONALITIES.TRICKY:
        return {
          aggression: 1.1,
          caution: 0.9,
          bluffing: 1.8
        };

      case PERSONALITIES.BALANCED:
      default:
        return {
          aggression: 1.0,
          caution: 1.0,
          bluffing: 1.0
        };
    }
  }

  /**
   * Estimate number of active opponents
   * @param {Object} gameState - Game state
   * @returns {number} Estimated active opponents
   * @private
   */
  _estimateActiveOpponents(gameState) {
    // Default to 2 if not specified
    return gameState.activeOpponents || 2;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    this.personalityModifiers = this._getPersonalityModifiers();
  }

  /**
   * Get current configuration
   * @returns {Object} Configuration
   */
  getConfig() {
    return { ...this.config };
  }
}
