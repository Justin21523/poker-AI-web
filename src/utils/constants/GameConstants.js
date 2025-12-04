/**
 * @fileoverview Game constants and configuration for the card game platform
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Defines constants for game types, player types, AI settings,
 * card properties, and game-specific rules and configurations.
 */

/**
 * Game type identifiers
 * @type {Object.<string, string>}
 */
export const GAME_TYPES = {
  POKER: 'poker',
  TEXAS_HOLDEM: 'texas-holdem',
  OLD_MAID: 'old-maid',
  BIG_TWO: 'big-two',
  BLACKJACK: 'blackjack',
  HEARTS: 'hearts',
  SPADES: 'spades',
  GO_FISH: 'go-fish',
  CRAZY_EIGHTS: 'crazy-eights',
  UNO: 'uno'
};

/**
 * Card suit identifiers
 * @type {string[]}
 */
export const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Card rank identifiers (standard deck)
 * @type {string[]}
 */
export const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Card rank values (default poker values)
 * @type {Object.<string, number>}
 */
export const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

/**
 * Player type identifiers
 * @type {Object.<string, string>}
 */
export const PLAYER_TYPES = {
  HUMAN: 'human',
  AI: 'ai',
  REMOTE: 'remote',
  SPECTATOR: 'spectator'
};

/**
 * AI difficulty levels
 * @type {Object.<string, string>}
 */
export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
  ADAPTIVE: 'adaptive'
};

/**
 * AI personality types
 * @type {Object.<string, string>}
 */
export const AI_PERSONALITY = {
  AGGRESSIVE: 'aggressive',
  CAUTIOUS: 'cautious',
  BALANCED: 'balanced',
  RANDOM: 'random',
  TIGHT_AGGRESSIVE: 'tight-aggressive',
  LOOSE_AGGRESSIVE: 'loose-aggressive',
  TIGHT_PASSIVE: 'tight-passive',
  LOOSE_PASSIVE: 'loose-passive',
  MANIAC: 'maniac',
  ROCK: 'rock'
};

/**
 * Poker hand rankings
 * @type {Object.<string, number>}
 */
export const POKER_HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9
};

/**
 * Poker hand names
 * @type {string[]}
 */
export const POKER_HAND_NAMES = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush'
];

/**
 * Poker action types
 * @type {Object.<string, string>}
 */
export const POKER_ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  BET: 'bet',
  ALL_IN: 'all-in'
};

/**
 * Poker betting rounds
 * @type {Object.<string, string>}
 */
export const POKER_BETTING_ROUNDS = {
  PRE_FLOP: 'pre-flop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown'
};

/**
 * Game configurations for each supported game type
 * @type {Object}
 */
export const GAME_CONFIGS = {
  [GAME_TYPES.TEXAS_HOLDEM]: {
    name: 'Texas Hold\'em Poker',
    description: 'The most popular poker variant with community cards',
    minPlayers: 2,
    maxPlayers: 9,
    optimalPlayers: 6,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 2,
    communityCards: 5,
    bettingRounds: 4,
    blindStructure: {
      smallBlind: 10,
      bigBlind: 20,
      ante: 0
    },
    defaultChips: 1000,
    tags: ['poker', 'betting', 'skill', 'community-cards']
  },

  [GAME_TYPES.OLD_MAID]: {
    name: 'Old Maid',
    description: 'Classic matching game where players avoid the Old Maid card',
    minPlayers: 2,
    maxPlayers: 8,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false,
      removeCards: ['Q_of_clubs'] // This becomes the "Old Maid"
    },
    handSize: null, // Variable based on player count
    communityCards: 0,
    bettingRounds: 0,
    tags: ['matching', 'family', 'luck']
  },

  [GAME_TYPES.BIG_TWO]: {
    name: 'Big Two (Deuces)',
    description: 'Asian climbing game where 2s are the highest cards',
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 13,
    communityCards: 0,
    bettingRounds: 0,
    suitRanking: ['diamonds', 'clubs', 'hearts', 'spades'], // Lowest to highest
    tags: ['climbing', 'strategy', 'asian']
  },

  [GAME_TYPES.BLACKJACK]: {
    name: 'Blackjack (21)',
    description: 'Beat the dealer by getting closer to 21 without busting',
    minPlayers: 1,
    maxPlayers: 7,
    optimalPlayers: 3,
    deckConfig: {
      numDecks: 6,
      includeJokers: false
    },
    handSize: 2,
    communityCards: 0,
    bettingRounds: 1,
    defaultBet: 10,
    minBet: 5,
    maxBet: 500,
    dealerStandsOn: 17,
    blackjackPayout: 1.5,
    tags: ['casino', 'betting', 'probability']
  },

  [GAME_TYPES.HEARTS]: {
    name: 'Hearts',
    description: 'Avoid taking hearts and the Queen of Spades',
    minPlayers: 3,
    maxPlayers: 6,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 13,
    communityCards: 0,
    bettingRounds: 0,
    passCardCount: 3,
    pointCards: {
      hearts: 1,
      'Q_of_spades': 13
    },
    shootTheMoon: true,
    tags: ['trick-taking', 'strategy', 'avoidance']
  },

  [GAME_TYPES.SPADES]: {
    name: 'Spades',
    description: 'Partnership trick-taking game with bidding',
    minPlayers: 4,
    maxPlayers: 4,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 13,
    communityCards: 0,
    bettingRounds: 0,
    partnerships: true,
    nilBid: true,
    bags: true,
    bagsLimit: 10,
    tags: ['trick-taking', 'partnership', 'bidding']
  },

  [GAME_TYPES.GO_FISH]: {
    name: 'Go Fish',
    description: 'Collect sets of four matching cards',
    minPlayers: 2,
    maxPlayers: 6,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 7, // For 2-3 players, 5 for 4+ players
    communityCards: 0,
    bettingRounds: 0,
    setSize: 4,
    tags: ['matching', 'family', 'memory']
  },

  [GAME_TYPES.CRAZY_EIGHTS]: {
    name: 'Crazy Eights',
    description: 'Discard all your cards by matching rank or suit',
    minPlayers: 2,
    maxPlayers: 7,
    optimalPlayers: 4,
    deckConfig: {
      numDecks: 1,
      includeJokers: false
    },
    handSize: 5, // 7 for 2 players
    communityCards: 0,
    bettingRounds: 0,
    wildCards: ['8'],
    drawPenalty: 1,
    tags: ['shedding', 'family', 'quick']
  }
};

/**
 * AI configuration defaults
 * @type {Object}
 */
export const AI_CONFIG = {
  // Learning parameters
  learningRate: 0.1,
  discountFactor: 0.95,
  explorationRate: 0.15,
  explorationDecay: 0.995,
  minExplorationRate: 0.05,

  // Memory parameters
  shortTermMemorySize: 100,
  longTermMemorySize: 10000,
  memoryDecayRate: 0.01,
  consolidationThreshold: 10,

  // Decision parameters
  thinkingTimeMin: 500,
  thinkingTimeMax: 3000,
  confidenceThreshold: 0.7,
  randomnessMultiplier: 0.1,

  // Opponent modeling
  trackingEnabled: true,
  updateFrequency: 1, // Update after every action
  sampleSize: 50, // Min actions before making predictions
  adaptationSpeed: 0.2,

  // Personality modifiers
  personalityModifiers: {
    [AI_PERSONALITY.AGGRESSIVE]: {
      raiseFrequency: 1.5,
      bluffFrequency: 1.3,
      foldThreshold: 0.7
    },
    [AI_PERSONALITY.CAUTIOUS]: {
      raiseFrequency: 0.6,
      bluffFrequency: 0.4,
      foldThreshold: 0.3
    },
    [AI_PERSONALITY.BALANCED]: {
      raiseFrequency: 1.0,
      bluffFrequency: 1.0,
      foldThreshold: 0.5
    },
    [AI_PERSONALITY.RANDOM]: {
      raiseFrequency: 1.0,
      bluffFrequency: 1.0,
      foldThreshold: 0.5,
      randomness: 2.0
    },
    [AI_PERSONALITY.TIGHT_AGGRESSIVE]: {
      vpipTarget: 0.20,
      pfrTarget: 0.15,
      aggressionTarget: 2.5,
      raiseFrequency: 1.4,
      foldThreshold: 0.35
    },
    [AI_PERSONALITY.LOOSE_AGGRESSIVE]: {
      vpipTarget: 0.40,
      pfrTarget: 0.30,
      aggressionTarget: 2.5,
      raiseFrequency: 1.6,
      foldThreshold: 0.55
    },
    [AI_PERSONALITY.TIGHT_PASSIVE]: {
      vpipTarget: 0.20,
      pfrTarget: 0.10,
      aggressionTarget: 0.8,
      raiseFrequency: 0.5,
      foldThreshold: 0.30
    },
    [AI_PERSONALITY.LOOSE_PASSIVE]: {
      vpipTarget: 0.45,
      pfrTarget: 0.15,
      aggressionTarget: 0.8,
      raiseFrequency: 0.6,
      foldThreshold: 0.60
    },
    [AI_PERSONALITY.MANIAC]: {
      vpipTarget: 0.70,
      pfrTarget: 0.50,
      aggressionTarget: 4.0,
      raiseFrequency: 2.0,
      bluffFrequency: 2.0,
      foldThreshold: 0.75
    },
    [AI_PERSONALITY.ROCK]: {
      vpipTarget: 0.12,
      pfrTarget: 0.08,
      aggressionTarget: 1.5,
      raiseFrequency: 0.4,
      bluffFrequency: 0.2,
      foldThreshold: 0.25
    }
  },

  // Difficulty settings
  difficultySettings: {
    [AI_DIFFICULTY.EASY]: {
      errorRate: 0.25,
      suboptimalPlayRate: 0.40,
      bluffDetectionRate: 0.20,
      patternRecognitionRate: 0.10
    },
    [AI_DIFFICULTY.MEDIUM]: {
      errorRate: 0.10,
      suboptimalPlayRate: 0.20,
      bluffDetectionRate: 0.50,
      patternRecognitionRate: 0.40
    },
    [AI_DIFFICULTY.HARD]: {
      errorRate: 0.03,
      suboptimalPlayRate: 0.08,
      bluffDetectionRate: 0.75,
      patternRecognitionRate: 0.70
    },
    [AI_DIFFICULTY.EXPERT]: {
      errorRate: 0.01,
      suboptimalPlayRate: 0.02,
      bluffDetectionRate: 0.90,
      patternRecognitionRate: 0.90
    },
    [AI_DIFFICULTY.ADAPTIVE]: {
      errorRate: 0.05,
      suboptimalPlayRate: 0.10,
      bluffDetectionRate: 0.60,
      patternRecognitionRate: 0.60,
      adaptsToPlayer: true
    }
  }
};

/**
 * UI configuration defaults
 * @type {Object}
 */
export const UI_CONFIG = {
  // Animation settings
  animationSpeed: 1.0,
  cardDealDuration: 300,
  chipMoveDuration: 500,
  fadeInDuration: 200,
  fadeOutDuration: 200,

  // Card display
  cardWidth: 80,
  cardHeight: 112,
  cardSpacing: 20,
  cardScale: 1.0,

  // Table settings
  tableRadius: 300,
  tableColor: '#2d5016',
  feltTexture: true,

  // Player positions (for different player counts)
  playerPositions: {
    2: [0, 180],
    3: [0, 120, 240],
    4: [0, 90, 180, 270],
    5: [0, 72, 144, 216, 288],
    6: [0, 60, 120, 180, 240, 300],
    7: [0, 51.4, 102.8, 154.2, 205.6, 257, 308.4],
    8: [0, 45, 90, 135, 180, 225, 270, 315],
    9: [0, 40, 80, 120, 160, 200, 240, 280, 320]
  },

  // Theme settings
  themes: {
    default: {
      primaryColor: '#2d5016',
      secondaryColor: '#1a3009',
      accentColor: '#ffd700',
      textColor: '#ffffff',
      cardBack: 'blue'
    },
    modern: {
      primaryColor: '#1e3a5f',
      secondaryColor: '#0f1f3a',
      accentColor: '#00d4ff',
      textColor: '#e0e0e0',
      cardBack: 'red'
    },
    classic: {
      primaryColor: '#8b0000',
      secondaryColor: '#5c0000',
      accentColor: '#ffd700',
      textColor: '#ffffff',
      cardBack: 'classic'
    }
  }
};

/**
 * Performance configuration
 * @type {Object}
 */
export const PERFORMANCE_CONFIG = {
  targetFPS: 60,
  enablePerformanceMonitoring: true,
  enableDebugMode: false,
  maxEventHistorySize: 100,
  gcInterval: 60000, // 1 minute
  stateSaveInterval: 5000 // 5 seconds
};

/**
 * Validation rules
 * @type {Object}
 */
export const VALIDATION_RULES = {
  playerName: {
    minLength: 2,
    maxLength: 20,
    allowedChars: /^[a-zA-Z0-9_-]+$/
  },
  chipAmount: {
    min: 0,
    max: 1000000000
  },
  betAmount: {
    minMultiplier: 1, // Minimum bet is 1x big blind
    maxMultiplier: 100 // Maximum bet is 100x big blind
  }
};

/**
 * Error messages
 * @type {Object}
 */
export const ERROR_MESSAGES = {
  INVALID_GAME_TYPE: 'Invalid game type specified',
  INVALID_PLAYER_COUNT: 'Invalid number of players for this game',
  INVALID_MOVE: 'Invalid move for current game state',
  INSUFFICIENT_CHIPS: 'Insufficient chips for this action',
  GAME_NOT_STARTED: 'Game has not been started',
  PLAYER_NOT_FOUND: 'Player not found',
  DECK_EMPTY: 'Deck is empty',
  HAND_FULL: 'Hand is full',
  INVALID_CARD: 'Invalid card specified'
};

/**
 * Success messages
 * @type {Object}
 */
export const SUCCESS_MESSAGES = {
  GAME_STARTED: 'Game started successfully',
  PLAYER_ADDED: 'Player added successfully',
  MOVE_EXECUTED: 'Move executed successfully',
  GAME_ENDED: 'Game ended successfully'
};

/**
 * Gets game configuration for a specific game type
 * @param {string} gameType - Game type identifier
 * @returns {Object|null} Game configuration or null if not found
 */
export function getGameConfig(gameType) {
  return GAME_CONFIGS[gameType] || null;
}

/**
 * Validates if a game type is supported
 * @param {string} gameType - Game type identifier
 * @returns {boolean} True if game type is supported
 */
export function isValidGameType(gameType) {
  return Object.values(GAME_TYPES).includes(gameType);
}

/**
 * Gets optimal player count for a game
 * @param {string} gameType - Game type identifier
 * @returns {number|null} Optimal player count or null if game not found
 */
export function getOptimalPlayerCount(gameType) {
  const config = getGameConfig(gameType);
  return config ? config.optimalPlayers : null;
}

/**
 * Validates player count for a game
 * @param {string} gameType - Game type identifier
 * @param {number} playerCount - Number of players
 * @returns {boolean} True if player count is valid
 */
export function isValidPlayerCount(gameType, playerCount) {
  const config = getGameConfig(gameType);
  if (!config) return false;
  return playerCount >= config.minPlayers && playerCount <= config.maxPlayers;
}

/**
 * Gets AI personality modifier settings
 * @param {string} personality - AI personality type
 * @returns {Object|null} Personality modifiers or null if not found
 */
export function getPersonalityModifiers(personality) {
  return AI_CONFIG.personalityModifiers[personality] || null;
}

/**
 * Gets AI difficulty settings
 * @param {string} difficulty - AI difficulty level
 * @returns {Object|null} Difficulty settings or null if not found
 */
export function getDifficultySettings(difficulty) {
  return AI_CONFIG.difficultySettings[difficulty] || null;
}
