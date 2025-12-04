/**
 * @fileoverview Texas Hold'em Poker game implementation
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Complete Texas Hold'em poker game logic extending GameState.
 * Manages betting rounds, player actions, pot distribution, and game flow.
 *
 * @example
 * import { TexasHoldemGame } from './TexasHoldemGame.js';
 *
 * const game = new TexasHoldemGame({ eventBus });
 * game.addPlayer({ id: 'p1', name: 'Alice', type: 'human', chips: 1000 });
 * game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai', chips: 1000 });
 * game.startGame();
 */

import { GameState } from '../../core/state/GameState.js';
import { Deck } from '../../core/cards/Deck.js';
import { Hand } from '../../core/cards/Hand.js';
import { PokerHandEvaluator } from './PokerHandEvaluator.js';
import { GAME_EVENTS, PLAYER_EVENTS } from '../../core/events/EventTypes.js';

/**
 * Texas Hold'em poker game states
 */
export const TEXAS_HOLDEM_STATES = {
  WAITING: 'waiting',
  STARTING: 'starting',
  SMALL_BLIND: 'small_blind',
  BIG_BLIND: 'big_blind',
  PRE_FLOP: 'pre_flop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  ENDED: 'ended'
};

/**
 * Player action types
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
 * Texas Hold'em Poker Game
 * Extends GameState with poker-specific logic
 */
export class TexasHoldemGame extends GameState {
  /**
   * Creates a new Texas Hold'em game
   *
   * @param {Object} config - Game configuration
   * @param {EventBus} config.eventBus - Event bus for communication
   * @param {number} [config.smallBlind=10] - Small blind amount
   * @param {number} [config.bigBlind=20] - Big blind amount
   * @param {number} [config.startingChips=1000] - Starting chips per player
   * @param {number} [config.minPlayers=2] - Minimum players
   * @param {number} [config.maxPlayers=9] - Maximum players
   */
  constructor(config = {}) {
    // Define poker-specific states
    const pokerStates = {
      [TEXAS_HOLDEM_STATES.WAITING]: {
        transitions: [TEXAS_HOLDEM_STATES.STARTING]
      },
      [TEXAS_HOLDEM_STATES.STARTING]: {
        transitions: [TEXAS_HOLDEM_STATES.SMALL_BLIND]
      },
      [TEXAS_HOLDEM_STATES.SMALL_BLIND]: {
        transitions: [TEXAS_HOLDEM_STATES.BIG_BLIND]
      },
      [TEXAS_HOLDEM_STATES.BIG_BLIND]: {
        transitions: [TEXAS_HOLDEM_STATES.PRE_FLOP]
      },
      [TEXAS_HOLDEM_STATES.PRE_FLOP]: {
        transitions: [TEXAS_HOLDEM_STATES.FLOP, TEXAS_HOLDEM_STATES.SHOWDOWN, TEXAS_HOLDEM_STATES.ENDED]
      },
      [TEXAS_HOLDEM_STATES.FLOP]: {
        transitions: [TEXAS_HOLDEM_STATES.TURN, TEXAS_HOLDEM_STATES.SHOWDOWN, TEXAS_HOLDEM_STATES.ENDED]
      },
      [TEXAS_HOLDEM_STATES.TURN]: {
        transitions: [TEXAS_HOLDEM_STATES.RIVER, TEXAS_HOLDEM_STATES.SHOWDOWN, TEXAS_HOLDEM_STATES.ENDED]
      },
      [TEXAS_HOLDEM_STATES.RIVER]: {
        transitions: [TEXAS_HOLDEM_STATES.SHOWDOWN, TEXAS_HOLDEM_STATES.ENDED]
      },
      [TEXAS_HOLDEM_STATES.SHOWDOWN]: {
        transitions: [TEXAS_HOLDEM_STATES.ENDED]
      },
      [TEXAS_HOLDEM_STATES.ENDED]: {
        transitions: [TEXAS_HOLDEM_STATES.WAITING]
      }
    };

    // Initialize parent GameState - expects (gameType, config)
    super('texas-holdem', {
      eventBus: config.eventBus,
      minPlayers: config.minPlayers || 2,
      maxPlayers: config.maxPlayers || 9,
      customStates: pokerStates
    });

    // Poker-specific configuration
    this.smallBlind = config.smallBlind || 10;
    this.bigBlind = config.bigBlind || 20;
    this.startingChips = config.startingChips || 1000;

    // Game state
    this.deck = new Deck({ eventBus: this.stateManager.eventBus });
    this.communityCards = new Hand({ maxSize: 5 });
    this.pot = 0;
    this.currentBet = 0;
    this.dealerPosition = -1; // No dealer until game starts
    this.bettingRound = 0;

    // Betting round tracking
    this.bettingRoundComplete = false;
    this.lastRaiserIndex = -1;
    this.lastRaiseAmount = 0;
    this.activePlayers = []; // Players still in the hand
  }

  /**
   * Getter for eventBus for convenience
   * @returns {EventBus} The event bus instance
   */
  get eventBus() {
    return this.stateManager.eventBus;
  }

  /**
   * Override addPlayer to add poker-specific properties
   * @param {Object} player - Player data
   * @returns {boolean} True if added successfully
   * @override
   */
  addPlayer(player) {
    // Call parent addPlayer
    const result = super.addPlayer(player);

    // Add poker-specific properties
    const addedPlayer = this.getPlayerById(player.id);
    if (addedPlayer) {
      addedPlayer.chips = player.chips || this.startingChips;
      addedPlayer.currentBet = 0;
      addedPlayer.totalBet = 0;
      addedPlayer.hasActed = false;
      addedPlayer.isFolded = false;
      addedPlayer.isAllIn = false;
      addedPlayer.hand = new Hand({ ownerId: player.id, maxSize: 2 });
      addedPlayer.holeCards = null;
      addedPlayer.bestHand = null;
    }

    return result;
  }

  /**
   * Initialize game-specific data
   * @override
   */
  initializeGameData() {
    // Initialize deck
    this.deck.initialize();
    this.deck.shuffle();

    // Clear community cards
    this.communityCards.clear();

    // Reset pot and betting
    this.pot = 0;
    this.currentBet = 0;
    this.bettingRoundComplete = false;
    this.lastRaiserIndex = -1;

    // Initialize player poker data
    this.players.forEach((player, index) => {
      player.hand = new Hand({ ownerId: player.id, maxSize: 2 });
      player.chips = player.chips || this.startingChips;
      player.currentBet = 0;
      player.totalBet = 0;
      player.hasActed = false;
      player.isFolded = false;
      player.isAllIn = false;
      player.position = index;
      player.holeCards = null;
      player.bestHand = null;
    });

    // Set active players
    this.activePlayers = this.players.filter(p => !p.isFolded && p.chips > 0);

    // Set initial dealer position (random for first hand)
    if (this.dealerPosition === -1) {
      this.dealerPosition = Math.floor(Math.random() * this.players.length);
    }

    this.eventBus.emit(GAME_EVENTS.GAME_INITIALIZED, {
      playerCount: this.players.length,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      dealerPosition: this.dealerPosition
    });
  }

  /**
   * Start a new game of Texas Hold'em
   * @override
   */
  startGame() {
    if (this.players.length < this.minPlayers) {
      throw new Error(`TexasHoldemGame: at least ${this.minPlayers} players required`);
    }

    // Initialize game data (deck, chips, etc.)
    this.initializeGameData();

    // Emit game start event
    this.eventBus.emit(GAME_EVENTS.GAME_START, {
      gameId: this.gameId,
      gameType: this.gameType,
      playerCount: this.players.length,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind
    });

    // Transition to starting state
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.STARTING);

    // Post blinds
    this.postBlinds();

    // Deal hole cards
    this.dealHoleCards();

    // Start pre-flop betting
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.PRE_FLOP);
    this.startBettingRound();
  }

  /**
   * Deal hole cards to all players
   * @override
   */
  dealCards() {
    this.dealHoleCards();
  }

  /**
   * Deal hole cards to all active players
   * @private
   */
  dealHoleCards() {
    this.activePlayers.forEach(player => {
      player.hand.clear();
      player.hand.addCard(this.deck.draw());
      player.hand.addCard(this.deck.draw());
      player.holeCards = player.hand.getCards();

      // Hide cards from other players
      player.hand.hideAll();
    });

    this.eventBus.emit(GAME_EVENTS.CARDS_DEALT, {
      phase: 'hole_cards',
      playerCount: this.activePlayers.length
    });
  }

  /**
   * Post small and big blinds
   * @private
   */
  postBlinds() {
    const smallBlindPlayer = this.getPlayerAtPosition(this.dealerPosition + 1);
    const bigBlindPlayer = this.getPlayerAtPosition(this.dealerPosition + 2);

    // Post small blind
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.SMALL_BLIND);
    this.processBet(smallBlindPlayer, this.smallBlind, true);

    // Post big blind
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.BIG_BLIND);
    this.processBet(bigBlindPlayer, this.bigBlind, true);

    // Set current bet to big blind
    this.currentBet = this.bigBlind;

    this.eventBus.emit(GAME_EVENTS.BLINDS_POSTED, {
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      smallBlindPlayer: smallBlindPlayer.id,
      bigBlindPlayer: bigBlindPlayer.id
    });
  }

  /**
   * Start a betting round
   * @private
   */
  startBettingRound() {
    // Reset betting round state
    this.bettingRoundComplete = false;
    this.lastRaiserIndex = -1;

    // Reset player actions for this round
    this.activePlayers.forEach(player => {
      if (!player.isAllIn) {
        player.hasActed = false;
      }
    });

    // Set first player (after blinds for pre-flop, after dealer for others)
    const currentState = this.stateManager.getCurrentState();
    if (currentState === TEXAS_HOLDEM_STATES.PRE_FLOP) {
      this.currentPlayerIndex = (this.dealerPosition + 3) % this.activePlayers.length;
    } else {
      this.currentPlayerIndex = (this.dealerPosition + 1) % this.activePlayers.length;
    }

    this.nextPlayerTurn();
  }

  /**
   * Move to next player's turn
   * @private
   */
  nextPlayerTurn() {
    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.completeBettingRound();
      return;
    }

    // Find next active player who hasn't acted or needs to act
    let attempts = 0;
    while (attempts < this.activePlayers.length) {
      const player = this.activePlayers[this.currentPlayerIndex];

      if (!player.isFolded && !player.isAllIn &&
          (!player.hasActed || player.currentBet < this.currentBet)) {
        this.currentPlayer = this.currentPlayerIndex;

        this.eventBus.emit(PLAYER_EVENTS.PLAYER_TURN_START, {
          playerId: player.id,
          playerName: player.name,
          chips: player.chips,
          currentBet: player.currentBet,
          callAmount: this.currentBet - player.currentBet,
          potSize: this.pot,
          availableActions: this.getAvailableActions(player)
        });

        return;
      }

      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activePlayers.length;
      attempts++;
    }

    // If we get here, round is complete
    this.completeBettingRound();
  }

  /**
   * Check if betting round is complete
   * @private
   */
  isBettingRoundComplete() {
    const playersToAct = this.activePlayers.filter(p =>
      !p.isFolded && !p.isAllIn
    );

    if (playersToAct.length === 0) {
      return true;
    }

    // All players have acted and matched the current bet
    return playersToAct.every(p =>
      p.hasActed && p.currentBet === this.currentBet
    );
  }

  /**
   * Complete current betting round and move to next phase
   * @private
   */
  completeBettingRound() {
    const currentState = this.stateManager.getCurrentState();

    // Check if only one player remains
    const remainingPlayers = this.activePlayers.filter(p => !p.isFolded);
    if (remainingPlayers.length === 1) {
      this.endHandEarly(remainingPlayers[0]);
      return;
    }

    // Move to next phase
    switch (currentState) {
      case TEXAS_HOLDEM_STATES.PRE_FLOP:
        this.dealFlop();
        break;
      case TEXAS_HOLDEM_STATES.FLOP:
        this.dealTurn();
        break;
      case TEXAS_HOLDEM_STATES.TURN:
        this.dealRiver();
        break;
      case TEXAS_HOLDEM_STATES.RIVER:
        this.showdown();
        break;
    }
  }

  /**
   * Deal the flop (3 community cards)
   * @private
   */
  dealFlop() {
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.FLOP);

    // Burn one card
    this.deck.draw();

    // Deal 3 cards
    this.communityCards.addCard(this.deck.draw());
    this.communityCards.addCard(this.deck.draw());
    this.communityCards.addCard(this.deck.draw());
    this.communityCards.showAll();

    this.eventBus.emit(GAME_EVENTS.FLOP_DEALT, {
      communityCards: this.communityCards.getCards().map(c => c.toJSON())
    });

    // Reset bets for new round
    this.currentBet = 0;
    this.activePlayers.forEach(p => p.currentBet = 0);

    this.startBettingRound();
  }

  /**
   * Deal the turn (4th community card)
   * @private
   */
  dealTurn() {
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.TURN);

    // Burn one card
    this.deck.draw();

    // Deal 1 card
    const turnCard = this.deck.draw();
    turnCard.show();
    this.communityCards.addCard(turnCard);

    this.eventBus.emit(GAME_EVENTS.TURN_DEALT, {
      turnCard: turnCard.toJSON(),
      communityCards: this.communityCards.getCards().map(c => c.toJSON())
    });

    // Reset bets for new round
    this.currentBet = 0;
    this.activePlayers.forEach(p => p.currentBet = 0);

    this.startBettingRound();
  }

  /**
   * Deal the river (5th community card)
   * @private
   */
  dealRiver() {
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.RIVER);

    // Burn one card
    this.deck.draw();

    // Deal 1 card
    const riverCard = this.deck.draw();
    riverCard.show();
    this.communityCards.addCard(riverCard);

    this.eventBus.emit(GAME_EVENTS.RIVER_DEALT, {
      riverCard: riverCard.toJSON(),
      communityCards: this.communityCards.getCards().map(c => c.toJSON())
    });

    // Reset bets for new round
    this.currentBet = 0;
    this.activePlayers.forEach(p => p.currentBet = 0);

    this.startBettingRound();
  }

  /**
   * Handle showdown
   * @private
   */
  showdown() {
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.SHOWDOWN);

    // Evaluate all remaining players' hands
    const remainingPlayers = this.activePlayers.filter(p => !p.isFolded);

    remainingPlayers.forEach(player => {
      player.hand.showAll();
      const allCards = [...player.hand.getCards(), ...this.communityCards.getCards()];
      player.bestHand = PokerHandEvaluator.evaluate(allCards);
    });

    this.eventBus.emit(GAME_EVENTS.SHOWDOWN_START, {
      players: remainingPlayers.map(p => ({
        id: p.id,
        name: p.name,
        holeCards: p.hand.getCards().map(c => c.toJSON()),
        bestHand: {
          rank: p.bestHand.rankName,
          description: p.bestHand.description,
          cards: p.bestHand.cards.map(c => c.toJSON())
        }
      }))
    });

    // Determine winners and distribute pot
    this.distributePot();

    // End hand
    this.endHand();
  }

  /**
   * End hand early when only one player remains
   * @private
   */
  endHandEarly(winner) {
    winner.chips += this.pot;

    this.eventBus.emit(GAME_EVENTS.HAND_WON, {
      winnerId: winner.id,
      winnerName: winner.name,
      amount: this.pot,
      reason: 'all_others_folded'
    });

    this.pot = 0;
    this.endHand();
  }

  /**
   * Distribute pot to winner(s)
   * @private
   */
  distributePot() {
    const remainingPlayers = this.activePlayers.filter(p => !p.isFolded);
    const evaluations = remainingPlayers.map(p => p.bestHand);
    const winnerIndices = PokerHandEvaluator.determineWinners(evaluations);

    // Split pot among winners
    const winAmount = Math.floor(this.pot / winnerIndices.length);
    const remainder = this.pot % winnerIndices.length;

    winnerIndices.forEach((index, i) => {
      const winner = remainingPlayers[index];
      let amount = winAmount;

      // Give remainder to first winner
      if (i === 0) {
        amount += remainder;
      }

      winner.chips += amount;
      winner.score = (winner.score || 0) + amount;

      this.eventBus.emit(GAME_EVENTS.HAND_WON, {
        winnerId: winner.id,
        winnerName: winner.name,
        amount: amount,
        handRank: winner.bestHand.rankName,
        handDescription: winner.bestHand.description
      });
    });

    this.pot = 0;
  }

  /**
   * End current hand and prepare for next
   * @private
   */
  endHand() {
    this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.ENDED);

    // Move dealer button
    this.dealerPosition = (this.dealerPosition + 1) % this.players.length;

    // Remove players with no chips
    this.players = this.players.filter(p => p.chips > 0);

    this.eventBus.emit(GAME_EVENTS.HAND_ENDED, {
      dealerPosition: this.dealerPosition,
      remainingPlayers: this.players.length
    });

    // Check if game should continue
    if (this.players.length < this.minPlayers) {
      this.endGame();
    } else {
      this.stateManager.transitionTo(TEXAS_HOLDEM_STATES.WAITING);
    }
  }

  /**
   * Validate a player move
   * @override
   */
  validateMove(playerId, action, amount = 0) {
    const player = this.getPlayerById(playerId);

    if (!player) {
      return { valid: false, reason: 'Player not found' };
    }

    if (player.isFolded) {
      return { valid: false, reason: 'Player has folded' };
    }

    if (player.isAllIn) {
      return { valid: false, reason: 'Player is all-in' };
    }

    const currentPlayer = this.activePlayers[this.currentPlayerIndex];
    if (player.id !== currentPlayer.id) {
      return { valid: false, reason: 'Not player\'s turn' };
    }

    const callAmount = this.currentBet - player.currentBet;

    switch (action) {
      case POKER_ACTIONS.FOLD:
        return { valid: true };

      case POKER_ACTIONS.CHECK:
        if (callAmount > 0) {
          return { valid: false, reason: 'Cannot check, must call or raise' };
        }
        return { valid: true };

      case POKER_ACTIONS.CALL:
        if (callAmount === 0) {
          return { valid: false, reason: 'Nothing to call, use check' };
        }
        if (player.chips < callAmount) {
          return { valid: false, reason: 'Insufficient chips, must go all-in' };
        }
        return { valid: true };

      case POKER_ACTIONS.RAISE:
        const minRaise = this.currentBet + this.bigBlind;
        if (amount < minRaise) {
          return { valid: false, reason: `Minimum raise is ${minRaise}` };
        }
        if (player.chips + player.currentBet < amount) {
          return { valid: false, reason: 'Insufficient chips' };
        }
        return { valid: true };

      case POKER_ACTIONS.BET:
        if (this.currentBet > 0) {
          return { valid: false, reason: 'Cannot bet, must raise' };
        }
        if (amount < this.bigBlind) {
          return { valid: false, reason: `Minimum bet is ${this.bigBlind}` };
        }
        if (player.chips < amount) {
          return { valid: false, reason: 'Insufficient chips' };
        }
        return { valid: true };

      case POKER_ACTIONS.ALL_IN:
        if (player.chips === 0) {
          return { valid: false, reason: 'No chips remaining' };
        }
        return { valid: true };

      default:
        return { valid: false, reason: 'Invalid action' };
    }
  }

  /**
   * Execute a player move
   * @override
   */
  executeMove(playerId, action, amount = 0) {
    const validation = this.validateMove(playerId, action, amount);

    if (!validation.valid) {
      throw new Error(`Invalid move: ${validation.reason}`);
    }

    const player = this.getPlayerById(playerId);

    switch (action) {
      case POKER_ACTIONS.FOLD:
        this.processFold(player);
        break;
      case POKER_ACTIONS.CHECK:
        this.processCheck(player);
        break;
      case POKER_ACTIONS.CALL:
        this.processCall(player);
        break;
      case POKER_ACTIONS.RAISE:
        this.processRaise(player, amount);
        break;
      case POKER_ACTIONS.BET:
        this.processBet(player, amount);
        break;
      case POKER_ACTIONS.ALL_IN:
        this.processAllIn(player);
        break;
    }

    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activePlayers.length;
    this.nextPlayerTurn();

    return true;
  }

  /**
   * Process fold action
   * @private
   */
  processFold(player) {
    player.isFolded = true;
    player.hasActed = true;

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_FOLD, {
      playerId: player.id,
      playerName: player.name
    });
  }

  /**
   * Process check action
   * @private
   */
  processCheck(player) {
    player.hasActed = true;

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_CHECK, {
      playerId: player.id,
      playerName: player.name
    });
  }

  /**
   * Process call action
   * @private
   */
  processCall(player) {
    const callAmount = this.currentBet - player.currentBet;
    const actualAmount = Math.min(callAmount, player.chips);

    player.chips -= actualAmount;
    player.currentBet += actualAmount;
    player.totalBet += actualAmount;
    this.pot += actualAmount;
    player.hasActed = true;

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_CALL, {
      playerId: player.id,
      playerName: player.name,
      amount: actualAmount,
      potSize: this.pot
    });
  }

  /**
   * Process raise action
   * @private
   */
  processRaise(player, amount) {
    const raiseAmount = amount - player.currentBet;
    player.chips -= raiseAmount;
    player.currentBet = amount;
    player.totalBet += raiseAmount;
    this.pot += raiseAmount;
    this.currentBet = amount;
    player.hasActed = true;

    // Track last raiser
    this.lastRaiserIndex = this.currentPlayerIndex;

    // Other players need to act again
    this.activePlayers.forEach(p => {
      if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
        p.hasActed = false;
      }
    });

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_RAISE, {
      playerId: player.id,
      playerName: player.name,
      amount: raiseAmount,
      newBet: amount,
      potSize: this.pot
    });
  }

  /**
   * Process bet action
   * @private
   */
  processBet(player, amount, isBlind = false) {
    player.chips -= amount;
    player.currentBet += amount;
    player.totalBet += amount;
    this.pot += amount;

    if (!isBlind) {
      player.hasActed = true;
      this.currentBet = amount;
    }

    if (player.chips === 0) {
      player.isAllIn = true;
    }

    if (!isBlind) {
      this.eventBus.emit(PLAYER_EVENTS.PLAYER_BET, {
        playerId: player.id,
        playerName: player.name,
        amount: amount,
        potSize: this.pot
      });
    }
  }

  /**
   * Process all-in action
   * @private
   */
  processAllIn(player) {
    const allInAmount = player.chips;
    player.currentBet += allInAmount;
    player.totalBet += allInAmount;
    this.pot += allInAmount;
    player.chips = 0;
    player.isAllIn = true;
    player.hasActed = true;

    if (player.currentBet > this.currentBet) {
      this.currentBet = player.currentBet;

      // Other players need to act again
      this.activePlayers.forEach(p => {
        if (p.id !== player.id && !p.isFolded && !p.isAllIn) {
          p.hasActed = false;
        }
      });
    }

    this.eventBus.emit(PLAYER_EVENTS.PLAYER_ALL_IN, {
      playerId: player.id,
      playerName: player.name,
      amount: allInAmount,
      potSize: this.pot
    });
  }

  /**
   * Get available actions for a player
   * @private
   */
  getAvailableActions(player) {
    const actions = [];
    const callAmount = this.currentBet - player.currentBet;

    actions.push(POKER_ACTIONS.FOLD);

    if (callAmount === 0) {
      actions.push(POKER_ACTIONS.CHECK);
      if (player.chips >= this.bigBlind) {
        actions.push(POKER_ACTIONS.BET);
      }
    } else {
      if (player.chips >= callAmount) {
        actions.push(POKER_ACTIONS.CALL);
      }
      if (player.chips > callAmount) {
        actions.push(POKER_ACTIONS.RAISE);
      }
    }

    if (player.chips > 0) {
      actions.push(POKER_ACTIONS.ALL_IN);
    }

    return actions;
  }

  /**
   * Get player at specific position relative to dealer
   * @private
   */
  getPlayerAtPosition(position) {
    const index = position % this.activePlayers.length;
    return this.activePlayers[index];
  }

  /**
   * Check game end conditions
   * @override
   */
  checkGameEndConditions() {
    return this.players.length < this.minPlayers;
  }

  /**
   * Get game state snapshot
   */
  getGameState() {
    return {
      state: this.stateManager.getCurrentState(),
      pot: this.pot,
      currentBet: this.currentBet,
      dealerPosition: this.dealerPosition,
      communityCards: this.communityCards.getCards().map(c => c.toJSON()),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        currentBet: p.currentBet,
        totalBet: p.totalBet,
        isFolded: p.isFolded,
        isAllIn: p.isAllIn,
        isActive: !p.isFolded && p.chips > 0
      })),
      currentPlayer: this.currentPlayer !== null ?
        this.players[this.currentPlayer]?.id : null
    };
  }
}
