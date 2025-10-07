import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';

describe('EnhancedToolManager - Parameter Optimization', () => {
    let toolManager;
    let mockLM;
    let mockCore;

    beforeEach(() => {
        // Mock core object for testing
        mockCore = {
            emit: () => {},
            messages: {
                handle: () => {},
                on: () => {},
                off: () => {}
            },
            config: {
                get: () => undefined,
                getNumber: () => 100,
                getString: () => 'test',
                getBoolean: () => false
            },
            components: new Map(),
            register: () => mockCore,
            get: () => null,
            on: () => {},
            request: () => null,
            rules: {
                getStats: () => ({ totalRules: 0 })
            }
        };

        // Mock LM instance for testing
        mockLM = {
            _generate: async (prompt, options) => {
                if (prompt.includes('Optimize these parameters')) {
                    return '```json\n{"encoding": "utf8", "maxSize": 5000000}\n```';
                }
                return '{}';
            }
        };

        toolManager = new EnhancedToolManager(mockCore, {
            enhanced: true,
            lmIntegration: true,
            autoDiscovery: true
        }, mockLM);
    });

    afterEach(async () => {
        if (toolManager) {
            await toolManager.shutdown();
        }
    });

    it('should optimize parameters using LM', async () => {
        const tool = {name: 'file_read'};
        const initialParams = {path: 'test.txt'};
        const context = {priority: 'high'};

        const optimized = await toolManager.optimizeParameters(tool, initialParams, context);

        expect(optimized).toBeDefined();
        expect(optimized.path).toBe('test.txt'); // Original preserved
        expect(optimized.encoding).toBe('utf8'); // LM suggestion added
    });

    it('should return original parameters when LM unavailable', async () => {
        const noLMManager = new EnhancedToolManager(mockCore, {lmIntegration: false});
        const tool = {name: 'file_read'};
        const initialParams = {path: 'test.txt'};

        const result = await noLMManager.optimizeParameters(tool, initialParams);

        expect(result).toEqual(initialParams);
    });
});