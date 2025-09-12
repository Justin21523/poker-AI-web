/**
 * @fileoverview Unit tests for GameLoop and TimeManager systems
 * @author Poker AI Gaming Platform
 * @created 2024-01-01
 *
 * @description Comprehensive test suite for GameLoop and TimeManager functionality
 * including timing accuracy, subscription management, performance monitoring, and integration.
 */

import { GameLoop } from '../core/engine/GameLoop.js';
import { TimeManager, TimeUtils } from '../core/engine/TimeManager.js';
import { EventBus } from '../core/events/EventBus.js';
import { SYSTEM_EVENTS } from '../core/events/EventTypes.js';

/**
 * Test framework class for GameLoop and TimeManager tests
 */
class GameLoopTestFramework {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.currentSuite = '';
    }

    describe(description, testSuite) {
        this.currentSuite = description;
        console.group(`\n🧪 Testing: ${description}`);
        testSuite();
        console.groupEnd();
    }

    it(description, testFunction) {
        try {
            testFunction();
            this.passed++;
            console.log(`✅ ${description}`);
        } catch (error) {
            this.failed++;
            console.error(`❌ ${description}: ${error.message}`);
            console.error(error.stack);
        }
    }

    async itAsync(description, testFunction) {
        try {
            await testFunction();
            this.passed++;
            console.log(`✅ ${description}`);
        } catch (error) {
            this.failed++;
            console.error(`❌ ${description}: ${error.message}`);
            console.error(error.stack);
        }
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
                }
            },
            toBeInstanceOf: (expectedClass) => {
                if (!(actual instanceof expectedClass)) {
                    throw new Error(`Expected instance of ${expectedClass.name}, got ${typeof actual}`);
                }
            },
            toThrow: () => {
                let thrown = false;
                try {
                    actual();
                } catch {
                    thrown = true;
                }
                if (!thrown) {
                    throw new Error('Expected function to throw an error');
                }
            },
            toBeGreaterThan: (expected) => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (actual >= expected) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeCloseTo: (expected, precision = 2) => {
                const diff = Math.abs(actual - expected);
                const tolerance = Math.pow(10, -precision);
                if (diff > tolerance) {
                    throw new Error(`Expected ${actual} to be close to ${expected} (within ${tolerance})`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            }
        };
    }

    async runTests() {
        await this.runGameLoopTests();
        await this.runTimeManagerTests();
        await this.runIntegrationTests();
        this.printSummary();
    }

    async runGameLoopTests() {
        this.describe('GameLoop - Basic Functionality', () => {
            this.testGameLoopCreation();
            this.testGameLoopStartStop();
            this.testGameLoopPauseResume();
            this.testSubscriptionManagement();
        });

        this.describe('GameLoop - Performance Monitoring', () => {
            this.testPerformanceMonitoring();
            this.testPerformanceThresholds();
        });

        this.describe('GameLoop - Error Handling', () => {
            this.testSubscriberErrorHandling();
            this.testInvalidSubscriptions();
        });
    }

    async runTimeManagerTests() {
        this.describe('TimeManager - Timer Management', () => {
            await this.testTimerCreation();
            await this.testTimerLifecycle();
            await this.testTimerOptions();
        });

        this.describe('TimeManager - Time Utilities', () => {
            this.testTimeScaling();
            this.testDelayFunctionality();
            this.testTimeFormatting();
        });

        this.describe('TimeManager - Advanced Features', () => {
            await this.testCountdownTimer();
            this.testFrameRateIndependentLerp();
        });
    }

    async runIntegrationTests() {
        this.describe('Integration Tests', () => {
            await this.testGameLoopTimeManagerIntegration();
            await this.testEventBusIntegration();
            await this.testPerformanceUnderLoad();
        });
    }

    // GameLoop Tests
    testGameLoopCreation() {
        this.it('should create GameLoop with default configuration', () => {
            const gameLoop = new GameLoop();
            this.expect(gameLoop).toBeInstanceOf(GameLoop);
            this.expect(gameLoop.targetFPS).toBe(60);
            this.expect(gameLoop.isRunning).toBe(false);
            this.expect(gameLoop.isPaused).toBe(false);
        });

        this.it('should create GameLoop with custom configuration', () => {
            const customEventBus = new EventBus();
            const gameLoop = new GameLoop({
                targetFPS: 30,
                enablePerformanceMonitoring: false,
                eventBus: customEventBus
            });

            this.expect(gameLoop.targetFPS).toBe(30);
            this.expect(gameLoop.enablePerformanceMonitoring).toBe(false);
            this.expect(gameLoop.eventBus).toBe(customEventBus);
        });
    }

    testGameLoopStartStop() {
        this.it('should start and stop correctly', () => {
            const gameLoop = new GameLoop();

            const started = gameLoop.start();
            this.expect(started).toBe(true);
            this.expect(gameLoop.isRunning).toBe(true);

            const alreadyRunning = gameLoop.start();
            this.expect(alreadyRunning).toBe(false);

            const stopped = gameLoop.stop();
            this.expect(stopped).toBe(true);
            this.expect(gameLoop.isRunning).toBe(false);

            const notRunning = gameLoop.stop();
            this.expect(notRunning).toBe(false);
        });
    }

    testGameLoopPauseResume() {
        this.it('should pause and resume correctly', () => {
            const gameLoop = new GameLoop();

            // Can't pause when not running
            const cantPause = gameLoop.pause();
            this.expect(cantPause).toBe(false);

            gameLoop.start();

            const paused = gameLoop.pause();
            this.expect(paused).toBe(true);
            this.expect(gameLoop.isPaused).toBe(true);

            const alreadyPaused = gameLoop.pause();
            this.expect(alreadyPaused).toBe(false);

            const resumed = gameLoop.resume();
            this.expect(resumed).toBe(true);
            this.expect(gameLoop.isPaused).toBe(false);

            gameLoop.stop();
        });
    }

    testSubscriptionManagement() {
        this.it('should manage subscribers correctly', () => {
            const gameLoop = new GameLoop();
            let callCount = 0;

            const subscriber1 = () => callCount++;
            const subscriber2 = () => callCount += 2;

            const unsub1 = gameLoop.subscribe(subscriber1, 10);
            const unsub2 = gameLoop.subscribe(subscriber2, 5);

            this.expect(gameLoop.subscribers.length).toBe(2);

            // Check priority order (high priority first)
            this.expect(gameLoop.subscribers[0].priority).toBe(10);
            this.expect(gameLoop.subscribers[1].priority).toBe(5);

            // Test unsubscribe
            unsub1();
            this.expect(gameLoop.subscribers.length).toBe(1);

            unsub2();
            this.expect(gameLoop.subscribers.length).toBe(0);
        });

        this.it('should handle invalid subscriptions', () => {
            const gameLoop = new GameLoop();

            this.expect(() => gameLoop.subscribe(null)).toThrow();
            this.expect(() => gameLoop.subscribe('not a function')).toThrow();
            this.expect(() => gameLoop.subscribe(123)).toThrow();
        });
    }

    testPerformanceMonitoring() {
        this.it('should track performance data', () => {
            const gameLoop = new GameLoop({ enablePerformanceMonitoring: true });

            const perfData = gameLoop.getPerformanceData();
            this.expect(perfData).toBeInstanceOf(Object);
            this.expect(perfData.frameTimeHistory).toBeInstanceOf(Array);
            this.expect(perfData.fps).toBe(0); // Initially 0
        });
    }

    testPerformanceThresholds() {
        this.it('should have proper performance thresholds', () => {
            const gameLoop = new GameLoop();

            this.expect(gameLoop.performanceThresholds.lowFPS).toBe(45);
            this.expect(gameLoop.performanceThresholds.criticalFPS).toBe(30);
            this.expect(gameLoop.performanceThresholds.highFrameTime).toBe(20);
        });
    }

    testSubscriberErrorHandling() {
        this.it('should isolate subscriber errors', () => {
            const gameLoop = new GameLoop();
            let goodSubscriberCalled = false;

            // Add a subscriber that throws an error
            gameLoop.subscribe(() => {
                throw new Error('Test error');
            });

            // Add a subscriber that should still work
            gameLoop.subscribe(() => {
                goodSubscriberCalled = true;
            });

            // Manually call notifySubscribers to test error isolation
            gameLoop.deltaTime = 16;
            gameLoop.totalTime = 100;
            gameLoop.frameCount = 1;
            gameLoop.notifySubscribers();

            this.expect(goodSubscriberCalled).toBe(true);
        });
    }

    testInvalidSubscriptions() {
        this.it('should reject invalid subscription parameters', () => {
            const gameLoop = new GameLoop();

            this.expect(() => gameLoop.subscribe()).toThrow();
            this.expect(() => gameLoop.subscribe(null)).toThrow();
            this.expect(() => gameLoop.subscribe('string')).toThrow();
            this.expect(() => gameLoop.subscribe({})).toThrow();
        });
    }

    // TimeManager Tests
    async testTimerCreation() {
        await this.itAsync('should create and manage timers', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            let timerFired = false;
            const timer = timeManager.createTimer('test_timer', 100, () => {
                timerFired = true;
            });

            this.expect(timer).toBeInstanceOf(Object);
            this.expect(timer.id).toBe('test_timer');
            this.expect(timer.duration).toBe(100);
            this.expect(timer.isRunning).toBe(true);

            // Simulate time passing
            gameLoop.start();
            await new Promise(resolve => setTimeout(resolve, 150));
            gameLoop.stop();

            this.expect(timerFired).toBe(true);

            timeManager.dispose();
        });
    }

    async testTimerLifecycle() {
        await this.itAsync('should handle timer lifecycle correctly', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            const timer = timeManager.createTimer('lifecycle_timer', 100, () => {}, {
                autoStart: false
            });

            this.expect(timer.isRunning).toBe(false);

            timer.start();
            this.expect(timer.isRunning).toBe(true);

            timer.pause();
            this.expect(timer.isPaused).toBe(true);

            timer.resume();
            this.expect(timer.isPaused).toBe(false);

            timer.stop();
            this.expect(timer.isRunning).toBe(false);

            timer.reset();
            this.expect(timer.elapsed).toBe(0);

            timeManager.dispose();
        });
    }

    async testTimerOptions() {
        await this.itAsync('should respect timer options', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            let repeatCount = 0;
            const timer = timeManager.createTimer('repeat_timer', 50, () => {
                repeatCount++;
            }, {
                repeat: true,
                maxRepeats: 3
            });

            gameLoop.start();
            await new Promise(resolve => setTimeout(resolve, 200));
            gameLoop.stop();

            this.expect(repeatCount).toBe(3);
            this.expect(timer.isRunning).toBe(false);

            timeManager.dispose();
        });
    }

    testTimeScaling() {
        this.it('should handle time scaling correctly', () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            this.expect(timeManager.getTimeScale()).toBe(1.0);

            timeManager.setTimeScale(0.5);
            this.expect(timeManager.getTimeScale()).toBe(0.5);

            timeManager.setTimeScale(2.0, 1000); // Temporary scale for 1 second
            this.expect(timeManager.getTimeScale()).toBe(2.0);

            timeManager.resetTimeScale();
            this.expect(timeManager.getTimeScale()).toBe(1.0);

            timeManager.dispose();
        });
    }

    async testDelayFunctionality() {
        await this.itAsync('should handle delays correctly', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            gameLoop.start();

            const startTime = Date.now();
            await timeManager.delay(100);
            const endTime = Date.now();

            const elapsed = endTime - startTime;
            this.expect(elapsed).toBeGreaterThan(90); // Allow some tolerance
            this.expect(elapsed).toBeLessThan(150);

            gameLoop.stop();
            timeManager.dispose();
        });
    }

    testTimeFormatting() {
        this.it('should format time correctly', () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            this.expect(timeManager.formatTime(90000)).toBe('01:30');
            this.expect(timeManager.formatTime(3690000, true)).toBe('01:01:30');
            this.expect(timeManager.formatTime(5000)).toBe('00:05');

            timeManager.dispose();
        });
    }

    async testCountdownTimer() {
        await this.itAsync('should create countdown timers', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            let lastTimeString = '';
            let completed = false;

            const timer = timeManager.createCountdown(
                'countdown_test',
                1000,
                (timeString) => {
                    lastTimeString = timeString;
                },
                () => {
                    completed = true;
                }
            );

            gameLoop.start();
            await new Promise(resolve => setTimeout(resolve, 1100));
            gameLoop.stop();

            this.expect(completed).toBe(true);
            this.expect(lastTimeString).toBe('00:00');

            timeManager.dispose();
        });
    }

    testFrameRateIndependentLerp() {
        this.it('should calculate frame rate independent lerp', () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            const lerp16ms = timeManager.getFrameRateIndependentLerp(5, 16.67); // 60fps
            const lerp33ms = timeManager.getFrameRateIndependentLerp(5, 33.33); // 30fps

            this.expect(lerp16ms).toBeGreaterThan(0);
            this.expect(lerp16ms).toBeLessThan(1);
            this.expect(lerp33ms).toBeGreaterThan(lerp16ms);

            timeManager.dispose();
        });
    }

    // Integration Tests
    async testGameLoopTimeManagerIntegration() {
        await this.itAsync('should integrate GameLoop and TimeManager correctly', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            let updateCount = 0;
            let timerFired = false;

            // Subscribe to game loop updates
            gameLoop.subscribe(() => {
                updateCount++;
            });

            // Create a timer
            timeManager.createTimer('integration_timer', 100, () => {
                timerFired = true;
            });

            gameLoop.start();
            await new Promise(resolve => setTimeout(resolve, 150));
            gameLoop.stop();

            this.expect(updateCount).toBeGreaterThan(0);
            this.expect(timerFired).toBe(true);

            timeManager.dispose();
        });
    }

    async testEventBusIntegration() {
        await this.itAsync('should emit events correctly', async () => {
            const eventBus = new EventBus();
            const gameLoop = new GameLoop({ eventBus });
            const timeManager = new TimeManager(gameLoop, eventBus);

            let gameLoopStarted = false;
            let timerCreated = false;
            let timeUpdated = false;

            eventBus.on(SYSTEM_EVENTS.GAMELOOP_START, () => {
                gameLoopStarted = true;
            });

            eventBus.on(SYSTEM_EVENTS.TIMER_CREATED, () => {
                timerCreated = true;
            });

            eventBus.on(SYSTEM_EVENTS.TIME_UPDATE, () => {
                timeUpdated = true;
            });

            gameLoop.start();
            timeManager.createTimer('event_timer', 1000, () => {});

            await new Promise(resolve => setTimeout(resolve, 50));

            this.expect(gameLoopStarted).toBe(true);
            this.expect(timerCreated).toBe(true);
            this.expect(timeUpdated).toBe(true);

            gameLoop.stop();
            timeManager.dispose();
        });
    }

    async testPerformanceUnderLoad() {
        await this.itAsync('should maintain performance under load', async () => {
            const gameLoop = new GameLoop();
            const timeManager = new TimeManager(gameLoop);

            // Create many subscribers and timers
            const subscriberCount = 100;
            const timerCount = 50;

            for (let i = 0; i < subscriberCount; i++) {
                gameLoop.subscribe(() => {
                    // Simulate some work
                    Math.random();
                });
            }

            for (let i = 0; i < timerCount; i++) {
                timeManager.createTimer(`load_timer_${i}`, 1000 + i * 10, () => {});
            }

            gameLoop.start();

            const startTime = performance.now();
            await new Promise(resolve => setTimeout(resolve, 200));
            const endTime = performance.now();

            gameLoop.stop();

            const avgFrameTime = (endTime - startTime) / (200 / 16.67); // Approximate frame count

            // Should maintain reasonable performance even under load
            this.expect(avgFrameTime).toBeLessThan(50); // Less than 50ms per frame

            timeManager.dispose();
        });
    }

    // TimeUtils Tests
    testTimeUtils() {
        this.describe('TimeUtils - Utility Functions', () => {
            this.it('should perform linear interpolation correctly', () => {
                this.expect(TimeUtils.lerp(0, 10, 0.5)).toBe(5);
                this.expect(TimeUtils.lerp(100, 200, 0)).toBe(100);
                this.expect(TimeUtils.lerp(100, 200, 1)).toBe(200);
            });

            this.it('should perform smooth step interpolation', () => {
                const smooth = TimeUtils.smoothStep(0, 10, 0.5);
                const linear = TimeUtils.lerp(0, 10, 0.5);

                this.expect(smooth).toBeCloseTo(5, 1);
                // Smooth step should be different from linear at 0.5
                this.expect(Math.abs(smooth - linear)).toBeGreaterThan(0);
            });

            this.it('should apply easing functions correctly', () => {
                this.expect(TimeUtils.easeIn(0)).toBe(0);
                this.expect(TimeUtils.easeIn(1)).toBe(1);
                this.expect(TimeUtils.easeIn(0.5)).toBeCloseTo(0.25, 2);

                this.expect(TimeUtils.easeOut(0)).toBe(0);
                this.expect(TimeUtils.easeOut(1)).toBe(1);
                this.expect(TimeUtils.easeOut(0.5)).toBeCloseTo(0.75, 2);

                this.expect(TimeUtils.easeInOut(0)).toBe(0);
                this.expect(TimeUtils.easeInOut(1)).toBe(1);
                this.expect(TimeUtils.easeInOut(0.5)).toBe(0.5);
            });

            this.it('should clamp values correctly', () => {
                this.expect(TimeUtils.clamp(5, 0, 10)).toBe(5);
                this.expect(TimeUtils.clamp(-5, 0, 10)).toBe(0);
                this.expect(TimeUtils.clamp(15, 0, 10)).toBe(10);
            });

            this.it('should map values between ranges', () => {
                this.expect(TimeUtils.map(5, 0, 10, 0, 100)).toBe(50);
                this.expect(TimeUtils.map(0, 0, 10, 100, 200)).toBe(100);
                this.expect(TimeUtils.map(10, 0, 10, 100, 200)).toBe(200);
            });
        });
    }

    printSummary() {
        console.log('\n📊 GameLoop & TimeManager Test Summary:');
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📈 Total: ${this.passed + this.failed}`);

        if (this.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Please review the errors above.');
        }
    }
}

// Performance benchmark tests
function runPerformanceBenchmarks() {
    console.group('\n⚡ Performance Benchmarks');

    const gameLoop = new GameLoop();
    const timeManager = new TimeManager(gameLoop);

    // Benchmark 1: Subscriber notification performance
    console.time('1000 subscribers notification');
    for (let i = 0; i < 1000; i++) {
        gameLoop.subscribe(() => {
            Math.random(); // Simulate work
        });
    }

    gameLoop.deltaTime = 16.67;
    gameLoop.totalTime = 1000;
    gameLoop.frameCount = 60;
    gameLoop.notifySubscribers();
    console.timeEnd('1000 subscribers notification');

    // Benchmark 2: Timer creation performance
    console.time('1000 timer creation');
    for (let i = 0; i < 1000; i++) {
        timeManager.createTimer(`benchmark_timer_${i}`, 1000, () => {});
    }
    console.timeEnd('1000 timer creation');

    // Benchmark 3: Timer update performance
    console.time('1000 timer update');
    timeManager.updateTimers(16.67);
    console.timeEnd('1000 timer update');

    console.log(`✅ Performance benchmarks completed`);
    console.log(`Active subscribers: ${gameLoop.subscribers.length}`);
    console.log(`Active timers: ${timeManager.timers.size}`);

    // Cleanup
    timeManager.dispose();

    console.groupEnd();
}

// Memory usage test
function testMemoryUsage() {
    console.group('\n📊 Memory Usage Tests');

    if (!performance.memory) {
        console.log('⚠️ Performance.memory not available in this environment');
        console.groupEnd();
        return;
    }

    const initialMemory = performance.memory.usedJSHeapSize;
    console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

    // Create and destroy many GameLoop instances
    const instances = [];
    for (let i = 0; i < 100; i++) {
        const gameLoop = new GameLoop();
        const timeManager = new TimeManager(gameLoop);

        // Add some subscribers and timers
        gameLoop.subscribe(() => {});
        timeManager.createTimer(`mem_test_${i}`, 1000, () => {});

        instances.push({ gameLoop, timeManager });
    }

    const peakMemory = performance.memory.usedJSHeapSize;
    console.log(`Peak memory usage: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory increase: ${((peakMemory - initialMemory) / 1024 / 1024).toFixed(2)} MB`);

    // Cleanup
    instances.forEach(({ gameLoop, timeManager }) => {
        timeManager.dispose();
        gameLoop.dispose();
    });

    // Force garbage collection if available
    if (window.gc) {
        window.gc();
    }

    setTimeout(() => {
        const finalMemory = performance.memory.usedJSHeapSize;
        console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Memory cleanup: ${((peakMemory - finalMemory) / 1024 / 1024).toFixed(2)} MB`);

        if (finalMemory < peakMemory * 0.8) {
            console.log('✅ Good memory cleanup detected');
        } else {
            console.log('⚠️ Potential memory leak detected');
        }
    }, 1000);

    console.groupEnd();
}

// Export test runner
export async function runGameLoopTests() {
    console.log('🚀 Starting GameLoop & TimeManager Test Suite');

    const testFramework = new GameLoopTestFramework();
    await testFramework.runTests();

    testFramework.testTimeUtils();
    runPerformanceBenchmarks();
    testMemoryUsage();

    console.log('\n🏁 GameLoop & TimeManager Test Suite Complete');
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runGameLoopTests);
    } else {
        runGameLoopTests();
    }
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runGameLoopTests };
}