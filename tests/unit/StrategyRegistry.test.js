import StrategyRegistry from '../../core/reasoner/StrategyRegistry.js';

describe('StrategyRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new StrategyRegistry();
    });

    it('should register a strategy', () => {
        class MyStrategy {
        }

        registry.register('myStrategy', MyStrategy);
        expect(registry.getStrategyNames()).toContain('myStrategy');
    });

    it('should get a strategy instance', () => {
        class MyStrategy {
        }

        registry.register('myStrategy', MyStrategy);
        const instance = registry.getStrategy('myStrategy');
        expect(instance).toBeInstanceOf(MyStrategy);
    });

    it('should throw an error for a missing strategy', () => {
        expect(() => registry.getStrategy('nonExistent')).toThrow('Strategy "nonExistent" not found.');
    });

    it('should register multiple strategies', async () => {
        const MockStrategy = (await import('../mocks/strategies/MockStrategy.js')).default;
        registry.registerStrategies([MockStrategy]);
        expect(registry.getStrategyNames()).toContain('MockStrategy');
        const instance = registry.getStrategy('MockStrategy');
        expect(instance).toBeInstanceOf(MockStrategy);
    });
});
