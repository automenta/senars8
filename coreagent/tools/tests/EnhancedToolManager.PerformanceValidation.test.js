import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';
import { createMockCore, createTestTool, cleanupTestManager } from './test-utils.js';

describe('EnhancedToolManager - Performance Validation', () => {
    let toolManager;
    let mockCore;

    beforeEach(() => {
        mockCore = createMockCore();
    });

    afterEach(async () => {
        await cleanupTestManager(toolManager);
    });

    it('should not significantly degrade performance without LM', async () => {
        const standardManager = new EnhancedToolManager(mockCore, { lmIntegration: false });

        // Register a mock tool first
        standardManager.registerTool(createTestTool());

        const startTime = Date.now();

        await standardManager.executeTool('test_tool', {});

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100); // Should be fast without LM overhead

        await cleanupTestManager(standardManager);
    });

    it('should maintain reasonable performance with LM integration', async () => {
        // Register a mock tool first
        toolManager = new EnhancedToolManager(mockCore, {
            enhanced: true,
            lmIntegration: true,
            autoDiscovery: true
        });

        toolManager.registerTool(createTestTool());

        const startTime = Date.now();

        await toolManager.executeToolWithEnhancements(
            'test_tool',
            {},
            { requestExplanation: true }
        );

        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should complete within reasonable time
    });
});