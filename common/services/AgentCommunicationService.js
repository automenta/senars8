import {EventEmitter} from 'events';
import {CONFIG} from '@common/constants/config.js';
import log from '@core/utils/logger.js';
import {createWebSocket} from '@common/network.js';

/**
 * A universal agent communication service that provides a robust, resilient
 * connection to the agent server for both TUI and WebUI clients.
 *
 * Key Features:
 * - Automatic reconnection with exponential backoff
 * - Message queueing for offline support
 * - Centralized event-driven API for status and data
 * - Detailed connection statistics
 */
class AgentCommunicationService extends EventEmitter {
    constructor(url = CONFIG.CONNECTION.WEBSOCKET_URL) {
        super();
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = CONFIG.CONNECTION.RECONNECT_DELAY;
        this.maxReconnectDelay = CONFIG.CONNECTION.MAX_RECONNECT_DELAY;
        this.reconnectTimer = null;
        this.messageQueue = [];

        this.connectionStats = {
            totalConnections: 0,
            totalFailedConnections: 0,
            lastConnectionAttempt: null,
            lastSuccessfulConnection: null,
            lastDisconnection: null,
            reconnectAttempts: 0,
        };
    }

    /**
     * Establishes a connection to the WebSocket server.
     */
    connect() {
        if (this.isConnecting || this.isConnected) {
            log.warn('Connection attempt ignored: already connecting or connected.');
            return;
        }

        this.isConnecting = true;
        this.connectionStats.lastConnectionAttempt = new Date();
        this.emit('status', 'connecting');
        log.info('Connecting to agent service...');

        try {
            this.ws = createWebSocket(this.url);
            this.ws.onopen = this.onOpen.bind(this);
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onmessage = this.onMessage.bind(this);
            this.ws.onerror = this.onError.bind(this);
        } catch (error) {
            log.error('Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.handleConnectionFailure();
        }
    }

    /**
     * Disconnects from the WebSocket server.
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close(1000, 'Client disconnected');
        }
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('status', 'disconnected');
    }

    /**
     * Handles successful WebSocket connection.
     */
    onOpen() {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.connectionStats.totalConnections++;
        this.connectionStats.lastSuccessfulConnection = new Date();
        this.emit('status', 'connected');
        log.info('Connected to agent service.');
        this.flushMessageQueue();
    }

    /**
     * Handles WebSocket disconnection.
     */
    onClose(event) {
        this.isConnected = false;
        this.isConnecting = false;
        this.connectionStats.lastDisconnection = new Date();
        log.info(`Disconnected from agent service. Code: ${event.code}, Reason: ${event.reason}`);

        if (event.code !== 1000) { // 1000 is a normal closure
            this.attemptReconnect();
        } else {
            this.emit('status', 'disconnected');
        }
    }

    /**
     * Handles incoming WebSocket messages.
     */
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            if (!message || typeof message !== 'object' || !message.type) {
                log.error('Invalid message format received:', message);
                return;
            }
            log.debug('Received message:', message.type);
            this.emit('message', message);
            this.emit(message.type, message.payload);
        } catch (error) {
            log.error('Failed to parse incoming message:', error);
            this.emit('error', 'Failed to parse message');
        }
    }

    /**
     * Handles WebSocket errors.
     */
    onError(error) {
        log.error('WebSocket error:', error.message);
        this.isConnecting = false;
        if (!this.isConnected) {
            this.handleConnectionFailure();
        }
        this.emit('error', 'WebSocket connection error');
    }

    /**
     * Manages connection failures and attempts to reconnect.
     */
    handleConnectionFailure() {
        this.connectionStats.totalFailedConnections++;
        this.emit('status', 'failed');
        this.attemptReconnect();
    }

    /**
     * Attempts to reconnect to the server with exponential backoff.
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached.`);
            return;
        }

        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this.reconnectAttempts++;
        this.connectionStats.reconnectAttempts = this.reconnectAttempts;

        log.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected && !this.isConnecting) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Sends all messages waiting in the queue.
     */
    flushMessageQueue() {
        if (this.messageQueue.length > 0) {
            log.info(`Flushing message queue (${this.messageQueue.length} messages)`);
            while (this.messageQueue.length > 0) {
                const {type, payload, options} = this.messageQueue.shift();
                this.sendMessage(type, payload, options);
            }
        }
    }

    /**
     * Sends a message to the server.
     */
    sendMessage(type, payload, options = {}) {
        if (!this.isConnected) {
            if (options.queue !== false) {
                log.debug(`Queueing message: ${type}`, payload);
                this.messageQueue.push({type, payload, options});
            } else {
                log.warn(`Message not sent (not connected): ${type}`, payload);
            }
            return false;
        }

        try {
            log.debug(`Sending message: ${type}`, payload);
            this.ws.send(JSON.stringify({type, payload}));
            return true;
        } catch (error) {
            log.error('Failed to send message:', error);
            this.emit('error', 'Failed to send message');
            return false;
        }
    }

    /**
     * Returns the current connection statistics.
     */
    getConnectionStats() {
        return {
            ...this.connectionStats,
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            queueLength: this.messageQueue.length,
        };
    }
}

export default AgentCommunicationService;