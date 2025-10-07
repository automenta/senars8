// coreagent/__tests__/System.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { System } from '../System.js';

describe('System', () => {
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
    const mockComponent = { name: 'test', test: true };
    system.register('testComponent', mockComponent);
    
    const retrieved = system.get('testComponent');
    expect(retrieved).toBe(mockComponent);
  });

  it('should handle events and commands', async () => {
    let received = null;
    system.on('test:system', (data) => {
      received = data;
    });
    
    await system.emit('test:system', { message: 'hello' });
    expect(received).toEqual({ message: 'hello' });
  });

  it('should get system status', () => {
    const status = system.getStatus();
    
    expect(status.initialized).toBe(true);
    expect(Array.isArray(status.components)).toBe(true);
    expect(status.stats).toBeDefined();
  });
});