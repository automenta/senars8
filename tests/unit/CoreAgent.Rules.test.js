// tests/unit/CoreAgent.Rules.test.js - Consolidated from coreagent/__tests__/Rules.test.js
import {beforeEach, describe, expect, it} from 'vitest';
import Core from '../../coreagent/Core.js';
import Rules from '../../coreagent/Rules.js';

describe('CoreAgent Rules', () => {
    let core, rules;

    beforeEach(() => {
        core = new Core();
        rules = new Rules(core);
    });

    it('should add and retrieve rules', () => {
        const rule = {
            conditions: [(ctx) => ctx.test === true],
            action: (ctx) => ({result: 'test'})
        };

        const id = rules.addRule(rule);
        expect(typeof id).toBe('string');
        expect(rules.rules.length).toBe(1);
    });

    it('should evaluate matching rules', () => {
        const rule = {
            conditions: [(ctx) => ctx.test === true],
            action: (ctx) => ({result: 'success'})
        };

        rules.addRule(rule);

        const results = rules.evaluate({test: true});
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({result: 'success'});
    });

    it('should winnow rules by conditions', () => {
        const rule1 = {conditions: [(ctx) => ctx.test === true]};
        const rule2 = {conditions: [(ctx) => ctx.test === false]};
        const context = {test: true};

        const filtered = rules._winnowRules([rule1, rule2], context);
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toBe(rule1);
    });

    it('should index rules by type', () => {
        const rule = {type: 'test-type'};
        rules.addRule(rule);

        const stats = rules.getStats();
        expect(stats.rulesByType['test-type']).toBe(1);
    });

    it('should handle rule removal', () => {
        const rule = {id: 'test-rule'};
        const id = rules.addRule(rule);

        expect(rules.rules.length).toBe(1);

        rules.removeRule(id);
        expect(rules.rules.length).toBe(0);
    });

    it('should provide comprehensive statistics', () => {
        const rule1 = {type: 'type1'};
        const rule2 = {type: 'type2'};

        rules.addRule(rule1);
        rules.addRule(rule2);

        const stats = rules.getStats();
        expect(stats.totalRules).toBe(2);
        expect(stats.indexedTypes).toContain('type1');
        expect(stats.indexedTypes).toContain('type2');
        expect(stats.rulesByType.type1).toBe(1);
        expect(stats.rulesByType.type2).toBe(1);
    });

    it('should handle rules without conditions', () => {
        const rule = {
            action: (ctx) => ({result: 'no-conditions'})
        };

        rules.addRule(rule);

        const results = rules.evaluate({});
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({result: 'no-conditions'});
    });

    it('should handle rules with haltOnMatch', () => {
        const rule1 = {
            conditions: [(ctx) => true],
            action: (ctx) => ({result: 'first'}),
            haltOnMatch: true
        };
        const rule2 = {
            conditions: [(ctx) => true],
            action: (ctx) => ({result: 'second'})
        };

        rules.addRule(rule1);
        rules.addRule(rule2);

        const results = rules.evaluate({});
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({result: 'first'});
    });
});