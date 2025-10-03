import { describe, it, expect, vi } from 'vitest';
import { eventBus } from './eventBus';

describe('EventBus', () => {
  it('should allow a listener to be added and triggered', () => {
    const listener = vi.fn();
    eventBus.on('test-event', listener);
    eventBus.emit('test-event', 'payload');
    expect(listener).toHaveBeenCalledWith('payload');
    eventBus.off('test-event', listener); // Cleanup
  });

  it('should not add the same listener twice for the same event', () => {
    const listener = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    eventBus.on('duplicate-test', listener);
    eventBus.on('duplicate-test', listener);

    eventBus.emit('duplicate-test');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Duplicate listener for event "duplicate-test" detected.');

    consoleWarnSpy.mockRestore();
    eventBus.off('duplicate-test', listener); // Cleanup
  });

  it('should allow two different listeners for the same event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    eventBus.on('multiple-listeners', listener1);
    eventBus.on('multiple-listeners', listener2);

    eventBus.emit('multiple-listeners');

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    eventBus.off('multiple-listeners', listener1);
    eventBus.off('multiple-listeners', listener2);
  });

  it('should remove a listener correctly with off()', () => {
    const listener = vi.fn();
    eventBus.on('remove-test', listener);
    eventBus.off('remove-test', listener);
    eventBus.emit('remove-test');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should alias addListener to on', () => {
    expect(eventBus.addListener).toBe(eventBus.on);
  });

  it('should alias removeListener to off', () => {
    expect(eventBus.removeListener).toBe(eventBus.off);
  });
});