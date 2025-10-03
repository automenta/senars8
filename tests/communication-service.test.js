/**
 * Communication Service Integration Tests
 * 
 * Tests for WebSocket connection and message handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AgentCommunicationService from '../common/services/AgentCommunicationService.js';
import { CONFIG } from '../common/constants/config.js';

// Mock the createWebSocket function
vi.mock('../common/network.js', () => ({
  createWebSocket: vi.fn(() => Promise.resolve({
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    send: vi.fn(),
    close: vi.fn(),
  }))
}));

describe('Agent Communication Service Integration', () => {
  let service;
  const testUrl = 'ws://localhost:8081';

  beforeEach(() => {
    service = new AgentCommunicationService(testUrl);
  });

  afterEach(() => {
    // Ensure proper cleanup by disconnecting and clearing any potential timeouts
    if (service) {
      service.disconnect();
      // Clear any potential timeouts that might have been set
      if (service.reconnectTimer) {
        clearTimeout(service.reconnectTimer);
        service.reconnectTimer = null;
      }
    }
    vi.clearAllMocks();
  });

  it('should properly initialize connection state', () => {
    expect(service.url).toBe(testUrl);
    expect(service.isConnected).toBe(false);
    expect(service.isConnecting).toBe(false);
    expect(service.reconnectAttempts).toBe(0);
  });

  it('should connect with proper state transitions', () => {
    const statusHandler = vi.fn();
    service.on('status', statusHandler);

    service.connect();

    expect(service.isConnecting).toBe(true);
    expect(statusHandler).toHaveBeenCalledWith('connecting');
  });

  it('should handle successful connection', async () => {
    const statusHandler = vi.fn();
    service.on('status', statusHandler);

    service.connect();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    // Simulate successful connection
    service.onOpen();

    expect(service.isConnected).toBe(true);
    expect(service.isConnecting).toBe(false);
    expect(statusHandler).toHaveBeenCalledWith('connected');
  });

  it('should handle connection failure with reconnection logic', async () => {
    const statusHandler = vi.fn();
    const errorHandler = vi.fn();
    service.on('status', statusHandler);
    service.on('error', errorHandler); // Listen for error events to prevent unhandled errors

    // Set to max attempts to test failure
    service.reconnectAttempts = service.maxReconnectAttempts;

    service.connect();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Call the onError handler directly to simulate the error
    service.onError(new Error('Connection failed'));
    
    // Wait a bit more to allow for any async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(service.isConnected).toBe(false);
    expect(service.isConnecting).toBe(false);
    expect(statusHandler).toHaveBeenCalledWith('failed');
    expect(errorHandler).toHaveBeenCalledWith('WebSocket connection error');
  });

  it('should properly send messages when connected', async () => {
    service.connect();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    service.onOpen(); // Simulate connection

    const sendMessageResult = service.sendMessage('testType', { testData: 'value' });

    expect(sendMessageResult).toBe(true);
  });

  it('should queue messages when not connected', () => {
    // Don't connect, keep disconnected
    service.sendMessage('testType', { testData: 'value' }, { queue: true });

    expect(service.messageQueue.length).toBe(1);
    expect(service.messageQueue[0]).toEqual({
      type: 'testType',
      payload: { testData: 'value' },
      options: { queue: true }
    });
  });
});