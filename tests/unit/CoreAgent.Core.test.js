// tests/unit/CoreAgent.Core.test.js - Consolidated from coreagent/__tests__/Core.test.js
import {beforeEach, describe, expect, it} from 'vitest';
import createCore from '../../coreagent/Core.js';

describe('CoreAgent Core', () => {
    let core;

    beforeEach(() => {
        core = createCore();
    });

    it('should create a proxied core instance', async () => {
        expect(core).toBeDefined();
        expect(typeof core.register).toBe('function');
        expect(typeof core.get).toBe('function');
        expect(typeof core.on).toBe('function');
        expect(typeof core.emit).toBe('function');
    });

    it('should register and retrieve components', async () => {
        const mockComponent = {name: 'test', initialized: true};
        core.register('test', mockComponent);
        expect(core.get('test')).toBe(mockComponent);
        expect(core.test).toBe(mockComponent); // Proxied access
    });

    it('should initialize properly', async () => {
        await core.initialize();
        expect(core.lifecycle.initialized).toBe(true);
    });

    it('should handle events', async () => {
        await core.initialize();
        let receivedData = null;

        core.on('test:event', (data) => {
            receivedData = data;
        });

        await core.emit('test:event', {value: 'test'});

        expect(receivedData).toEqual({value: 'test'});
    });

    it('should handle commands', async () => {
        await core.initialize();

        core.messages.handle('test:command', (data) => {
            return {processed: true, original: data};
        });

        const result = await core.request('test:command', {test: 'data'});

        expect(result).toEqual({processed: true, original: {test: 'data'}});
    });

    it('should support rule evaluation', async () => {
        await core.initialize();

        core.addRule({
            id: 'test-rule',
            type: 'test',
            conditions: [(context) => context.data.test === true],
            action: (context) => ({ruleExecuted: true, context})
        });

        const results = core.evaluateRules({type: 'test', data: {test: true}});
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ruleExecuted: true, context: {type: 'test', data: {test: true}}});
    });
});