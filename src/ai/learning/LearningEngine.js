/**
 * @fileoverview Learning engine for poker AI
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Reinforcement learning system that learns from game results:
 * - Simplified Q-Learning for state-action value estimation
 * - Pattern recognition from hand histories
 * - Strategy adjustment based on outcomes
 * - Epsilon-greedy exploration vs exploitation
 *
 * Learning Algorithm:
 * Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
 * where:
 *   α = learning rate
 *   r = reward
 *   γ = discount factor
 *   s = state, a = action, s' = next state
 */

/**
 * LearningEngine - Reinforcement learning for strategy improvement
 */
export class LearningEngine {
  /**
   * Create learning engine
   * @param {Object} config - Configuration
   * @param {number} config.learningRate - Learning rate α (default: 0.1)
   * @param {number} config.discountFactor - Discount factor γ (default: 0.95)
   * @param {number} config.explorationRate - Initial exploration rate ε (default: 0.3)
   * @param {number} config.explorationDecay - Exploration decay rate (default: 0.995)
   * @param {number} config.minExploration - Minimum exploration rate (default: 0.05)
   */
  constructor(config = {}) {
    this.config = {
      learningRate: config.learningRate !== undefined ? config.learningRate : 0.1,
      discountFactor: config.discountFactor !== undefined ? config.discountFactor : 0.95,
      explorationRate: config.explorationRate !== undefined ? config.explorationRate : 0.3,
      explorationDecay: config.explorationDecay !== undefined ? config.explorationDecay : 0.995,
      minExploration: config.minExploration !== undefined ? config.minExploration : 0.05
    };

    // Q-table: Map<stateKey, Map<action, qValue>>
    this.qTable = new Map();

    // Pattern recognition
    this.patterns = {
      successfulBluffs: [],
      failedBluffs: [],
      successfulValueBets: [],
      successfulSlowPlays: []
    };

    // Strategy adjustments
    this.strategyParams = {
      aggressionLevel: 1.0,
      bluffFrequency: 0.15,
      valueBetSizing: 0.67, // 2/3 pot
      slowPlayFrequency: 0.1
    };

    // Learning statistics
    this.stats = {
      totalHandsLearned: 0,
      totalReward: 0,
      averageReward: 0,
      explorationCount: 0,
      exploitationCount: 0
    };

    // Current exploration rate (decays over time)
    this.currentExplorationRate = this.config.explorationRate;
  }

  /**
   * Learn from hand result
   * @param {Object} handHistory - Complete hand history
   * @param {string} handHistory.handId - Hand identifier
   * @param {Array} handHistory.actions - Actions taken during hand
   * @param {Object} handHistory.result - Hand result
   * @param {number} handHistory.result.profit - Chips won/lost
   * @param {boolean} handHistory.result.won - Did we win
   * @param {Object} handHistory.context - Game context
   */
  learn(handHistory) {
    if (!handHistory || !handHistory.actions || !handHistory.result) {
      return;
    }

    // Calculate reward from result
    const reward = this._calculateReward(handHistory.result);

    // Update Q-values for each action in the hand
    this._updateQValues(handHistory.actions, reward);

    // Recognize patterns
    this._recognizePatterns(handHistory);

    // Update strategy parameters
    this._adjustStrategy(handHistory);

    // Update statistics
    this.stats.totalHandsLearned++;
    this.stats.totalReward += reward;
    this.stats.averageReward = this.stats.totalReward / this.stats.totalHandsLearned;

    // Decay exploration rate
    this._decayExploration();
  }

  /**
   * Get Q-value for state-action pair
   * @param {string} stateKey - State identifier
   * @param {string} action - Action
   * @returns {number} Q-value (0 if not learned)
   */
  getQValue(stateKey, action) {
    if (!this.qTable.has(stateKey)) {
      return 0;
    }

    const actionValues = this.qTable.get(stateKey);
    return actionValues.get(action) || 0;
  }

  /**
   * Get best action for state (exploitation)
   * @param {string} stateKey - State identifier
   * @param {string[]} legalActions - Legal actions
   * @returns {string|null} Best action or null
   */
  getBestAction(stateKey, legalActions) {
    if (!this.qTable.has(stateKey) || legalActions.length === 0) {
      return null;
    }

    const actionValues = this.qTable.get(stateKey);
    let bestAction = null;
    let bestValue = -Infinity;

    for (const action of legalActions) {
      const value = actionValues.get(action) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Decide whether to explore or exploit
   * @returns {boolean} True if should explore
   */
  shouldExplore() {
    const explore = Math.random() < this.currentExplorationRate;

    if (explore) {
      this.stats.explorationCount++;
    } else {
      this.stats.exploitationCount++;
    }

    return explore;
  }

  /**
   * Get strategy parameters
   * @returns {Object} Current strategy parameters
   */
  getStrategyParams() {
    return { ...this.strategyParams };
  }

  /**
   * Get recognized patterns
   * @returns {Object} Pattern collections
   */
  getPatterns() {
    return {
      successfulBluffs: [...this.patterns.successfulBluffs],
      failedBluffs: [...this.patterns.failedBluffs],
      successfulValueBets: [...this.patterns.successfulValueBets],
      successfulSlowPlays: [...this.patterns.successfulSlowPlays]
    };
  }

  /**
   * Get learning statistics
   * @returns {Object} Learning stats
   */
  getStats() {
    return {
      ...this.stats,
      currentExplorationRate: this.currentExplorationRate,
      qTableSize: this.qTable.size
    };
  }

  /**
   * Reset learning (clear Q-table and patterns)
   */
  reset() {
    this.qTable.clear();
    this.patterns = {
      successfulBluffs: [],
      failedBluffs: [],
      successfulValueBets: [],
      successfulSlowPlays: []
    };
    this.currentExplorationRate = this.config.explorationRate;
    this.stats = {
      totalHandsLearned: 0,
      totalReward: 0,
      averageReward: 0,
      explorationCount: 0,
      exploitationCount: 0
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Calculate reward from hand result
   * @param {Object} result - Hand result
   * @returns {number} Reward value
   * @private
   */
  _calculateReward(result) {
    const { profit, won } = result;

    // Normalize profit to reasonable range
    let reward = profit / 100; // Divide by big blind value

    // Bonus for winning
    if (won) {
      reward += 0.5;
    }

    // Clip reward to [-10, 10] range
    return Math.max(-10, Math.min(10, reward));
  }

  /**
   * Update Q-values for action sequence
   * @param {Array} actions - Actions taken
   * @param {number} finalReward - Final reward
   * @private
   */
  _updateQValues(actions, finalReward) {
    if (actions.length === 0) return;

    // Temporal difference learning: propagate reward backwards
    let currentReward = finalReward;

    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      const stateKey = this._encodeState(action.state);
      const actionType = action.type;

      // Get current Q-value
      const currentQ = this.getQValue(stateKey, actionType);

      // Get max Q-value for next state (if exists)
      let maxNextQ = 0;
      if (i < actions.length - 1) {
        const nextStateKey = this._encodeState(actions[i + 1].state);
        const nextActions = actions[i + 1].legalActions || [];

        if (this.qTable.has(nextStateKey)) {
          const nextActionValues = this.qTable.get(nextStateKey);
          for (const nextAction of nextActions) {
            const nextQ = nextActionValues.get(nextAction) || 0;
            maxNextQ = Math.max(maxNextQ, nextQ);
          }
        }
      }

      // Q-learning update: Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
      const tdTarget = currentReward + this.config.discountFactor * maxNextQ;
      const tdError = tdTarget - currentQ;
      const newQ = currentQ + this.config.learningRate * tdError;

      // Store updated Q-value
      if (!this.qTable.has(stateKey)) {
        this.qTable.set(stateKey, new Map());
      }
      this.qTable.get(stateKey).set(actionType, newQ);

      // Propagate discounted reward backwards
      currentReward *= this.config.discountFactor;
    }
  }

  /**
   * Encode state into string key
   * @param {Object} state - Game state
   * @returns {string} State key
   * @private
   */
  _encodeState(state) {
    if (!state) return 'unknown';

    // Simple state encoding: phase-position-handStrength
    const phase = state.phase || 'unknown';
    const position = state.position || 'unknown';

    // Bucket hand strength into categories
    const handStrength = state.handStrength || 0;
    let strengthBucket;
    if (handStrength >= 0.8) strengthBucket = 'very-strong';
    else if (handStrength >= 0.6) strengthBucket = 'strong';
    else if (handStrength >= 0.4) strengthBucket = 'medium';
    else if (handStrength >= 0.2) strengthBucket = 'weak';
    else strengthBucket = 'very-weak';

    // Bucket pot size relative to our stack
    const potToStackRatio = state.potToStackRatio || 0;
    let potBucket;
    if (potToStackRatio >= 0.5) potBucket = 'large';
    else if (potToStackRatio >= 0.2) potBucket = 'medium';
    else potBucket = 'small';

    return `${phase}-${position}-${strengthBucket}-${potBucket}`;
  }

  /**
   * Recognize patterns from hand history
   * @param {Object} handHistory - Hand history
   * @private
   */
  _recognizePatterns(handHistory) {
    const { actions, result } = handHistory;

    for (const action of actions) {
      if (!action.isOurAction) continue;

      const { type, state } = action;
      const handStrength = state.handStrength || 0;

      // Detect bluffs (weak hand + aggressive action)
      if ((type === 'raise' || type === 'bet') && handStrength < 0.3) {
        const pattern = {
          phase: state.phase,
          position: state.position,
          handStrength,
          success: result.won,
          profit: result.profit
        };

        if (result.won) {
          this.patterns.successfulBluffs.push(pattern);
          // Keep only recent 50
          if (this.patterns.successfulBluffs.length > 50) {
            this.patterns.successfulBluffs.shift();
          }
        } else {
          this.patterns.failedBluffs.push(pattern);
          if (this.patterns.failedBluffs.length > 50) {
            this.patterns.failedBluffs.shift();
          }
        }
      }

      // Detect value bets (strong hand + aggressive action)
      if ((type === 'raise' || type === 'bet') && handStrength > 0.7 && result.won) {
        const pattern = {
          phase: state.phase,
          betSize: action.amount / (state.pot || 1),
          profit: result.profit
        };

        this.patterns.successfulValueBets.push(pattern);
        if (this.patterns.successfulValueBets.length > 50) {
          this.patterns.successfulValueBets.shift();
        }
      }

      // Detect slow plays (strong hand + passive action)
      if ((type === 'check' || type === 'call') && handStrength > 0.8 && result.won) {
        const pattern = {
          phase: state.phase,
          handStrength,
          profit: result.profit
        };

        this.patterns.successfulSlowPlays.push(pattern);
        if (this.patterns.successfulSlowPlays.length > 30) {
          this.patterns.successfulSlowPlays.shift();
        }
      }
    }
  }

  /**
   * Adjust strategy based on learning
   * @param {Object} handHistory - Hand history
   * @private
   */
  _adjustStrategy(handHistory) {
    // Adjust aggression based on success
    if (handHistory.result.profit > 50) {
      // Big win - current strategy is working
      this.strategyParams.aggressionLevel *= 1.02; // Increase slightly
    } else if (handHistory.result.profit < -50) {
      // Big loss - reduce aggression
      this.strategyParams.aggressionLevel *= 0.98;
    }

    // Clamp aggression level
    this.strategyParams.aggressionLevel = Math.max(0.5, Math.min(2.0, this.strategyParams.aggressionLevel));

    // Adjust bluff frequency based on success rate
    const totalBluffs = this.patterns.successfulBluffs.length + this.patterns.failedBluffs.length;
    if (totalBluffs > 10) {
      const bluffSuccessRate = this.patterns.successfulBluffs.length / totalBluffs;

      if (bluffSuccessRate > 0.6) {
        // Bluffs are working, increase frequency slightly
        this.strategyParams.bluffFrequency = Math.min(0.3, this.strategyParams.bluffFrequency * 1.05);
      } else if (bluffSuccessRate < 0.3) {
        // Bluffs are failing, decrease frequency
        this.strategyParams.bluffFrequency = Math.max(0.05, this.strategyParams.bluffFrequency * 0.95);
      }
    }

    // Adjust value bet sizing based on successful bets
    if (this.patterns.successfulValueBets.length > 10) {
      const recentBets = this.patterns.successfulValueBets.slice(-10);
      const avgProfit = recentBets.reduce((sum, b) => sum + b.profit, 0) / recentBets.length;

      if (avgProfit > 100) {
        // Big wins with value bets, can bet bigger
        this.strategyParams.valueBetSizing = Math.min(1.0, this.strategyParams.valueBetSizing * 1.02);
      } else if (avgProfit < 30) {
        // Small wins, bet smaller
        this.strategyParams.valueBetSizing = Math.max(0.4, this.strategyParams.valueBetSizing * 0.98);
      }
    }

    // Adjust slow play frequency
    if (this.patterns.successfulSlowPlays.length > 5) {
      const avgProfit = this.patterns.successfulSlowPlays.reduce((sum, p) => sum + p.profit, 0)
                      / this.patterns.successfulSlowPlays.length;

      if (avgProfit > 80) {
        // Slow plays are very profitable
        this.strategyParams.slowPlayFrequency = Math.min(0.25, this.strategyParams.slowPlayFrequency * 1.1);
      }
    }
  }

  /**
   * Decay exploration rate over time
   * @private
   */
  _decayExploration() {
    this.currentExplorationRate = Math.max(
      this.config.minExploration,
      this.currentExplorationRate * this.config.explorationDecay
    );
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize to JSON
   * @returns {Object} Serialized learning engine
   */
  toJSON() {
    return {
      config: this.config,
      qTable: Array.from(this.qTable.entries()).map(([state, actions]) => [
        state,
        Array.from(actions.entries())
      ]),
      patterns: this.patterns,
      strategyParams: this.strategyParams,
      stats: this.stats,
      currentExplorationRate: this.currentExplorationRate
    };
  }

  /**
   * Restore from JSON
   * @param {Object} data - Serialized data
   * @returns {LearningEngine} Restored learning engine
   */
  static fromJSON(data) {
    const engine = new LearningEngine(data.config);

    // Restore Q-table
    if (data.qTable) {
      engine.qTable = new Map(
        data.qTable.map(([state, actions]) => [state, new Map(actions)])
      );
    }

    // Restore patterns
    if (data.patterns) {
      engine.patterns = data.patterns;
    }

    // Restore strategy parameters
    if (data.strategyParams) {
      engine.strategyParams = data.strategyParams;
    }

    // Restore stats
    if (data.stats) {
      engine.stats = data.stats;
    }

    // Restore exploration rate
    if (data.currentExplorationRate !== undefined) {
      engine.currentExplorationRate = data.currentExplorationRate;
    }

    return engine;
  }
}
