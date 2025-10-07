import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';
import ToolManagerFactory from '../ToolManagerFactory.js';
import { createMockCore, createMockLM, cleanupTestManager } from './test-utils.js';

describe('EnhancedToolManager - Factory Pattern', () => {
    let mockCore;
    let mockLM;

    beforeEach(() => {
        mockCore = createMockCore();
        mockLM = createMockLM();
    });

    afterEach(async () => {
        // Cleanup any managers created in tests
    });

    it('should create EnhancedToolManager when LM available', () => {
        const manager = ToolManagerFactory.createToolManager(
            mockCore,
            { enhanced: true },
            mockLM
        );

        expect(ToolManagerFactory.isEnhanced(manager)).toBe(true);
    });

    it('should create standard ToolSystem when no LM', () => {
        const manager = ToolManagerFactory.createToolManager(mockCore, {}, null);

        expect(ToolManagerFactory.isEnhanced(manager)).toBe(false);
    });
});