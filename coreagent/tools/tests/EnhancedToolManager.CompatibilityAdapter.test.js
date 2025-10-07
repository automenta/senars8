import { describe, it, beforeEach, afterEach } from 'vitest';
import CompatibilityAdapter from '../CompatibilityAdapter.js';
import { createMockCore, createMockLM } from './test-utils.js';

describe('EnhancedToolManager - Compatibility Adapter', () => {
    let mockCore;
    let mockLM;

    beforeEach(() => {
        mockCore = createMockCore();
        mockLM = createMockLM();
    });

    afterEach(async () => {
        // Cleanup if needed
    });

    it('should provide backward compatible interface', async () => {
        const adapter = new CompatibilityAdapter(mockCore, { enhanced: true }, mockLM);

        // Should work with standard interface
        expect(typeof adapter.registerTool).toBe('function');
        expect(typeof adapter.executeTool).toBe('function');
        expect(typeof adapter.getTool).toBe('function');
        expect(typeof adapter.getStatistics).toBe('function');
    });

    it('should delegate enhanced features when available', async () => {
        const adapter = new CompatibilityAdapter(mockCore, { enhanced: true }, mockLM);

        expect(adapter.hasFeature('selectOptimalTool')).toBe(true);
        expect(adapter.hasFeature('optimizeParameters')).toBe(true);

        const selection = await adapter.selectOptimalTool('test task');
        expect(selection).toBeDefined();
    });

    it('should gracefully handle missing features', async () => {
        const adapter = new CompatibilityAdapter(mockCore, {}, null);

        expect(adapter.hasFeature('selectOptimalTool')).toBe(false);

        const result = await adapter.selectOptimalTool('test task');
        expect(result).toBeNull();
    });
});