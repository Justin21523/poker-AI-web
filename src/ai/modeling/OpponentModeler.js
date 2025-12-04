/**
 * @fileoverview Opponent modeling system for poker AI
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Tracks opponent behavior, classifies player types, and predicts actions.
 * Uses statistical analysis and pattern recognition to build opponent profiles.
 *
 * Player Type Classifications:
 * - TAG (Tight-Aggressive): Low VPIP, high aggression, disciplined
 * - LAG (Loose-Aggressive): High VPIP, high aggression, unpredictable
 * - TP (Tight-Passive): Low VPIP, low aggression, risk-averse
 * - LP (Loose-Passive): High VPIP, low aggression, calling station
 * - Balanced: Average stats across all metrics
 *
 * Key Statistics:
 * - VPIP: Voluntarily Put money In Pot (pre-flop)
 * - PFR: Pre-Flop Raise frequency
 * - Aggression: Ratio of bets/raises to calls
 * - WTSD: Went To ShowDown frequency
 * - WSD: Won at ShowDown frequency
 * - 3-Bet: Three-bet frequency
 * - Fold to C-Bet: Fold to continuation bet frequency
 * - Continuation: Continuation bet frequency
 */

/**
 * Player type constants
 */
export const PLAYER_TYPES = {
  TAG: 'tight-aggressive',
  LAG: 'loose-aggressive',
  TP: 'tight-passive',
  LP: 'loose-passive',
  BALANCED: 'balanced',
  UNKNOWN: 'unknown'
};

/**
 * Position constants
 */
export const POSITIONS = {
  EARLY: 'early',
  MIDDLE: 'middle',
  LATE: 'late',
  BLINDS: 'blinds'
};

/**
 * OpponentProfile - Individual player statistics and behavior tracking
 */
export class OpponentProfile {
  /**
   * Create opponent profile
   * @param {string} playerId - Unique player identifier
   */
  constructor(playerId) {
    this.playerId = playerId;

    // Global statistics
    this.stats = {
      vpip: 0,              // Voluntarily Put money In Pot (%)
      pfr: 0,               // Pre-Flop Raise (%)
      aggression: 0,        // Aggression factor: (bets + raises) / calls
      wtsd: 0,              // Went To ShowDown (%)
      wsd: 0,               // Won at ShowDown (%)
      threebet: 0,          // 3-bet frequency (%)
      foldToCBet: 0,        // Fold to continuation bet (%)
      continuation: 0       // Continuation bet frequency (%)
    };

    // Position-aware statistics
    this.positionStats = {
      [POSITIONS.EARLY]: { vpip: 0, pfr: 0, aggression: 0, handsPlayed: 0 },
      [POSITIONS.MIDDLE]: { vpip: 0, pfr: 0, aggression: 0, handsPlayed: 0 },
      [POSITIONS.LATE]: { vpip: 0, pfr: 0, aggression: 0, handsPlayed: 0 },
      [POSITIONS.BLINDS]: { vpip: 0, pfr: 0, aggression: 0, handsPlayed: 0 }
    };

    // Behavior patterns
    this.patterns = {
      bluffFrequency: 0,
      slowPlayFrequency: 0,
      tiltIndicators: []
    };

    // Hand range estimation
    this.handRanges = {
      preflop: {
        raise: [],
        call: [],
        fold: []
      },
      postflop: {
        aggressive: [],
        passive: []
      }
    };

    // Tracking data
    this.handCount = 0;
    this.actionsObserved = 0;
    this.vpipCount = 0;
    this.pfrCount = 0;
    this.aggressiveActions = 0;
    this.passiveActions = 0;
    this.showdownCount = 0;
    this.showdownWins = 0;
    this.threeBetCount = 0;
    this.threeBetOpportunities = 0;
    this.cBetFoldCount = 0;
    this.cBetFaceCount = 0;
    this.cBetCount = 0;
    this.cBetOpportunities = 0;

    // Player classification
    this.playerType = PLAYER_TYPES.UNKNOWN;
    this.confidence = 0; // 0-1, higher with more hands observed

    // Timestamps
    this.createdAt = Date.now();
    this.lastUpdated = Date.now();
  }

  /**
   * Update profile from observed action
   * @param {Object} action - Action data
   * @param {string} action.type - Action type (fold, check, call, raise, bet, all-in)
   * @param {number} action.amount - Bet/raise amount
   * @param {string} action.phase - Game phase (pre-flop, flop, turn, river)
   * @param {string} action.position - Player position
   * @param {boolean} action.isPreflop - Is pre-flop action
   * @param {boolean} action.facingBet - Is facing a bet
   * @param {boolean} action.isThreeBet - Is a 3-bet situation
   * @param {boolean} action.isContinuation - Is continuation bet opportunity
   */
  updateFromAction(action) {
    this.actionsObserved++;
    this.lastUpdated = Date.now();

    const { type, phase, position, isPreflop, facingBet, isThreeBet, isContinuation } = action;

    // Track VPIP (voluntarily put money in pot)
    if (isPreflop && !['fold', 'check'].includes(type)) {
      this.vpipCount++;
    }

    // Track PFR (pre-flop raise)
    if (isPreflop && ['raise', 'bet'].includes(type)) {
      this.pfrCount++;
    }

    // Track aggression
    if (['raise', 'bet', 'all-in'].includes(type)) {
      this.aggressiveActions++;
    } else if (type === 'call') {
      this.passiveActions++;
    }

    // Track 3-bet
    if (isThreeBet) {
      this.threeBetOpportunities++;
      if (['raise', 'all-in'].includes(type)) {
        this.threeBetCount++;
      }
    }

    // Track continuation bet
    if (isContinuation) {
      this.cBetOpportunities++;
      if (['bet', 'raise'].includes(type)) {
        this.cBetCount++;
      }
    }

    // Track fold to c-bet
    if (facingBet && phase !== 'pre-flop') {
      this.cBetFaceCount++;
      if (type === 'fold') {
        this.cBetFoldCount++;
      }
    }

    // Update position-specific stats
    if (position && this.positionStats[position]) {
      const posStats = this.positionStats[position];
      posStats.handsPlayed++;

      if (isPreflop && !['fold', 'check'].includes(type)) {
        posStats.vpip = (posStats.vpip * (posStats.handsPlayed - 1) + 1) / posStats.handsPlayed;
      }

      if (isPreflop && ['raise', 'bet'].includes(type)) {
        posStats.pfr = (posStats.pfr * (posStats.handsPlayed - 1) + 1) / posStats.handsPlayed;
      }
    }

    // Recalculate statistics
    this._recalculateStats();
  }

  /**
   * Record showdown result
   * @param {Object} showdown - Showdown data
   * @param {Card[]} showdown.cards - Shown cards
   * @param {boolean} showdown.won - Did player win
   * @param {string} showdown.handType - Hand type shown
   * @param {boolean} showdown.wasBluff - Was it a bluff
   * @param {boolean} showdown.wasSlowPlay - Was slow-played strong hand
   */
  recordShowdown(showdown) {
    this.showdownCount++;

    if (showdown.won) {
      this.showdownWins++;
    }

    // Track bluffing patterns
    if (showdown.wasBluff !== undefined) {
      const currentBluffs = this.patterns.bluffFrequency * (this.showdownCount - 1);
      this.patterns.bluffFrequency = (currentBluffs + (showdown.wasBluff ? 1 : 0)) / this.showdownCount;
    }

    // Track slow-play patterns
    if (showdown.wasSlowPlay !== undefined) {
      const currentSlowPlays = this.patterns.slowPlayFrequency * (this.showdownCount - 1);
      this.patterns.slowPlayFrequency = (currentSlowPlays + (showdown.wasSlowPlay ? 1 : 0)) / this.showdownCount;
    }

    this._recalculateStats();
  }

  /**
   * Increment hand count (called at start of each hand)
   */
  incrementHandCount() {
    this.handCount++;
    this._updateConfidence();
  }

  /**
   * Classify player type based on statistics
   * @returns {string} Player type constant
   */
  classifyPlayerType() {
    if (this.handCount < 10) {
      return PLAYER_TYPES.UNKNOWN;
    }

    const { vpip, pfr, aggression } = this.stats;

    // TAG: Tight-Aggressive (VPIP < 25%, high aggression, PFR >= 12%)
    if (vpip < 0.25 && aggression >= 2.0 && pfr >= 0.12) {
      this.playerType = PLAYER_TYPES.TAG;
    }
    // LAG: Loose-Aggressive (VPIP > 30%, high aggression)
    else if (vpip > 0.30 && aggression > 2.0) {
      this.playerType = PLAYER_TYPES.LAG;
    }
    // TP: Tight-Passive (VPIP < 25%, low aggression)
    else if (vpip < 0.25 && aggression < 1.5) {
      this.playerType = PLAYER_TYPES.TP;
    }
    // LP: Loose-Passive (VPIP > 30%, low aggression)
    else if (vpip > 0.30 && aggression < 1.5) {
      this.playerType = PLAYER_TYPES.LP;
    }
    // Balanced: Middle ground
    else {
      this.playerType = PLAYER_TYPES.BALANCED;
    }

    return this.playerType;
  }

  /**
   * Predict player action based on situation
   * @param {Object} situation - Current game situation
   * @param {string} situation.phase - Game phase
   * @param {string} situation.position - Player position
   * @param {boolean} situation.facingBet - Is facing a bet
   * @param {number} situation.betSize - Size of bet (as fraction of pot)
   * @param {number} situation.potOdds - Pot odds
   * @returns {Object} Prediction with action probabilities
   */
  predictAction(situation) {
    if (this.handCount < 10) {
      // Not enough data, return uniform distribution
      return {
        fold: 0.33,
        call: 0.33,
        raise: 0.34,
        confidence: 0.1
      };
    }

    const { phase, position, facingBet, betSize = 1, potOdds = 2 } = situation;
    const playerType = this.playerType;

    let foldProb = 0.3;
    let callProb = 0.4;
    let raiseProb = 0.3;

    // Adjust based on player type
    switch (playerType) {
      case PLAYER_TYPES.TAG:
        if (facingBet) {
          foldProb = 0.5;
          callProb = 0.2;
          raiseProb = 0.3;
        } else {
          foldProb = 0.1;
          callProb = 0.3;
          raiseProb = 0.6;
        }
        break;

      case PLAYER_TYPES.LAG:
        foldProb = 0.2;
        callProb = 0.3;
        raiseProb = 0.5;
        break;

      case PLAYER_TYPES.TP:
        if (facingBet) {
          foldProb = 0.6;
          callProb = 0.3;
          raiseProb = 0.1;
        } else {
          foldProb = 0.1;
          callProb = 0.7;
          raiseProb = 0.2;
        }
        break;

      case PLAYER_TYPES.LP:
        foldProb = 0.2;
        callProb = 0.6;
        raiseProb = 0.2;
        break;

      case PLAYER_TYPES.BALANCED:
      default:
        foldProb = 0.33;
        callProb = 0.34;
        raiseProb = 0.33;
    }

    // Adjust for bet size (larger bets = more folds)
    if (facingBet && betSize > 1) {
      const adjustment = Math.min(betSize / 3, 0.3);
      foldProb += adjustment;
      callProb -= adjustment * 0.5;
      raiseProb -= adjustment * 0.5;
    }

    // Adjust for position
    if (position === POSITIONS.LATE) {
      raiseProb += 0.1;
      foldProb -= 0.05;
      callProb -= 0.05;
    } else if (position === POSITIONS.EARLY) {
      raiseProb -= 0.1;
      foldProb += 0.05;
      callProb += 0.05;
    }

    // Normalize to sum to 1.0
    const total = foldProb + callProb + raiseProb;
    foldProb /= total;
    callProb /= total;
    raiseProb /= total;

    return {
      fold: Math.max(0, Math.min(1, foldProb)),
      call: Math.max(0, Math.min(1, callProb)),
      raise: Math.max(0, Math.min(1, raiseProb)),
      confidence: this.confidence
    };
  }

  /**
   * Calculate fold probability for given bet size
   * @param {number} betSize - Bet size as fraction of pot
   * @returns {number} Fold probability (0-1)
   */
  calculateFoldProbability(betSize) {
    const baseFold = this.stats.foldToCBet || 0.5;

    // Adjust for bet size
    const sizeAdjustment = Math.min((betSize - 1) * 0.2, 0.3);

    // Adjust for player type
    let typeAdjustment = 0;
    switch (this.playerType) {
      case PLAYER_TYPES.TP:
        typeAdjustment = 0.2;
        break;
      case PLAYER_TYPES.LP:
        typeAdjustment = -0.2;
        break;
      case PLAYER_TYPES.LAG:
        typeAdjustment = -0.15;
        break;
      case PLAYER_TYPES.TAG:
        typeAdjustment = 0.1;
        break;
    }

    return Math.max(0, Math.min(1, baseFold + sizeAdjustment + typeAdjustment));
  }

  /**
   * Recalculate all statistics
   * @private
   */
  _recalculateStats() {
    // VPIP (requires handCount)
    if (this.handCount > 0) {
      this.stats.vpip = this.vpipCount / this.handCount;
    }

    // PFR (requires handCount)
    if (this.handCount > 0) {
      this.stats.pfr = this.pfrCount / this.handCount;
    }

    // Aggression factor (independent of handCount)
    if (this.passiveActions > 0) {
      this.stats.aggression = this.aggressiveActions / this.passiveActions;
    } else {
      this.stats.aggression = this.aggressiveActions > 0 ? 5 : 0;
    }

    // WTSD (requires handCount)
    if (this.handCount > 0) {
      this.stats.wtsd = this.showdownCount / this.handCount;
    }

    // WSD (independent of handCount, only needs showdownCount)
    if (this.showdownCount > 0) {
      this.stats.wsd = this.showdownWins / this.showdownCount;
    }

    // 3-bet
    if (this.threeBetOpportunities > 0) {
      this.stats.threebet = this.threeBetCount / this.threeBetOpportunities;
    }

    // Fold to C-Bet
    if (this.cBetFaceCount > 0) {
      this.stats.foldToCBet = this.cBetFoldCount / this.cBetFaceCount;
    }

    // Continuation bet
    if (this.cBetOpportunities > 0) {
      this.stats.continuation = this.cBetCount / this.cBetOpportunities;
    }

    // Update classification (only if enough data)
    if (this.handCount >= 10) {
      this.classifyPlayerType();
    }

    // Update confidence
    this._updateConfidence();
  }

  /**
   * Update confidence based on sample size
   * @private
   */
  _updateConfidence() {
    // Confidence increases with more hands observed (asymptotic to 1.0)
    // 10 hands = 0.3, 30 hands = 0.5, 100 hands = 0.7, 300+ hands = 0.9+
    this.confidence = Math.min(0.95, 1 - Math.exp(-this.handCount / 100));
  }

  /**
   * Serialize profile to JSON
   * @returns {Object} Serialized profile
   */
  toJSON() {
    return {
      playerId: this.playerId,
      stats: { ...this.stats },
      positionStats: { ...this.positionStats },
      patterns: { ...this.patterns },
      handRanges: { ...this.handRanges },

      // Tracking data
      handCount: this.handCount,
      actionsObserved: this.actionsObserved,
      vpipCount: this.vpipCount,
      pfrCount: this.pfrCount,
      aggressiveActions: this.aggressiveActions,
      passiveActions: this.passiveActions,
      showdownCount: this.showdownCount,
      showdownWins: this.showdownWins,
      threeBetCount: this.threeBetCount,
      threeBetOpportunities: this.threeBetOpportunities,
      cBetFoldCount: this.cBetFoldCount,
      cBetFaceCount: this.cBetFaceCount,
      cBetCount: this.cBetCount,
      cBetOpportunities: this.cBetOpportunities,

      // Classification
      playerType: this.playerType,
      confidence: this.confidence,

      // Timestamps
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Load profile from JSON
   * @param {Object} data - Serialized profile data
   * @returns {OpponentProfile} Restored profile
   */
  static fromJSON(data) {
    const profile = new OpponentProfile(data.playerId);
    Object.assign(profile, data);
    return profile;
  }
}

/**
 * OpponentModeler - Manages all opponent profiles and modeling
 */
export class OpponentModeler {
  /**
   * Create opponent modeler
   */
  constructor() {
    this.profiles = new Map();
  }

  /**
   * Get or create opponent profile
   * @param {string} playerId - Player ID
   * @returns {OpponentProfile} Player profile
   */
  getProfile(playerId) {
    if (!this.profiles.has(playerId)) {
      this.profiles.set(playerId, new OpponentProfile(playerId));
    }
    return this.profiles.get(playerId);
  }

  /**
   * Update opponent profile from action
   * @param {string} playerId - Player ID
   * @param {Object} action - Action data
   */
  updateFromAction(playerId, action) {
    const profile = this.getProfile(playerId);
    profile.updateFromAction(action);
  }

  /**
   * Record showdown for player
   * @param {string} playerId - Player ID
   * @param {Object} showdown - Showdown data
   */
  recordShowdown(playerId, showdown) {
    const profile = this.getProfile(playerId);
    profile.recordShowdown(showdown);
  }

  /**
   * Increment hand count for all active players
   * @param {string[]} playerIds - Array of player IDs
   */
  incrementHandCounts(playerIds) {
    playerIds.forEach(playerId => {
      const profile = this.getProfile(playerId);
      profile.incrementHandCount();
    });
  }

  /**
   * Get player type classification
   * @param {string} playerId - Player ID
   * @returns {string} Player type
   */
  getPlayerType(playerId) {
    const profile = this.getProfile(playerId);
    return profile.classifyPlayerType();
  }

  /**
   * Predict player action
   * @param {string} playerId - Player ID
   * @param {Object} situation - Game situation
   * @returns {Object} Action prediction
   */
  predictAction(playerId, situation) {
    const profile = this.getProfile(playerId);
    return profile.predictAction(situation);
  }

  /**
   * Calculate fold probability
   * @param {string} playerId - Player ID
   * @param {number} betSize - Bet size
   * @returns {number} Fold probability
   */
  calculateFoldProbability(playerId, betSize) {
    const profile = this.getProfile(playerId);
    return profile.calculateFoldProbability(betSize);
  }

  /**
   * Get all profiles
   * @returns {Map<string, OpponentProfile>} All profiles
   */
  getAllProfiles() {
    return this.profiles;
  }

  /**
   * Clear all profiles
   */
  clear() {
    this.profiles.clear();
  }

  /**
   * Remove specific profile
   * @param {string} playerId - Player ID
   */
  removeProfile(playerId) {
    this.profiles.delete(playerId);
  }

  /**
   * Serialize all profiles
   * @returns {Object} Serialized data
   */
  toJSON() {
    const profilesArray = [];
    this.profiles.forEach((profile, playerId) => {
      profilesArray.push(profile.toJSON());
    });
    return {
      profiles: profilesArray,
      timestamp: Date.now()
    };
  }

  /**
   * Load from serialized data
   * @param {Object} data - Serialized data
   * @returns {OpponentModeler} Restored modeler
   */
  static fromJSON(data) {
    const modeler = new OpponentModeler();
    if (data.profiles) {
      data.profiles.forEach(profileData => {
        const profile = OpponentProfile.fromJSON(profileData);
        modeler.profiles.set(profile.playerId, profile);
      });
    }
    return modeler;
  }
}
