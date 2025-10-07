// tests/unit/CoreAgent.Integration.test.js - Consolidated from coreagent/__tests__/Integration.test.js
import {beforeEach, describe, expect, it} from 'vitest';
import {System} from '../../coreagent/System.js';
import {createTask} from '../../coreagent/utils.js';

describe('CoreAgent Integration', () => {
    let system;

    beforeEach(async () => {
        system = new System();
        await system.initialize();
    });

    it('should load main module without errors', async () => {
        // Test that the main module can be imported without errors
        const mainModule = await import('../../main.js');
        expect(mainModule).toBeDefined();
        expect(mainModule.AppRunner).toBeDefined();
    });

    it('should create and use core system components', () => {
        // Test that all core components are properly registered
        expect(system.core.memory).toBeDefined();
        expect(system.core.reasoning).toBeDefined();
        expect(system.core.cycle).toBeDefined();
        expect(system.core.self).toBeDefined();
        expect(system.core.plugins).toBeDefined();
        expect(system.core.lm).toBeDefined();
        expect(system.core.tools).toBeDefined();
    });

    it('should handle task creation and processing', async () => {
        const task = createTask('test task', 'belief', 0.8);

        // Add task to memory
        await system.core.memory._addTask(task);
        expect(system.core.memory._getById(task.id)).toEqual(task);

        // Get focus set
        const focusSet = system.core.memory._getFocusSet();
        expect(Array.isArray(focusSet)).toBe(true);
    });

    it('should handle events and commands', async () => {
        let eventReceived = false;
        let commandResult = null;

        // Test event handling
        system.core.on('test:event', (data) => {
            eventReceived = true;
        });

        await system.core.emit('test:event', {test: 'data'});
        expect(eventReceived).toBe(true);

        // Test command handling
        system.core.messages.handle('test:command', (data) => {
            return {result: 'success', data};
        });

        commandResult = await system.core.request('test:command', {input: 'test'});
        expect(commandResult).toEqual({result: 'success', data: {input: 'test'}});
    });

    it('should provide system status', () => {
        const status = system.getStatus();
        expect(status).toBeDefined();
        expect(status.components).toBeDefined();
        expect(Array.isArray(status.components)).toBe(true);
        expect(status.stats).toBeDefined();
    });

    it('should handle rule evaluation', () => {
        // Add a test rule
        const ruleId = system.core.addRule({
            id: 'test-rule',
            type: 'test',
            conditions: [(context) => context.test === true],
            action: (context) => ({executed: true, context})
        });

        expect(ruleId).toBeDefined();

        // Evaluate the rule
        const results = system.core.evaluateRules({type: 'test', test: true});
        expect(Array.isArray(results)).toBe(true);
        expect(results[0]).toEqual({executed: true, context: {type: 'test', test: true}});
    });

    it('should handle component registration', () => {
        const testComponent = {
            name: 'test',
            initialize: () => {},
            start: () => {},
            stop: () => {}
        };

        system.core.register('testComponent', testComponent);
        expect(system.core.get('testComponent')).toBe(testComponent);
    });

    it('should handle configuration', () => {
        // Test configuration access
        const focusSetSize = system.core.config.getNumber('FOCUS_SET_SIZE', 20);
        expect(typeof focusSetSize).toBe('number');

        const debugLogging = system.core.config.getBoolean('DEBUG_LOGGING', false);
        expect(typeof debugLogging).toBe('boolean');
    });

    it('should handle memory operations', async () => {
        // Test memory query functionality
        const tasks = await system.core.request('memory:query', {type: 'belief'});
        expect(Array.isArray(tasks)).toBe(true);

        // Test focus set retrieval
        const focusSet = await system.core.request('memory:get-focus-set');
        expect(Array.isArray(focusSet)).toBe(true);

        // Test memory stats
        const stats = await system.core.request('memory:getStats');
        expect(stats).toBeDefined();
        expect(typeof stats.tasks).toBe('number');
    });

    it('should handle reasoning operations', async () => {
        // Test reasoning with a simple task
        const task = createTask('test implication', 'implication', 0.8);
        task.terms = [
            {key: 'A'},
            {key: 'B'}
        ];

        const beliefs = await system.core.request('memory:query', {type: 'belief'});
        const result = await system.core.reasoning._processTask({task, beliefs});

        // Should return null for this simple test case since we don't have matching beliefs
        expect(result).toBeNull();
    });

    it('should handle cycle operations', () => {
        const stats = system.core.cycle._getStats();
        expect(stats).toBeDefined();
        expect(typeof stats.cycleCount).toBe('number');
        expect(typeof stats.running).toBe('boolean');
    });

    it('should handle plugin operations', () => {
        const plugins = system.core.plugins;
        expect(plugins).toBeDefined();

        // Test plugin registration
        const testPlugin = () => ({initialize: () => {}, start: () => {}, stop: () => {}});
        plugins.register('testPlugin', testPlugin);

        const pluginList = plugins.list();
        expect(pluginList).toContain('testPlugin');
    });

    it('should handle LM operations', async () => {
        const lm = system.core.lm;
        expect(lm).toBeDefined();

        // Test LM pipeline statistics
        const stats = lm.getPipelineStatistics();
        expect(stats).toBeDefined();
        expect(typeof stats.pipelineCount).toBe('number');
    });

    it('should handle tool operations', () => {
        const tools = system.core.tools;
        expect(tools).toBeDefined();

        // Test tool statistics if available
        if (typeof tools.getStatistics === 'function') {
            const stats = tools.getStatistics();
            expect(stats).toBeDefined();
        }
    });

    it('should handle self-management operations', () => {
        const self = system.core.self;
        expect(self).toBeDefined();

        // Test self stats
        const stats = self._getStats();
        expect(stats).toBeDefined();
        expect(stats.rules).toBeDefined();
    });

    it('should handle complete system lifecycle', async () => {
        // Test complete system start/stop cycle
        await system.start();
        expect(system.lifecycle.started).toBe(true);

        await system.stop();
        expect(system.lifecycle.started).toBe(false);
    });

    it('should handle error conditions gracefully', async () => {
        // Test invalid command
        const result = await system.core.request('nonexistent:command');
        expect(result).toBeNull();

        // Test rule evaluation with invalid context
        const results = system.core.evaluateRules(null);
        expect(Array.isArray(results)).toBe(true);
    });

    it('should maintain backward compatibility', () => {
        // Test that the system provides the expected interface
        expect(typeof system.initialize).toBe('function');
        expect(typeof system.start).toBe('function');
        expect(typeof system.stop).toBe('function');
        expect(typeof system.register).toBe('function');
        expect(typeof system.get).toBe('function');
        expect(typeof system.on).toBe('function');
        expect(typeof system.emit).toBe('function');
        expect(typeof system.request).toBe('function');
        expect(typeof system.getStatus).toBe('function');
    });
});