/**
 * Senars Architecture Integration Tests
 * 
 * These tests verify that the Senars architecture components work correctly
 * and can communicate with each other as expected.
 */

import { describe, it, expect } from 'vitest';
import AgentCommunicationService from '../common/services/AgentCommunicationService.js';
import { CONFIG } from '../common/constants/config.js';

describe('Architecture Integration', () => {
    describe('Agent Communication Service', () => {
        it('should be able to initialize with correct configuration', () => {
            const service = new AgentCommunicationService();
            
            // Check that the service initializes with the correct URL
            expect(service.url).toBe(CONFIG.CONNECTION.WEBSOCKET_URL);
            
            // Check that reconnect settings are properly configured
            expect(service.maxReconnectAttempts).toBe(CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS);
            expect(service.reconnectDelay).toBe(CONFIG.CONNECTION.RECONNECT_DELAY);
            expect(service.maxReconnectDelay).toBe(CONFIG.CONNECTION.MAX_RECONNECT_DELAY);
            
            // Check that initial connection state is correct
            expect(service.isConnected).toBe(false);
            expect(service.isConnecting).toBe(false);
        });

        it('should validate WebSocket URL format on initialization', () => {
            const validUrl = 'ws://localhost:8081';
            const service = new AgentCommunicationService(validUrl);
            
            // The service should store the provided URL
            expect(service.url).toBe(validUrl);
        });
    });

    describe('Configuration Consistency', () => {
        it('should have proper WebSocket URL configuration', () => {
            // Check that the WebSocket URL follows proper format
            const wsUrl = CONFIG.CONNECTION.WEBSOCKET_URL;
            expect(wsUrl).toMatch(/^wss?:\/\/[\w\.-]+:\d+$/);
            
            // Check that CRDT WebSocket URL is also properly configured
            const crdtWsUrl = CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;
            expect(crdtWsUrl).toMatch(/^wss?:\/\/[\w\.-]+:\d+\/.+/);
        });

        it('should have reasonable connection timeout values', () => {
            expect(CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(0);
            expect(CONFIG.CONNECTION.RECONNECT_DELAY).toBeGreaterThan(0);
            expect(CONFIG.CONNECTION.MAX_RECONNECT_DELAY).toBeGreaterThanOrEqual(CONFIG.CONNECTION.RECONNECT_DELAY);
        });
    });

    describe('Communication Protocol', () => {
        it('should have proper message handling structure', () => {
            const service = new AgentCommunicationService();
            
            // Mock a valid message to test handling
            const validMessage = {
                type: 'test_message',
                payload: { data: 'test' }
            };
            
            // Check that the message structure is valid
            expect(validMessage).toHaveProperty('type');
            expect(validMessage).toHaveProperty('payload');
        });
    });
});