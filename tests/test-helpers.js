import {vi} from 'vitest';
import {DIContainer} from '../core/system/DIContainer.js';
import registerComponents from '../core/system/register-components.js';
import ConfigManager from '../core/config/ConfigManager.js';
import {configService} from '../core/config/index.js';
import BagSamplingStrategy from '../core/reasoner/strategies/BagSamplingStrategy.js';
import BruteForceStrategy from '../core/reasoner/strategies/BruteForceStrategy.js';

/**
 * Creates a mock CommandBus with spyable methods.
 * @returns {object} A mock CommandBus.
 */
export const createMockCommandBus = () => ({
    handlers: new Map(),
    handle: vi.fn(function (requestType, handler) {
        this.handlers.set(requestType, handler);
    }),
    request: vi.fn(async function (requestType, data) {
        const handler = this.handlers.get(requestType);
        if (handler) {
            return handler(data);
        }
        return null;
    }),
    clear: vi.fn(function () {
        this.handlers.clear();
    }),
});

/**
 * Creates a mock EventBus with spyable methods.
 * @returns {object} A mock EventBus.
 */
export const createMockEventBus = () => ({
    listeners: new Map(),
    on: vi.fn(function (eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(listener);
    }),
    emit: vi.fn(function (eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(listener => listener(data));
        }
    }),
    emitAsync: vi.fn(async function (eventType, data) {
        if (this.listeners.has(eventType)) {
            await Promise.all(this.listeners.get(eventType).map(listener => listener(data)));
        }
    }),
    clear: vi.fn(function () {
        this.listeners.clear();
    }),
});

/**
 * Creates a complete system with mock buses for testing.
 * @param {object} userConfig - Optional user configuration.
 * @returns {object} An object containing the system instance and mock buses.
 */
export const createTestSystem = (userConfig = {}) => {
    const container = new DIContainer();
    const configManager = new ConfigManager(userConfig);
    configService.initialize(configManager.getAll());

    const mockCommandBus = createMockCommandBus();
    const mockEventBus = createMockEventBus();

    container.registerValue('configManager', configManager);
    container.registerValue('commandBus', mockCommandBus);
    container.registerValue('eventBus', mockEventBus);

    registerComponents(container, configManager);

    const strategyRegistry = container.get('strategyRegistry');
    strategyRegistry.registerStrategies([
        BagSamplingStrategy,
        BruteForceStrategy,
    ]);

    const system = container.get('system');

    return {
        system,
        commandBus: mockCommandBus,
        eventBus: mockEventBus,
        container,
    };
};