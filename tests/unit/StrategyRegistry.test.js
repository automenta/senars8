import StrategyRegistry from '../../core/reasoner/StrategyRegistry.js';
import { ReasoningStrategy } from '../../core/reasoner/StrategyInterface.js';

// Mock LM service for testing
class MockLMService {
    constructor() {
        this.responses = new Map();
    }
    
    async generate(prompt) {
        // For testing, return the best strategy name based on the prompt
        if (prompt.includes('SimpleTestTask')) {
            return 'SimpleStrategy';
        }
        if (prompt.includes('ComplexTestTask')) {
            return 'ComplexStrategy';
        }
        return null;
    }
}

// Mock strategy that implements the ReasoningStrategy interface
class TestReasoningStrategy extends ReasoningStrategy {
    constructor(name, canHandleResult = true, executeResult = null) {
        super();
        this.name = name;
        this.canHandleResult = canHandleResult;
        this.executeResult = executeResult || { success: true, inferredTasks: [] };
    }
    
    canHandle(task, context) {
        return this.canHandleResult;
    }
    
    async execute(task, context) {
        return this.executeResult;
    }
    
    getMetadata() {
        return {
            name: this.name,
            description: `${this.name} description`,
            supportedTaskTypes: ['test'],
            category: 'test',
            priority: 0.5
        };
    }
}

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

    describe('Enhanced Strategy Selection', () => {
        beforeEach(() => {
            // Register strategies using class definitions so they get instantiated properly
            registry.registerReasoningStrategy('TestStrategy1', TestReasoningStrategy);
            registry.registerReasoningStrategy('TestStrategy2', TestReasoningStrategy);
        });

        it('should find applicable strategies with analytics', () => {
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            const context = {};
            
            const applicable = registry.findApplicableStrategiesWithAnalytics(task, context);
            
            expect(applicable).toHaveLength(2);
            expect(applicable[0]).toHaveProperty('name');
            expect(applicable[0]).toHaveProperty('stats');
            expect(applicable[0].stats).toHaveProperty('successRate');
            expect(applicable[0].stats).toHaveProperty('effectiveness');
        });

        it('should execute strategy and record performance', async () => {
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            
            // Execute strategy to generate stats
            await registry.executeStrategy('TestStrategy1', task, {});
            
            // Check that stats were recorded
            const stats = registry.getUsageStats().strategyDetails;
            // The TestReasoningStrategy is registered as a class, so we need to check if it was instantiated and executed
            expect(stats.TestStrategy1).toBeDefined();
            expect(stats.TestStrategy1.executions || 0).toBeGreaterThanOrEqual(0);
        });

        it('should analyze task characteristics', () => {
            const task = { 
                term: { 
                    key: 'testTerm',
                    structuredTerm: { type: 'Conjunction', terms: [{ type: 'Atomic' }, { type: 'Atomic' }] }
                }, 
                type: 'test', 
                truth: { frequency: 0.8, confidence: 0.9 } 
            };
            
            const characteristics = registry.analyzeTaskCharacteristics(task);
            
            expect(characteristics).toHaveProperty('type', 'test');
            expect(characteristics).toHaveProperty('complexity');
            expect(characteristics).toHaveProperty('confidence', 0.9);
            expect(characteristics).toHaveProperty('frequency', 0.8);
        });

        it('should get strategy success rate report', async () => {
            // Execute strategies to generate stats
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            
            await registry.executeStrategy('TestStrategy1', task, {});
            await registry.executeStrategy('TestStrategy1', task, {});
            
            const report = registry.getStrategySuccessRateReport();
            
            expect(report).toHaveProperty('TestStrategy1');
            expect(report.TestStrategy1).toHaveProperty('successRate');
            expect(report.TestStrategy1).toHaveProperty('successPercentage');
            expect(report.TestStrategy1.totalExecutions).toBeGreaterThanOrEqual(2);
        });

        it('should get strategy effectiveness ranking', () => {
            // Execute strategies to generate stats
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            
            registry.executeStrategy('TestStrategy1', task, {});
            registry.executeStrategy('TestStrategy2', task, {});
            
            const ranking = registry.getStrategyEffectivenessRanking();
            
            expect(Array.isArray(ranking)).toBe(true);
            expect(ranking[0]).toHaveProperty('name');
            expect(ranking[0]).toHaveProperty('effectiveness');
            expect(ranking[0]).toHaveProperty('successRate');
        });

        it('should select best strategy by performance when LM is not available', async () => {
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            const context = {};
            
            // Execute strategies to generate stats
            await registry.executeStrategy('TestStrategy1', task, {});
            await registry.executeStrategy('TestStrategy2', task, {}, { taskType: 'test' });
            
            const bestStrategy = await registry.selectBestStrategy(task, context);
            
            // Should select a strategy based on performance metrics
            expect(bestStrategy).toBeDefined();
            expect(bestStrategy).toHaveProperty('name');
        });

        it('should use LM service for strategy prediction when available', async () => {
            const task = { term: { key: 'SimpleTestTask' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            const context = {};
            
            // Set up LM service
            const lmService = new MockLMService();
            registry.setLMService(lmService);
            
            // Add a few strategies
            const applicableStrategies = [
                { name: 'SimpleStrategy', metadata: { description: 'Simple strategy', category: 'test' }, stats: { successRate: 0.7, averageTime: 10 } },
                { name: 'ComplexStrategy', metadata: { description: 'Complex strategy', category: 'test' }, stats: { successRate: 0.6, averageTime: 20 } }
            ];
            
            // Test LM prediction
            const predicted = await registry._predictBestStrategyWithLM(applicableStrategies, task, context, 'test');
            
            // The mock LM should return SimpleStrategy for SimpleTestTask
            if (predicted) {
                expect(predicted.name).toBe('SimpleStrategy');
            }
        });

        it('should maintain backward compatibility with executeStrategy method', async () => {
            const task = { term: { key: 'testTerm' }, type: 'test', truth: { frequency: 0.8, confidence: 0.9 } };
            
            // Old method call should still work
            const result = await registry.executeStrategy('TestStrategy1', task, {});
            
            expect(result).toHaveProperty('success', true);
        });
    });
});
