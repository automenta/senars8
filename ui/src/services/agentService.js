import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import log from '@/utils/logger';
import { UI_CONSTANTS, MESSAGE_TYPES } from '@/constants/ui';

class AgentService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.url = 'ws://localhost:8080';
        this.crdtUrl = 'ws://localhost:8080/crdt';
        this.isConnected = false;
        this.isConnecting = false;  // Track connection state to avoid multiple connection attempts
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = UI_CONSTANTS.CONNECTION.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = UI_CONSTANTS.CONNECTION.RECONNECT_DELAY; // 3 seconds
        this.reconnectTimer = null;
        this.connectionStartTime = null;
        
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;
        
        // Store pending messages when disconnected
        this.pendingMessages = [];
        
        // Track connection statistics
        this.connectionStats = {
            totalConnections: 0,
            totalFailedConnections: 0,
            totalReconnections: 0,
            lastConnectionAttempt: null,
            lastSuccessfulConnection: null,
            lastDisconnection: null
        };
    }

    connect() {
        if (this.isConnecting) {
            log.warn('Connection attempt already in progress');
            return;
        }
        
        if (this.isConnected) {
            log.warn('Already connected, skipping connection attempt');
            return;
        }

        this.isConnecting = true;
        this.connectionStartTime = Date.now();
        this.connectionStats.lastConnectionAttempt = new Date();
        log.info('Attempting to connect to agent service...');

        try {
            // Setup Y.js WebSocket provider
            this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
            this.awareness = this.yProvider.awareness;
            
            // Listen to awareness changes to emit events
            this.awareness.on('change', () => {
                this.emit('awareness_change');
            });

            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0; // Reset on successful connection
                this.connectionStats.totalConnections++;
                this.connectionStats.lastSuccessfulConnection = new Date();
                
                // Clear any reconnect timer that might be active
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                
                this.emit(MESSAGE_TYPES.STATUS, 'connected');
                this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
                log.info('WebSocket connected successfully');
                
                // Send any pending messages
                this.sendPendingMessages();
            };

            this.ws.onclose = (event) => {
                this.isConnected = false;
                this.isConnecting = false;
                this.connectionStats.lastDisconnection = new Date();
                
                log.info(`WebSocket disconnected: ${event.reason || 'no reason'}. Code: ${event.code}`);
                this.emit(MESSAGE_TYPES.STATUS, 'disconnected');
                
                // Attempt to reconnect unless it was a deliberate close
                if (event.code !== 1000) { // 1000 is normal closure
                    this.attemptReconnect();
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    // Validate message structure
                    if (!message || typeof message !== 'object' || !message.type) {
                        log.error('Invalid message format received:', event.data);
                        return;
                    }
                    
                    this.emit(message.type, message.payload);
                    this.emit(MESSAGE_TYPES.MESSAGE, message); // Also emit a generic message event
                } catch (error) {
                    log.error('Failed to parse incoming message:', event.data, error);
                    this.emit(MESSAGE_TYPES.ERROR, { type: MESSAGE_TYPES.PARSE_ERROR, message: event.data, error: error.message });
                }
            };

            this.ws.onerror = (error) => {
                log.error('WebSocket error:', error);
                this.emit(MESSAGE_TYPES.ERROR, error);
            };
        } catch (error) {
            log.error('Failed to establish WebSocket connection:', error);
            this.isConnecting = false;
            this.connectionStats.totalFailedConnections++;
            this.emit('error', error);
            
            // Attempt to reconnect if connection failed
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.connectionStats.totalReconnections++;
            log.warn(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            log.error('Max reconnection attempts reached, giving up.');
            this.emit(MESSAGE_TYPES.STATUS, 'failed');
                this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
        }
    }
    
    /**
     * Get connection statistics
     * @returns {Object} Connection statistics object
     */
    getConnectionStats() {
        return { ...this.connectionStats };
    }

    disconnect() {
        this.isConnecting = false;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting'); // 1000 is normal closure code
            this.ws = null;
        }
        
        if (this.yProvider) {
            // Cleanup yjs provider
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
        }
        
        // Clear any pending messages on disconnect
        this.pendingMessages = [];
        
        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    sendMessage(type, payload, options = {}) {
        const { timeout = 10000, retries = 3, priority = 1 } = options;
        
        // Validate inputs
        if (!type) {
            log.error('Message type is required');
            return false;
        }
        
        if (typeof payload === 'undefined' || payload === null) {
            log.warn('Sending message with null/undefined payload:', type);
            payload = {};
        }
        
        // Create message object with metadata
        const messageObj = {
            type,
            payload,
            timestamp: Date.now(),
            id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            priority
        };
        
        if (!this.isConnected) {
            // Add to pending messages if not connected
            this.pendingMessages.push(messageObj);
            log.warn(`Not connected, queuing message: ${type}. Queue size: ${this.pendingMessages.length}`);
            
            // Attempt to reconnect if we haven't recently tried
            if (!this.isConnecting) {
                this.connect();
            }
            
            return false;
        }
        
        try {
            // Add timeout mechanism for messages that require responses
            if (options.expectResponse) {
                const timeoutId = setTimeout(() => {
                    log.warn(`Message ${messageObj.id} timed out after ${timeout}ms`);
                    this.emit(MESSAGE_TYPES.MESSAGE_TIMEOUT, { message: messageObj, timeout });
                }, timeout);
                
                // Store timeout ID for potential cleanup
                messageObj.timeoutId = timeoutId;
            }
            
            const messageStr = JSON.stringify({type, payload});
            
            // Validate that the message string is not too large (avoid WebSocket limits)
            if (messageStr.length > UI_CONSTANTS.CONNECTION.PENDING_MESSAGE_MAX_SIZE) { // 64KB limit
                log.error(`Message too large to send: ${messageStr.length} bytes`);
                return false;
            }
            
            // Verify WebSocket is still open before sending
            if (this.ws.readyState !== WebSocket.OPEN) {
                log.error('WebSocket is not open, cannot send message');
                this.pendingMessages.push(messageObj);
                return false;
            }
            
            this.ws.send(messageStr);
            return true;
        } catch (error) {
            log.error('Failed to send message:', error);
            this.emit(MESSAGE_TYPES.SEND_ERROR, { type: MESSAGE_TYPES.SEND_ERROR, message: { type, payload }, error: error.message });
            
            // Add to pending messages and attempt to reconnect
            this.pendingMessages.push(messageObj);
            return false;
        }
    }
    
    sendPendingMessages() {
        if (this.pendingMessages.length > 0 && this.isConnected) {
            log.info(`Sending ${this.pendingMessages.length} pending messages`);
            
            // Send all pending messages
            const messagesToSend = [...this.pendingMessages];
            this.pendingMessages = []; // Clear the queue
            
            messagesToSend.forEach(message => {
                try {
                    this.sendMessage(message.type, message.payload);
                } catch (error) {
                    log.error('Error sending pending message:', error, message);
                    // Re-queue the message if there was an error
                    this.pendingMessages.push(message);
                }
            });
        }
    }

    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', { text, intent });
    }

    sendAgentControl(command) {
        return this.sendMessage('agentControl', {command});
    }
}

// Export a singleton instance
const agentService = new AgentService();
export default agentService;
