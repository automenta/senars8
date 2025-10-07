import { describe, it, expect } from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import Memory from '../../core/memory/Memory.js';
import { EventEmitter } from 'events';
import CommandBus from '../../core/system/CommandBus.js';

describe('Temporary Unit Tests for Bug Fixes', () => {
  it('should allow task punctuation to be modified for tests', () => {
    const term = new Term('test_term', [0.5, 0.8]);
    const task = new Task(term, '.', { frequency: 0.8, confidence: 0.9 });
    const updatedTask = task.withPunctuation('!');
    expect(updatedTask.punctuation).toBe('!');
    expect(task.punctuation).toBe('.');
  });

  it('should use the correct embeddingStore reference', async () => {
    const eventBus = new EventEmitter();
    const commandBus = new CommandBus(eventBus);
    const configManager = {
      getNumber: (key, defaultValue) => defaultValue || 20,
      getString: (key, defaultValue) => defaultValue || '',
      getBoolean: (key, defaultValue) => defaultValue || false,
      getObject: (key, defaultValue) => defaultValue || {}
    };
    const memory = new Memory(configManager, eventBus, commandBus);
    memory.embeddingStore.set('test_query', [0.1, 0.2, 0.3]);
    const results = await memory.findTasksBySemanticQuery('test_query');
    expect(results).toEqual([]);
  });
});