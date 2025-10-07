// coreagent/__tests__/Rules.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createCore } from '../createCore.js';

describe('Rules', () => {
  let system, rules;

  beforeEach(async () => {
    system = createCore();
    await system.initialize();
    rules = system.rules;
  });

  it('should add and retrieve rules', () => {
    const rule = {
      conditions: [(ctx) => ctx.test === true],
      action: (ctx) => ({ result: 'test' })
    };
    
    const id = rules.addRule(rule);
    expect(typeof id).toBe('string');
    expect(rules.rules.length).toBe(1);
  });

  it('should evaluate matching rules', () => {
    const rule = {
      conditions: [(ctx) => ctx.test === true],
      action: (ctx) => ({ result: 'success' })
    };
    
    rules.addRule(rule);
    
    const results = rules.evaluate({ test: true });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ result: 'success' });
  });

  it('should winnow rules by conditions', () => {
    const rule1 = { conditions: [(ctx) => ctx.test === true] };
    const rule2 = { conditions: [(ctx) => ctx.test === false] };
    const context = { test: true };
    
    const filtered = rules._winnowRules([rule1, rule2], context);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(rule1);
  });

  it('should index rules by type', () => {
    const rule = { type: 'test-type' };
    rules.addRule(rule);
    
    const stats = rules.getStats();
    expect(stats.rulesByType['test-type']).toBe(1);
  });
});