# LLM_PROVIDER.md

This file provides guidance to LLMProvider Tooling (llm_provider.ai/code) when working with code in this repository.

## Project Overview

This is a poker AI web application built with vanilla JavaScript, Three.js for 3D graphics, and a custom game engine architecture. The project uses ES6 modules and focuses on card game mechanics with a flexible, event-driven architecture.

## Development Commands

### Testing
```bash
# Run all tests (Note: package.json currently has placeholder test script)
npm test

# Run tests in browser
# Open test-eventbus.html or test-statemanager.html in a browser
```

### Linting
```bash
# Lint JavaScript files
npx eslint src/

# Format code with Prettier
npx prettier --write "src/**/*.js"
```

### Development
- No build step currently configured
- Uses ES6 modules loaded directly in browser
- Open `index.html` or test HTML files directly in browser for development

## Core Architecture

### Event-Driven Communication
The codebase uses a centralized EventBus pattern for decoupled module communication:

- **EventBus** (`src/core/events/EventBus.js`): Observer pattern implementation with priority-based execution, one-time listeners, and error isolation
- **EventTypes** (`src/core/events/EventTypes.js`): Centralized event type definitions
- Export both class and `globalEventBus` singleton for app-wide communication
- All major systems emit events for state changes, errors, and lifecycle hooks

### State Management System
Two-tier state management using finite state machines:

1. **StateManager** (`src/core/state/StateManager.js`):
   - Generic finite state machine with transition validation
   - History tracking with configurable limits
   - State entry/exit callbacks
   - Transition guards for conditional validation
   - Lock/unlock mechanism for critical operations
   - Rollback support

2. **GameState** (`src/core/state/GameState.js`):
   - Game-specific wrapper around StateManager
   - Manages players, rounds, turns, and scoring
   - Predefined game states: `WAITING`, `INITIALIZING`, `DEALING`, `READY`, `PLAYING`, `PAUSED`, `SCORING`, `ENDED`, `ERROR`, `ABORTED`
   - Built-in validation guards (minimum players, ready checks)
   - Designed to be extended by specific card game implementations

### Game Loop & Timing
Frame-rate independent game loop with precise timing control:

- **GameLoop** (`src/core/engine/GameLoop.js`):
  - Subscription-based update system with priority support
  - Targets 60 FPS using requestAnimationFrame
  - Performance monitoring (FPS tracking, frame time statistics)
  - Pause/resume functionality
  - Auto-pauses when browser tab loses focus

- **TimeManager** (`src/core/engine/TimeManager.js`):
  - Timer system with start/stop/pause/resume
  - Promise-based delays integrated with game loop
  - Time scaling for slow motion/fast forward effects
  - Frame-rate independent interpolation
  - Countdown timers with formatted display
  - Utility functions for lerp, easing, and time conversion

### Card Game Components
Located in `src/core/cards/`:
- **Card.js**: Individual card representation
- **Deck.js**: Deck management and shuffling
- **Hand.js**: Player hand management

## Project Structure

```
src/
├── core/                    # Core game engine systems
│   ├── cards/              # Card game components (Card, Deck, Hand)
│   ├── engine/             # GameLoop and TimeManager
│   ├── events/             # EventBus and EventTypes
│   └── state/              # StateManager and GameState
├── utils/
│   ├── constants/          # Game constants
│   └── helpers/            # DOM and utility helpers
├── config.js               # Configuration (currently empty)
└── main.js                 # Entry point (currently empty)

tests/unit/                 # Unit tests with custom test framework
examples/                   # Usage examples for core systems
```

## Key Design Patterns

1. **Observer Pattern**: EventBus for system communication
2. **Finite State Machine**: StateManager for game flow control
3. **Subscription Pattern**: GameLoop callback system
4. **Singleton Pattern**: Global instances exported alongside classes (globalEventBus, globalGameLoop)
5. **Template Method**: GameState provides extensible game-specific methods

## Working with State Transitions

When implementing game logic:

1. Define state machine configuration with valid transitions
2. Register entry/exit callbacks for state-specific logic
3. Add transition guards for validation requirements
4. Use StateManager history for debugging and rollback
5. Lock state machine during critical operations to prevent invalid transitions

Example:
```javascript
const stateManager = new StateManager({
  initialState: 'idle',
  states: {
    idle: { transitions: ['running'] },
    running: { transitions: ['paused', 'completed'] },
    paused: { transitions: ['running', 'completed'] },
    completed: { transitions: ['idle'] }
  }
});

stateManager.onStateEntry('running', () => {
  // Initialize game resources
});

stateManager.addTransitionGuard('idle', 'running', (data) => {
  return data.playersReady; // Validation logic
});
```

## EventBus Usage Patterns

- Subscribe with priority when order matters (higher priority = executes first)
- Use `once()` for one-time handlers (auto-unsubscribes after first emission)
- Always store unsubscribe functions for cleanup
- Events are namespaced with colons (e.g., `game:start`, `player:move`, `system:error`)
- Event history is available via `getEventHistory()` for debugging

## Testing Approach

The project uses a custom test framework (see `tests/unit/StateManager.test.js`) with:
- `describe()` for test suites
- `it()` for individual test cases
- `expect()` assertions
- Browser-based test execution via HTML files

When adding new tests, follow the existing pattern and create corresponding HTML test pages for browser testing.

## Dependencies

- **three**: 3D graphics library (v0.157.0)
- **vite**: Development server and build tool
- **vitest**: Test runner with UI
- **eslint**: Code linting
- **prettier**: Code formatting
- **husky**: Git hooks
- **lint-staged**: Pre-commit linting

## Performance Considerations

- GameLoop caps delta time at 50ms to prevent "spiral of death" on lag spikes
- Frame time smoothing is enabled by default (configurable)
- Performance monitoring emits warnings when FPS drops below 45 (low) or 30 (critical)
- TimeManager timers can be configured to pause with game or run independently
- EventBus uses error isolation so one failing listener doesn't break others

## Important Notes

- All core systems emit events through EventBus for lifecycle changes
- Use TimeManager.delay() instead of setTimeout() for game-synchronized delays
- StateManager validates all transitions - use forceState() only when absolutely necessary
- GameState is meant to be extended for specific card game implementations (currently provides base functionality)
- The project exports both classes and singleton instances - use singletons for app-wide coordination, create new instances for isolated subsystems
