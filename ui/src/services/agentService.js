import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import log from '@/utils/logger';

class AgentService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.url = 'ws://localhost:8080';
        this.crdtUrl = 'ws://localhost:8080/crdt';
        this.isConnected = false;
        this.isConnecting = false;  // Track connection state to avoid multiple connection attempts
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000; // 3 seconds
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
                
                this.emit('status', 'connected');
                this.emit('connection_stats', this.connectionStats);
                log.info('WebSocket connected successfully');
                
                // Send any pending messages
                this.sendPendingMessages();
            };

            this.ws.onclose = (event) => {
                this.isConnected = false;
                this.isConnecting = false;
                this.connectionStats.lastDisconnection = new Date();
                
                log.info(`WebSocket disconnected: ${event.reason || 'no reason'}. Code: ${event.code}`);
                this.emit('status', 'disconnected');
                
                // Attempt to reconnect unless it was a deliberate close
                if (event.code !== 1000) { // 1000 is normal closure
                    this.attemptReconnect();
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.emit(message.type, message.payload);
                    this.emit('message', message); // Also emit a generic message event
                } catch (error) {
                    log.error('Failed to parse incoming message:', event.data, error);
                    this.emit('error', { type: 'parse_error', message: event.data, error: error.message });
                }
            };

            this.ws.onerror = (error) => {
                log.error('WebSocket error:', error);
                this.emit('error', error);
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
            this.emit('status', 'failed');
            this.emit('connection_stats', this.connectionStats);
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
            this.yProvider.disconnect();
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
        }
        
        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    sendMessage(type, payload) {
        if (!this.isConnected) {
            // Add to pending messages if not connected
            this.pendingMessages.push({ type, payload });
            log.warn(`Not connected, queuing message: ${type}. Queue size: ${this.pendingMessages.length}`);
            return false;
        }
        
        try {
            this.ws.send(JSON.stringify({type, payload}));
            return true;
        } catch (error) {
            log.error('Failed to send message:', error);
            this.emit('error', { type: 'send_error', message: { type, payload }, error: error.message });
            
            // Add to pending messages and attempt to reconnect
            this.pendingMessages.push({ type, payload });
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
                this.sendMessage(message.type, message.payload);
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
