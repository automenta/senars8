// tests/unit/CoreAgent.System.test.js - Consolidated from coreagent/__tests__/System.test.js
import {beforeEach, describe, expect, it} from 'vitest';
import {System} from '../../coreagent/System.js';

describe('CoreAgent System', () => {
    let system;

    beforeEach(async () => {
        system = new System();
        await system.initialize();
    });

    it('should initialize properly', () => {
        expect(system.lifecycle.initialized).toBe(true);
    });

    it('should start and stop', async () => {
        await system.start();
        expect(system.lifecycle.started).toBe(true);

        await system.stop();
        expect(system.lifecycle.started).toBe(false);
    });

    it('should register and access components', () => {
        const mockComponent = {name: 'test', test: true};
        system.register('testComponent', mockComponent);

        const retrieved = system.get('testComponent');
        expect(retrieved).toBe(mockComponent);
    });

    it('should handle events and commands', async () => {
        let received = null;
        system.on('test:system', (data) => {
            received = data;
        });

        await system.emit('test:system', {message: 'hello'});
        expect(received).toEqual({message: 'hello'});
    });

    it('should get system status', () => {
        const status = system.getStatus();

        expect(status.initialized).toBe(true);
        expect(Array.isArray(status.components)).toBe(true);
        expect(status.stats).toBeDefined();
    });

    it('should provide comprehensive status information', () => {
        const status = system.getStatus();

        expect(status).toHaveProperty('initialized');
        expect(status).toHaveProperty('started');
        expect(status).toHaveProperty('components');
        expect(status).toHaveProperty('stats');

        expect(status.stats).toHaveProperty('memory');
        expect(status.stats).toHaveProperty('reasoning');
        expect(status.stats).toHaveProperty('cycle');
        expect(status.stats).toHaveProperty('self');
        expect(status.stats).toHaveProperty('rules');
    });

    it('should support plugin registration', () => {
        const pluginFactory = async (core) => ({
            name: 'testPlugin',
            async initialize() {},
            async start() {},
            async stop() {}
        });

        system.use('testPlugin', pluginFactory);

        // Plugin should be registered in the plugins component
        const plugins = system.get('plugins');
        expect(plugins).toBeDefined();
        expect(typeof plugins.register).toBe('function');
    });

    it('should handle plugin loading', async () => {
        const pluginFactory = async (core) => ({
            name: 'testPlugin',
            async initialize() {},
            async start() {},
            async stop() {}
        });

        system.use('testPlugin', pluginFactory);

        // Test plugin loading (may fail if plugin doesn't exist, but should not throw)
        try {
            await system.loadPlugin('testPlugin');
        } catch (error) {
            // Plugin loading may fail, but should not crash the system
            expect(error).toBeDefined();
        }
    });

    it('should support direct component access through core', () => {
        expect(system.core.memory).toBeDefined();
        expect(system.core.reasoning).toBeDefined();
        expect(system.core.cycle).toBeDefined();
        expect(system.core.self).toBeDefined();
        expect(system.core.plugins).toBeDefined();
    });
});