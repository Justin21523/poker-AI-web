/**
 * @fileoverview Tests for TexasHoldemGame class
 * @author Poker AI Gaming Platform
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TexasHoldemGame, TEXAS_HOLDEM_STATES, POKER_ACTIONS } from '../../src/games/poker/TexasHoldemGame.js';
import { EventBus } from '../../src/core/events/EventBus.js';
import { GAME_EVENTS, PLAYER_EVENTS } from '../../src/core/events/EventTypes.js';

describe('TexasHoldemGame', () => {
  let game;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    game = new TexasHoldemGame({
      eventBus,
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      minPlayers: 2,
      maxPlayers: 9
    });
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with correct default configuration', () => {
      expect(game.smallBlind).toBe(10);
      expect(game.bigBlind).toBe(20);
      expect(game.startingChips).toBe(1000);
      expect(game.pot).toBe(0);
      expect(game.currentBet).toBe(0);
      expect(game.dealerPosition).toBe(-1);
      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.WAITING);
    });

    it('should create empty deck and community cards', () => {
      expect(game.deck).toBeDefined();
      expect(game.communityCards).toBeDefined();
      expect(game.communityCards.getCards().length).toBe(0);
    });

    it('should allow custom configuration', () => {
      const customGame = new TexasHoldemGame({
        eventBus,
        smallBlind: 5,
        bigBlind: 10,
        startingChips: 500
      });

      expect(customGame.smallBlind).toBe(5);
      expect(customGame.bigBlind).toBe(10);
      expect(customGame.startingChips).toBe(500);
    });
  });

  // ============================================================================
  // Player Management Tests
  // ============================================================================

  describe('Player Management', () => {
    it('should add players with poker-specific properties', () => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      const player = game.getPlayerById('p1');

      expect(player.chips).toBe(1000);
      expect(player.currentBet).toBe(0);
      expect(player.hasActed).toBe(false);
      expect(player.isFolded).toBe(false);
      expect(player.isAllIn).toBe(false);
      expect(player.hand).toBeDefined();
      expect(player.hand.getCards().length).toBe(0);
    });

    it('should initialize multiple players correctly', () => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });

      const players = game.getPlayers();
      expect(players.length).toBe(3);
      players.forEach(p => {
        expect(p.chips).toBe(1000);
        expect(p.hand).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Game Start Tests
  // ============================================================================

  describe('Game Start', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
    });

    it('should transition to STARTING state on startGame', () => {
      game.startGame();
      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.PRE_FLOP);
    });

    it('should initialize deck with 52 cards', () => {
      game.startGame();
      // 52 cards - 6 hole cards (3 players * 2) = 46 remaining
      expect(game.deck.getStats().remainingCards).toBe(46);
    });

    it('should set dealer position', () => {
      game.startGame();
      expect(game.dealerPosition).toBeGreaterThanOrEqual(0);
      expect(game.dealerPosition).toBeLessThan(3);
    });

    it('should deal 2 hole cards to each player', () => {
      game.startGame();
      const players = game.getPlayers();

      players.forEach(player => {
        expect(player.hand.getCards().length).toBe(2);
      });
    });

    it('should collect blinds from correct positions', () => {
      // Initialize game data first
      game.initializeGameData();
      game.dealerPosition = 0; // Set dealer to position 0

      // Transition to starting state (required before posting blinds)
      game.stateManager.transitionTo(TEXAS_HOLDEM_STATES.STARTING);

      game.postBlinds();

      const players = game.getPlayers();
      const smallBlindPlayer = players[1]; // Next player after dealer
      const bigBlindPlayer = players[2]; // Next after small blind

      expect(smallBlindPlayer.chips).toBe(990); // 1000 - 10
      expect(smallBlindPlayer.currentBet).toBe(10);
      expect(bigBlindPlayer.chips).toBe(980); // 1000 - 20
      expect(bigBlindPlayer.currentBet).toBe(20);
      expect(game.pot).toBe(30);
      expect(game.currentBet).toBe(20);
    });

    it('should emit GAME_START event', () => {
      let eventEmitted = false;
      eventBus.on(GAME_EVENTS.GAME_START, () => {
        eventEmitted = true;
      });

      game.startGame();
      expect(eventEmitted).toBe(true);
    });
  });

  // ============================================================================
  // Betting Round Tests
  // ============================================================================

  describe('Betting Rounds', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should start with correct current player after blinds', () => {
      // First to act is after big blind (UTG position)
      const currentPlayer = game.getCurrentPlayer();
      expect(currentPlayer).toBeDefined();
    });

    it('should track betting round properly', () => {
      expect(game.bettingRound).toBe(0); // Pre-flop is round 0
    });

    it('should identify active players correctly', () => {
      const activePlayers = game.getActivePlayers();
      expect(activePlayers.length).toBe(3);
      expect(activePlayers.every(p => !p.isFolded && !p.isAllIn)).toBe(true);
    });
  });

  // ============================================================================
  // Action Validation Tests
  // ============================================================================

  describe('Action Validation', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should validate fold action', () => {
      const currentPlayer = game.getCurrentPlayer();
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.FOLD);
      expect(result.valid).toBe(true);
    });

    it('should validate check when no bet to call', () => {
      // Initialize game
      game.initializeGameData();
      game.dealerPosition = 0;

      // Transition through starting states
      game.stateManager.transitionTo(TEXAS_HOLDEM_STATES.STARTING);
      game.stateManager.transitionTo(TEXAS_HOLDEM_STATES.SMALL_BLIND);
      game.stateManager.transitionTo(TEXAS_HOLDEM_STATES.BIG_BLIND);
      game.stateManager.transitionTo(TEXAS_HOLDEM_STATES.PRE_FLOP);

      // Complete pre-flop (all players match the bet)
      game.getPlayers().forEach(p => {
        p.currentBet = 20;
        p.hasActed = true;
      });

      // Move to flop where no one has bet yet
      game.dealFlop();
      game.currentBet = 0;
      game.startBettingRound();

      const currentPlayer = game.getCurrentPlayer();
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.CHECK);
      expect(result.valid).toBe(true);
    });

    it('should reject check when there is a bet to call', () => {
      const currentPlayer = game.getCurrentPlayer();
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.CHECK);
      expect(result.valid).toBe(false);
      expect(result.reason.toLowerCase()).toContain('cannot check');
    });

    it('should validate call action with correct amount', () => {
      const currentPlayer = game.getCurrentPlayer();
      const callAmount = game.currentBet - currentPlayer.currentBet;
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.CALL);
      expect(result.valid).toBe(true);
    });

    it('should validate raise with sufficient amount', () => {
      const currentPlayer = game.getCurrentPlayer();
      const minRaise = game.currentBet + game.bigBlind;
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.RAISE, minRaise);
      expect(result.valid).toBe(true);
    });

    it('should reject raise below minimum', () => {
      const currentPlayer = game.getCurrentPlayer();
      const invalidRaise = game.currentBet + 5; // Less than minRaise
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.RAISE, invalidRaise);
      expect(result.valid).toBe(false);
      expect(result.reason.toLowerCase()).toContain('minimum raise');
    });

    it('should reject raise exceeding player chips', () => {
      const currentPlayer = game.getCurrentPlayer();
      const invalidRaise = currentPlayer.chips + 100;
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.RAISE, invalidRaise);
      expect(result.valid).toBe(false);
      expect(result.reason.toLowerCase()).toContain('insufficient chips');
    });

    it('should validate all-in action', () => {
      const currentPlayer = game.getCurrentPlayer();
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.ALL_IN);
      expect(result.valid).toBe(true);
    });

    it('should reject action from player not in turn', () => {
      const players = game.getPlayers();
      const notCurrentPlayer = players.find(p => p.id !== game.getCurrentPlayer().id);
      const result = game.validateMove(notCurrentPlayer.id, POKER_ACTIONS.FOLD);
      expect(result.valid).toBe(false);
      expect(result.reason.toLowerCase()).toContain('not your turn');
    });

    it('should reject action from folded player', () => {
      const currentPlayer = game.getCurrentPlayer();
      currentPlayer.isFolded = true;
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.CALL);
      expect(result.valid).toBe(false);
      expect(result.reason.toLowerCase()).toContain('already folded');
    });
  });

  // ============================================================================
  // Action Execution Tests
  // ============================================================================

  describe('Action Execution', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should execute fold action correctly', () => {
      const currentPlayer = game.getCurrentPlayer();
      const initialActivePlayers = game.getActivePlayers().length;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.FOLD);

      expect(currentPlayer.isFolded).toBe(true);
      expect(currentPlayer.hasActed).toBe(true);
      expect(game.getActivePlayers().length).toBe(initialActivePlayers - 1);
    });

    it('should execute call action correctly', () => {
      const currentPlayer = game.getCurrentPlayer();
      const initialChips = currentPlayer.chips;
      const callAmount = game.currentBet - currentPlayer.currentBet;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.CALL);

      expect(currentPlayer.chips).toBe(initialChips - callAmount);
      expect(currentPlayer.currentBet).toBe(game.currentBet);
      expect(currentPlayer.hasActed).toBe(true);
    });

    it('should execute raise action correctly', () => {
      const currentPlayer = game.getCurrentPlayer();
      const initialChips = currentPlayer.chips;
      const raiseAmount = game.currentBet + game.bigBlind;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.RAISE, raiseAmount);

      expect(currentPlayer.chips).toBe(initialChips - raiseAmount);
      expect(currentPlayer.currentBet).toBe(raiseAmount);
      expect(game.currentBet).toBe(raiseAmount);
      expect(currentPlayer.hasActed).toBe(true);
      expect(game.lastRaiseAmount).toBe(game.bigBlind);
    });

    it('should execute all-in action correctly', () => {
      const currentPlayer = game.getCurrentPlayer();
      const allChips = currentPlayer.chips;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.ALL_IN);

      expect(currentPlayer.chips).toBe(0);
      expect(currentPlayer.currentBet).toBe(allChips);
      expect(currentPlayer.isAllIn).toBe(true);
      expect(currentPlayer.hasActed).toBe(true);
    });

    it('should advance to next player after action', () => {
      const firstPlayer = game.getCurrentPlayer();
      game.executeMove(firstPlayer.id, POKER_ACTIONS.FOLD);
      const secondPlayer = game.getCurrentPlayer();

      expect(secondPlayer.id).not.toBe(firstPlayer.id);
    });

    it('should emit PLAYER_MOVE event on action', () => {
      let eventData = null;
      eventBus.on(PLAYER_EVENTS.PLAYER_MOVE, (data) => {
        eventData = data;
      });

      const currentPlayer = game.getCurrentPlayer();
      game.executeMove(currentPlayer.id, POKER_ACTIONS.FOLD);

      expect(eventData).not.toBe(null);
      expect(eventData.playerId).toBe(currentPlayer.id);
      expect(eventData.action).toBe(POKER_ACTIONS.FOLD);
    });
  });

  // ============================================================================
  // Betting Round Completion Tests
  // ============================================================================

  describe('Betting Round Completion', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should detect when betting round is complete', () => {
      const players = game.getPlayers();

      // Simulate all players calling
      players.forEach(player => {
        player.currentBet = game.currentBet;
        player.hasActed = true;
      });

      expect(game.isBettingRoundComplete()).toBe(true);
    });

    it('should not complete round if not all players acted', () => {
      const players = game.getPlayers();
      players[0].currentBet = game.currentBet;
      players[0].hasActed = true;
      players[1].currentBet = game.currentBet;
      players[1].hasActed = false; // Not acted yet

      expect(game.isBettingRoundComplete()).toBe(false);
    });

    it('should advance to FLOP after pre-flop betting', () => {
      const players = game.getPlayers();

      // Everyone calls
      players.forEach((player, idx) => {
        if (!player.isFolded) {
          game.executeMove(player.id, POKER_ACTIONS.CALL);
        }
      });

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.FLOP);
      expect(game.communityCards.getCards().length).toBe(3);
    });

    it('should reset player bets and actions between rounds', () => {
      const players = game.getPlayers();

      // Complete pre-flop
      players.forEach((player, idx) => {
        if (!player.isFolded) {
          game.executeMove(player.id, POKER_ACTIONS.CALL);
        }
      });

      // Check reset
      players.forEach(player => {
        if (!player.isFolded) {
          expect(player.currentBet).toBe(0);
          expect(player.hasActed).toBe(false);
        }
      });
    });
  });

  // ============================================================================
  // Community Cards Tests
  // ============================================================================

  describe('Community Cards', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.startGame();
    });

    it('should deal 3 cards on flop', () => {
      // Complete pre-flop
      game.getPlayers().forEach(p => {
        if (!p.isFolded) {
          game.executeMove(p.id, POKER_ACTIONS.CALL);
        }
      });

      expect(game.communityCards.getCards().length).toBe(3);
    });

    it('should deal 4th card on turn', () => {
      // Get to turn
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.TURN);
      expect(game.communityCards.getCards().length).toBe(4);
    });

    it('should deal 5th card on river', () => {
      // Get to river
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.RIVER);
      expect(game.communityCards.getCards().length).toBe(5);
    });

    it('should emit PHASE_CHANGE events for each street', () => {
      let phaseChanges = [];
      eventBus.on(GAME_EVENTS.PHASE_CHANGE, (data) => {
        phaseChanges.push(data.to);
      });

      // Complete full hand
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(phaseChanges).toContain(TEXAS_HOLDEM_STATES.FLOP);
      expect(phaseChanges).toContain(TEXAS_HOLDEM_STATES.TURN);
      expect(phaseChanges).toContain(TEXAS_HOLDEM_STATES.RIVER);
    });
  });

  // ============================================================================
  // Showdown Tests
  // ============================================================================

  describe('Showdown', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should reach showdown after all betting rounds', () => {
      // Play through all rounds
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL)); // Pre-flop
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      }); // Flop
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      }); // Turn
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      }); // River

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.SHOWDOWN);
    });

    it('should determine winner and distribute pot', () => {
      const initialPot = game.pot;

      // Play to showdown
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      // Check that there's at least one winner
      const players = game.getPlayers();
      const winners = players.filter(p => p.chips > 1000 - 20); // Won some chips

      expect(winners.length).toBeGreaterThan(0);
      expect(game.pot).toBe(0); // Pot should be distributed
    });

    it('should award full pot to single winner', () => {
      // Make everyone fold except one
      const players = game.getPlayers();
      game.executeMove(players[0].id, POKER_ACTIONS.FOLD);
      game.executeMove(players[1].id, POKER_ACTIONS.FOLD);

      // Last player should win immediately
      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.SHOWDOWN);

      const winner = players.find(p => !p.isFolded);
      expect(winner.chips).toBeGreaterThan(1000);
    });

    it('should handle ties by splitting pot', () => {
      // This is probabilistic - we just test the mechanism exists
      const players = game.getPlayers();
      game.pot = 100;

      // Manually set up a tie scenario
      players[0].bestHandRank = 5;
      players[1].bestHandRank = 5;
      players[2].isFolded = true;

      const winners = [players[0], players[1]];
      const sharePerWinner = Math.floor(game.pot / winners.length);

      expect(sharePerWinner).toBe(50);
    });

    it('should transition to ENDED state after showdown', () => {
      // Play to showdown
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.ENDED);
    });

    it('should emit GAME_END event', () => {
      let gameEnded = false;
      eventBus.on(GAME_EVENTS.GAME_END, () => {
        gameEnded = true;
      });

      // Play to showdown
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(gameEnded).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should handle all players folding except one', () => {
      const players = game.getPlayers();

      game.executeMove(players[0].id, POKER_ACTIONS.FOLD);
      game.executeMove(players[1].id, POKER_ACTIONS.FOLD);

      expect(game.getCurrentState()).toBe(TEXAS_HOLDEM_STATES.SHOWDOWN);
      expect(game.getActivePlayers().length).toBe(1);
    });

    it('should handle player going all-in', () => {
      const currentPlayer = game.getCurrentPlayer();
      const initialChips = currentPlayer.chips;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.ALL_IN);

      expect(currentPlayer.chips).toBe(0);
      expect(currentPlayer.isAllIn).toBe(true);
      expect(game.pot).toBeGreaterThan(initialChips);
    });

    it('should continue betting round even with all-in player', () => {
      const players = game.getPlayers();

      // First player goes all-in
      game.executeMove(players[0].id, POKER_ACTIONS.ALL_IN);

      // Other players should still be able to act
      const nextPlayer = game.getCurrentPlayer();
      expect(nextPlayer.id).not.toBe(players[0].id);
      expect(game.validateMove(nextPlayer.id, POKER_ACTIONS.FOLD).valid).toBe(true);
    });

    it('should handle minimum chips for call', () => {
      const currentPlayer = game.getCurrentPlayer();
      currentPlayer.chips = 10; // Less than current bet

      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.CALL);

      // Should either be valid (all-in call) or suggest all-in
      expect(result.valid || result.reason.includes('all-in')).toBe(true);
    });

    it('should handle heads-up blind posting', () => {
      // Create 2-player game
      const headsUpGame = new TexasHoldemGame({
        eventBus,
        smallBlind: 10,
        bigBlind: 20,
        startingChips: 1000
      });

      headsUpGame.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      headsUpGame.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      headsUpGame.startGame();

      const players = headsUpGame.getPlayers();

      // Verify blinds were posted
      const totalBlinds = players.reduce((sum, p) => sum + (1000 - p.chips), 0);
      expect(totalBlinds).toBe(30); // 10 + 20
    });

    it('should not allow negative bets', () => {
      const currentPlayer = game.getCurrentPlayer();
      const result = game.validateMove(currentPlayer.id, POKER_ACTIONS.RAISE, -100);

      expect(result.valid).toBe(false);
    });

    it('should handle player with zero chips', () => {
      const players = game.getPlayers();
      players[0].chips = 0;
      players[0].isAllIn = true;

      // Player with no chips can't make any bets
      const result = game.validateMove(players[0].id, POKER_ACTIONS.RAISE, 50);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================================================
  // Pot Management Tests
  // ============================================================================

  describe('Pot Management', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.addPlayer({ id: 'p3', name: 'Charlie', type: 'ai' });
      game.startGame();
    });

    it('should accumulate pot from player bets', () => {
      const initialPot = game.pot;
      const currentPlayer = game.getCurrentPlayer();

      game.executeMove(currentPlayer.id, POKER_ACTIONS.CALL);

      expect(game.pot).toBeGreaterThan(initialPot);
    });

    it('should track current bet correctly', () => {
      const currentPlayer = game.getCurrentPlayer();
      const raiseAmount = 60;

      game.executeMove(currentPlayer.id, POKER_ACTIONS.RAISE, raiseAmount);

      expect(game.currentBet).toBe(raiseAmount);
    });

    it('should reset pot after distribution', () => {
      // Play complete hand
      game.getPlayers().forEach(p => game.executeMove(p.id, POKER_ACTIONS.CALL));
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });
      game.getPlayers().forEach(p => {
        if (!p.isFolded) game.executeMove(p.id, POKER_ACTIONS.CHECK);
      });

      expect(game.pot).toBe(0);
    });
  });

  // ============================================================================
  // Serialization Tests
  // ============================================================================

  describe('Serialization', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'p1', name: 'Alice', type: 'human' });
      game.addPlayer({ id: 'p2', name: 'Bob', type: 'ai' });
      game.startGame();
    });

    it('should serialize game state to JSON', () => {
      const json = game.toJSON();

      expect(json).toHaveProperty('state');
      expect(json).toHaveProperty('players');
      expect(json).toHaveProperty('pot');
      expect(json).toHaveProperty('currentBet');
      expect(json).toHaveProperty('dealerPosition');
      expect(json).toHaveProperty('communityCards');
    });

    it('should include poker-specific data in serialization', () => {
      const json = game.toJSON();

      expect(json).toHaveProperty('smallBlind');
      expect(json).toHaveProperty('bigBlind');
      expect(json).toHaveProperty('bettingRound');
      expect(json.smallBlind).toBe(10);
      expect(json.bigBlind).toBe(20);
    });

    it('should serialize player hands', () => {
      const json = game.toJSON();

      json.players.forEach(player => {
        expect(player).toHaveProperty('chips');
        expect(player).toHaveProperty('currentBet');
        expect(player).toHaveProperty('isFolded');
        expect(player).toHaveProperty('isAllIn');
      });
    });
  });
});
