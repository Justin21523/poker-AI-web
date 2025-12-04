/**
 * @fileoverview Memory system for poker AI
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Three-tier memory system for AI learning and decision making:
 * - Short-term: Current hand context (actions, cards, pot)
 * - Long-term: Opponent profiles, strategy adjustments, performance metrics
 * - Working: Recent decisions and results (circular buffer)
 *
 * Memory consolidation moves important short-term memories to long-term storage.
 */

import { CircularBuffer } from '../utils/CircularBuffer.js';

/**
 * Memory types
 */
export const MEMORY_TYPES = {
  SHORT_TERM: 'short-term',
  LONG_TERM: 'long-term',
  WORKING: 'working'
};

/**
 * MemorySystem - Three-tier memory for AI learning
 */
export class MemorySystem {
  /**
   * Create memory system
   * @param {Object} config - Configuration
   * @param {number} config.workingMemorySize - Working memory capacity (default: 100)
   * @param {number} config.maxLongTermMemories - Max long-term memories (default: 1000)
   * @param {number} config.memoryDecayRate - Decay rate for importance (default: 0.95)
   */
  constructor(config = {}) {
    this.config = {
      workingMemorySize: config.workingMemorySize || 100,
      maxLongTermMemories: config.maxLongTermMemories || 1000,
      memoryDecayRate: config.memoryDecayRate || 0.95
    };

    // Short-term memory (current hand)
    this.shortTerm = {
      currentHand: null,
      observedActions: [],
      potHistory: [],
      communityCards: [],
      phase: null,
      startTime: null
    };

    // Long-term memory (persistent across games)
    this.longTerm = {
      opponentProfiles: new Map(),
      strategyAdjustments: [],
      performanceMetrics: {
        handsPlayed: 0,
        handsWon: 0,
        totalProfit: 0,
        bigBlindsWon: 0,
        vpip: 0,
        pfr: 0,
        aggressionFactor: 0,
        winRate: 0,
        roi: 0
      },
      successfulStrategies: [],
      failedStrategies: []
    };

    // Working memory (recent decisions)
    this.workingMemory = new CircularBuffer(this.config.workingMemorySize);

    // Memory metadata
    this.createdAt = Date.now();
    this.lastConsolidation = Date.now();
    this.totalMemories = 0;
  }

  // ============================================================================
  // Short-Term Memory Operations
  // ============================================================================

  /**
   * Start new hand in short-term memory
   * @param {Object} handData - Hand initialization data
   * @param {string} handData.handId - Unique hand identifier
   * @param {Card[]} handData.holeCards - Player's hole cards
   * @param {string} handData.position - Player position
   * @param {number} handData.stackSize - Current stack
   */
  startHand(handData) {
    this.shortTerm.currentHand = {
      handId: handData.handId,
      holeCards: handData.holeCards,
      position: handData.position,
      stackSize: handData.stackSize,
      startTime: Date.now(),
      actions: [],
      result: null
    };

    this.shortTerm.observedActions = [];
    this.shortTerm.potHistory = [0];
    this.shortTerm.communityCards = [];
    this.shortTerm.phase = 'pre-flop';
    this.shortTerm.startTime = Date.now();
  }

  /**
   * Record action in short-term memory
   * @param {Object} action - Action data
   * @param {string} action.playerId - Player who acted
   * @param {string} action.type - Action type
   * @param {number} action.amount - Bet amount
   * @param {string} action.phase - Game phase
   */
  recordAction(action) {
    if (!this.shortTerm.currentHand) {
      return;
    }

    const actionRecord = {
      ...action,
      timestamp: Date.now()
    };

    this.shortTerm.observedActions.push(actionRecord);

    // If this is our action, add to hand actions
    if (action.isOurAction) {
      this.shortTerm.currentHand.actions.push(actionRecord);
    }
  }

  /**
   * Update community cards
   * @param {Card[]} cards - Community cards
   */
  updateCommunityCards(cards) {
    this.shortTerm.communityCards = [...cards];
  }

  /**
   * Update game phase
   * @param {string} phase - New phase
   */
  updatePhase(phase) {
    this.shortTerm.phase = phase;
  }

  /**
   * Update pot size
   * @param {number} potSize - Current pot size
   */
  updatePot(potSize) {
    this.shortTerm.potHistory.push(potSize);
  }

  /**
   * End current hand and consolidate to working memory
   * @param {Object} result - Hand result
   * @param {boolean} result.won - Did we win
   * @param {number} result.profit - Chips won/lost
   * @param {string} result.handType - Final hand type
   */
  endHand(result) {
    if (!this.shortTerm.currentHand) {
      return;
    }

    this.shortTerm.currentHand.result = result;
    this.shortTerm.currentHand.endTime = Date.now();
    this.shortTerm.currentHand.duration =
      this.shortTerm.currentHand.endTime - this.shortTerm.currentHand.startTime;

    // Create working memory entry
    const workingMemoryEntry = {
      type: 'hand-result',
      handId: this.shortTerm.currentHand.handId,
      hand: { ...this.shortTerm.currentHand },
      observedActions: [...this.shortTerm.observedActions],
      communityCards: [...this.shortTerm.communityCards],
      potHistory: [...this.shortTerm.potHistory],
      result: result,
      timestamp: Date.now(),
      importance: this._calculateImportance(result)
    };

    this.workingMemory.push(workingMemoryEntry);
    this.totalMemories++;

    // Update performance metrics
    this._updatePerformanceMetrics(result);

    // Clear short-term memory for next hand
    this.shortTerm.currentHand = null;
    this.shortTerm.observedActions = [];
    this.shortTerm.potHistory = [];
    this.shortTerm.communityCards = [];
    this.shortTerm.phase = null;
  }

  /**
   * Get current hand from short-term memory
   * @returns {Object|null} Current hand data
   */
  getCurrentHand() {
    return this.shortTerm.currentHand;
  }

  /**
   * Get observed actions for current hand
   * @returns {Array} Observed actions
   */
  getObservedActions() {
    return this.shortTerm.observedActions;
  }

  // ============================================================================
  // Working Memory Operations
  // ============================================================================

  /**
   * Record decision in working memory
   * @param {Object} decision - Decision data
   * @param {string} decision.situation - Situation description
   * @param {string} decision.action - Chosen action
   * @param {number} decision.expectedValue - Expected value
   * @param {string} decision.reasoning - Decision reasoning
   */
  recordDecision(decision) {
    const entry = {
      type: 'decision',
      ...decision,
      timestamp: Date.now(),
      importance: 0.5 // Default importance
    };

    this.workingMemory.push(entry);
  }

  /**
   * Get recent decisions
   * @param {number} count - Number of decisions to retrieve
   * @returns {Array} Recent decisions
   */
  getRecentDecisions(count = 10) {
    return this.workingMemory
      .filter(entry => entry.type === 'decision')
      .slice(-count);
  }

  /**
   * Get recent hand results
   * @param {number} count - Number of hands to retrieve
   * @returns {Array} Recent hand results
   */
  getRecentHands(count = 10) {
    return this.workingMemory
      .filter(entry => entry.type === 'hand-result')
      .slice(-count);
  }

  /**
   * Query working memory
   * @param {Function} predicate - Filter function
   * @returns {Array} Matching entries
   */
  queryWorkingMemory(predicate) {
    return this.workingMemory.filter(predicate);
  }

  // ============================================================================
  // Long-Term Memory Operations
  // ============================================================================

  /**
   * Store opponent profile in long-term memory
   * @param {string} playerId - Player ID
   * @param {Object} profile - Opponent profile
   */
  storeOpponentProfile(playerId, profile) {
    this.longTerm.opponentProfiles.set(playerId, {
      ...profile,
      lastUpdated: Date.now()
    });
  }

  /**
   * Retrieve opponent profile
   * @param {string} playerId - Player ID
   * @returns {Object|null} Opponent profile
   */
  getOpponentProfile(playerId) {
    return this.longTerm.opponentProfiles.get(playerId) || null;
  }

  /**
   * Get all opponent profiles
   * @returns {Map} All opponent profiles
   */
  getAllOpponentProfiles() {
    return this.longTerm.opponentProfiles;
  }

  /**
   * Record strategy adjustment
   * @param {Object} adjustment - Strategy adjustment data
   * @param {string} adjustment.type - Adjustment type
   * @param {string} adjustment.reason - Reason for adjustment
   * @param {Object} adjustment.parameters - Adjusted parameters
   */
  recordStrategyAdjustment(adjustment) {
    const record = {
      ...adjustment,
      timestamp: Date.now()
    };

    this.longTerm.strategyAdjustments.push(record);

    // Keep only recent adjustments
    if (this.longTerm.strategyAdjustments.length > 100) {
      this.longTerm.strategyAdjustments =
        this.longTerm.strategyAdjustments.slice(-100);
    }
  }

  /**
   * Get recent strategy adjustments
   * @param {number} count - Number to retrieve
   * @returns {Array} Recent adjustments
   */
  getStrategyAdjustments(count = 10) {
    return this.longTerm.strategyAdjustments.slice(-count);
  }

  /**
   * Record successful strategy
   * @param {Object} strategy - Strategy that worked
   * @param {string} strategy.situation - Situation type
   * @param {string} strategy.action - Action taken
   * @param {number} strategy.result - Result (profit)
   */
  recordSuccessfulStrategy(strategy) {
    const record = {
      ...strategy,
      timestamp: Date.now(),
      successCount: 1
    };

    // Check if similar strategy exists
    const existing = this.longTerm.successfulStrategies.find(
      s => s.situation === strategy.situation && s.action === strategy.action
    );

    if (existing) {
      existing.successCount++;
      existing.lastSuccess = Date.now();
    } else {
      this.longTerm.successfulStrategies.push(record);
    }

    // Keep top 50 strategies
    if (this.longTerm.successfulStrategies.length > 50) {
      this.longTerm.successfulStrategies.sort((a, b) => b.successCount - a.successCount);
      this.longTerm.successfulStrategies = this.longTerm.successfulStrategies.slice(0, 50);
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.longTerm.performanceMetrics };
  }

  // ============================================================================
  // Memory Consolidation
  // ============================================================================

  /**
   * Consolidate important working memories to long-term storage
   * @param {number} importanceThreshold - Minimum importance (default: 0.7)
   */
  consolidateMemories(importanceThreshold = 0.7) {
    const importantMemories = this.workingMemory.filter(
      entry => entry.importance >= importanceThreshold
    );

    importantMemories.forEach(memory => {
      if (memory.type === 'hand-result' && memory.result.won && memory.result.profit > 0) {
        // Store successful strategies
        memory.hand.actions.forEach(action => {
          this.recordSuccessfulStrategy({
            situation: `${memory.hand.position}-${action.phase}`,
            action: action.type,
            result: memory.result.profit
          });
        });
      }
    });

    this.lastConsolidation = Date.now();
  }

  /**
   * Apply memory decay to importance scores
   */
  applyMemoryDecay() {
    const all = this.workingMemory.getAll();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    all.forEach(entry => {
      const age = (now - entry.timestamp) / oneHour;
      entry.importance *= Math.pow(this.config.memoryDecayRate, age);
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate importance of hand result
   * @param {Object} result - Hand result
   * @returns {number} Importance score (0-1)
   * @private
   */
  _calculateImportance(result) {
    let importance = 0.5; // Base importance

    // Big wins/losses are more important
    if (Math.abs(result.profit) > 20) {
      importance += 0.3;
    }

    // Showdown hands are more important (more information)
    if (result.showdown) {
      importance += 0.2;
    }

    // Rare hand types are more important
    if (result.handType && ['straight', 'flush', 'full-house', 'four-of-a-kind', 'straight-flush', 'royal-flush'].includes(result.handType)) {
      importance += 0.2;
    }

    return Math.min(1.0, importance);
  }

  /**
   * Update performance metrics
   * @param {Object} result - Hand result
   * @private
   */
  _updatePerformanceMetrics(result) {
    const metrics = this.longTerm.performanceMetrics;

    metrics.handsPlayed++;
    if (result.won) {
      metrics.handsWon++;
    }

    metrics.totalProfit += result.profit || 0;
    metrics.winRate = metrics.handsWon / metrics.handsPlayed;

    // Calculate ROI (return on investment)
    const totalInvested = metrics.handsPlayed * 2; // Assume 2 BB per hand average
    metrics.roi = totalInvested > 0 ? (metrics.totalProfit / totalInvested) * 100 : 0;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Clear all memory
   */
  clear() {
    this.shortTerm.currentHand = null;
    this.shortTerm.observedActions = [];
    this.shortTerm.potHistory = [];
    this.shortTerm.communityCards = [];
    this.shortTerm.phase = null;

    this.longTerm.opponentProfiles.clear();
    this.longTerm.strategyAdjustments = [];
    this.longTerm.successfulStrategies = [];
    this.longTerm.performanceMetrics = {
      handsPlayed: 0,
      handsWon: 0,
      totalProfit: 0,
      bigBlindsWon: 0,
      vpip: 0,
      pfr: 0,
      aggressionFactor: 0,
      winRate: 0,
      roi: 0
    };

    this.workingMemory.clear();
    this.totalMemories = 0;
  }

  /**
   * Serialize to JSON
   * @returns {Object} Serialized memory system
   */
  toJSON() {
    return {
      config: this.config,
      shortTerm: {
        ...this.shortTerm,
        // Don't serialize current hand (transient)
        currentHand: null,
        observedActions: [],
        potHistory: [],
        communityCards: []
      },
      longTerm: {
        opponentProfiles: Array.from(this.longTerm.opponentProfiles.entries()),
        strategyAdjustments: this.longTerm.strategyAdjustments,
        performanceMetrics: this.longTerm.performanceMetrics,
        successfulStrategies: this.longTerm.successfulStrategies,
        failedStrategies: this.longTerm.failedStrategies
      },
      workingMemory: this.workingMemory.toJSON(),
      createdAt: this.createdAt,
      lastConsolidation: this.lastConsolidation,
      totalMemories: this.totalMemories
    };
  }

  /**
   * Restore from JSON
   * @param {Object} data - Serialized data
   * @returns {MemorySystem} Restored memory system
   */
  static fromJSON(data) {
    const memory = new MemorySystem(data.config);

    // Restore long-term memory
    if (data.longTerm) {
      if (data.longTerm.opponentProfiles) {
        memory.longTerm.opponentProfiles = new Map(data.longTerm.opponentProfiles);
      }
      memory.longTerm.strategyAdjustments = data.longTerm.strategyAdjustments || [];
      memory.longTerm.performanceMetrics = data.longTerm.performanceMetrics || memory.longTerm.performanceMetrics;
      memory.longTerm.successfulStrategies = data.longTerm.successfulStrategies || [];
      memory.longTerm.failedStrategies = data.longTerm.failedStrategies || [];
    }

    // Restore working memory
    if (data.workingMemory) {
      memory.workingMemory = CircularBuffer.fromJSON(data.workingMemory);
    }

    memory.createdAt = data.createdAt || Date.now();
    memory.lastConsolidation = data.lastConsolidation || Date.now();
    memory.totalMemories = data.totalMemories || 0;

    return memory;
  }
}
