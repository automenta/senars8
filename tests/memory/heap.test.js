import { describe, it, expect } from 'vitest';
import { createSystem } from '../../core/system/SystemFactory.js';
import comprehensiveSystemDemo from '../demos/comprehensive-system-demo.js';
import MockLM from '../mocks/MockLM.js';
import { join } from 'path';

describe('Memory Leak Analysis', () => {
  it('should verify that system.reset() properly clears memory after a single demo run', async () => {
    const getMemoryStats = (system) => {
      const stats = system.introspection.getMemoryStatistics();
      return `Terms: ${stats.terms}, Short-term Tasks: ${stats.shortTermTasks}, Long-term Tasks: ${stats.longTermTasks}`;
    };

    console.log('Creating initial system...');
    const system = await createSystem({ lm: { provider: 'mock' } }, { lm: new MockLM() });

    const initialStats = system.introspection.getMemoryStatistics();
    console.log(`Initial memory state: ${getMemoryStats(system)}`);

    console.log('Running a single comprehensive demo to simulate system usage...');
    const options = {
        assertions: () => {}, // No-op
        strategiesPath: join(process.cwd(), 'core/reasoner/strategies'),
        components: { lm: system.lm } // Use the system's LM
    };
    await comprehensiveSystemDemo(options);

    console.log(`Memory state after demo: ${getMemoryStats(system)}`);

    console.log('Resetting system...');
    await system.reset();

    const finalStats = system.introspection.getMemoryStatistics();
    console.log(`Memory state after reset: ${getMemoryStats(system)}`);

    // The number of terms and tasks should be reset to the initial state
    expect(finalStats.terms).toBe(initialStats.terms);
    expect(finalStats.shortTermTasks).toBe(initialStats.shortTermTasks);
    expect(finalStats.longTermTasks).toBe(initialStats.longTermTasks);

  }, 600000);
});