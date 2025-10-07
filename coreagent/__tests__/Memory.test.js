// coreagent/__tests__/Memory.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createCore } from '../createCore.js';
import { createTask } from '../utils.js';

describe('Memory', () => {
  let system, memory;

  beforeEach(async () => {
    system = createCore();
    await system.initialize();
    memory = system.memory;
  });

  it('should add and retrieve tasks', async () => {
    const task = createTask('test content');
    await memory._addTask(task);
    
    const retrieved = memory._getById(task.id);
    expect(retrieved).toEqual(task);
  });

  it('should query tasks by type', async () => {
    const belief = createTask('belief content', 'belief', 0.8);
    const goal = createTask('goal content', 'goal', 0.9);
    
    await memory._addTask(belief);
    await memory._addTask(goal);
    
    const beliefs = await system.request('memory:query', { type: 'belief' });
    expect(beliefs).toContainEqual(belief);
    expect(beliefs).not.toContainEqual(goal);
  });

  it('should maintain focus set', async () => {
    const highPriority = createTask('high', 'belief', 0.9);
    const lowPriority = createTask('low', 'belief', 0.2);
    
    await memory._addTask(lowPriority);
    await memory._addTask(highPriority);
    
    const focusSet = memory._getFocusSet();
    expect(focusSet[0]).toEqual(highPriority);
  });

  it('should emit events when adding tasks', async () => {
    let taskAdded = null;
    system.on('task:add', (task) => {
      taskAdded = task;
    });
    
    const task = createTask('event test');
    await memory._addTask(task);
    
    expect(taskAdded).toEqual(task);
  });
});