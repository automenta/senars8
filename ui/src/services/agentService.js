import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import log from '@common/utils/logger';
import {CONNECTION_STATUS, MESSAGE_TYPES} from '@/constants/ui';
import AgentCommunicationService from '@common/services/AgentCommunicationService.js';
import {CONFIG} from '@common/constants/config.js';

/**
 * A higher-level service that wraps the base AgentCommunicationService to add
 * application-specific functionality like Y.js for collaborative editing,
 * enhanced connection statistics, and a simplified API for the UI.
 */
class AgentService extends EventEmitter {
    constructor() {
        super();
        this.url = CONFIG.CONNECTION.WEBSOCKET_URL;
        this.crdtUrl = CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = CONFIG.CONNECTION.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = CONFIG.CONNECTION.RECONNECT_DELAY; // Initial delay in ms
        this.maxReconnectDelay = 30000; // Maximum delay in ms

        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

        this.connectionStats = {
            totalConnections: 0,
            totalFailedConnections: 0,
            lastConnectionAttempt: null,
            lastSuccessfulConnection: null,
            lastDisconnection: null,
            reconnectAttempts: 0
        };

        this.agentState = {};
        this.messageQueue = [];
        this.isReady = false;

        // Initialize the shared, low-level communication service
        this.communicationService = new AgentCommunicationService(this.url);
        this.setupEventForwarding();
    }

    /**
     * Sets up forwarding of events from the low-level communication service
     * to this higher-level service, allowing other parts of the application
     * to listen to a single source of events.
     */
    setupEventForwarding() {
        this.communicationService.on('status', (status) => {
            log.debug('Agent service status changed:', status);
            
            // Handle connection state changes
            switch (status) {
                case 'connected':
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.isReady = true;
                    this.connectionStats.totalConnections++;
                    this.connectionStats.lastSuccessfulConnection = new Date();
                    this.flushMessageQueue();
                    log.info('Connected to agent service');
                    break;
                    
                case 'disconnected':
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.isReady = false;
                    this.connectionStats.lastDisconnection = new Date();
                    this.attemptReconnect();
                    log.info('Disconnected from agent service');
                    break;
                    
                case 'connecting':
                    this.isConnecting = true;
                    this.isConnected = false;
                    this.isReady = false;
                    this.connectionStats.lastConnectionAttempt = new Date();
                    log.info('Connecting to agent service...');
                    break;
                    
                case 'failed':
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.isReady = false;
                    this.connectionStats.totalFailedConnections++;
                    this.attemptReconnect();
                    log.error('Failed to connect to agent service');
                    break;
            }

            this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS[status.toUpperCase()]);
            this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
        });

        this.communicationService.on('message', (message) => {
            this.handleIncomingMessage(message);
        });

        this.communicationService.on('error', (error) => {
            log.error('Communication service error:', error);
            this.emit(MESSAGE_TYPES.ERROR, error);
        });
    }

    /**
     * Attempts to reconnect to the agent service with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.warn(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
            return;
        }

        // Calculate delay with exponential backoff, capped at maxReconnectDelay
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this.reconnectAttempts++;
        this.connectionStats.reconnectAttempts = this.reconnectAttempts;

        log.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (!this.isConnected && !this.isConnecting) {
                this.connect();
            }
        }, delay);
    }

    /**
     * Connects to the agent and sets up collaborative editing.
     */
    connect() {
        if (this.isConnecting || this.isConnected) {
            log.warn('Connection attempt ignored: already connecting or connected.');
            return Promise.resolve();
        }

        this.connectionStats.lastConnectionAttempt = new Date();
        log.info('Attempting to connect to agent service...');

        // Start the low-level connection
        this.communicationService.connect();

        // Setup Y.js WebSocket provider for collaborative editing
        try {
            if (this.yProvider) {
                this.yProvider.destroy();
            }
            this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
            this.awareness = this.yProvider.awareness;
            this.awareness.on('change', () => this.emit('awareness_change'));
        } catch (error) {
            log.error('Error setting up collaborative editing:', error);
        }

        // Return a promise that resolves when connected
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000); // 10 second timeout

            const statusHandler = (status) => {
                if (status === 'connected') {
                    clearTimeout(timeout);
                    this.off('status', statusHandler);
                    resolve();
                } else if (status === 'failed') {
                    clearTimeout(timeout);
                    this.off('status', statusHandler);
                    reject(new Error('Connection failed'));
                }
            };

            this.on('status', statusHandler);
        });
    }

    /**
     * Disconnects from the agent and cleans up resources.
     */
    disconnect() {
        // Clear any reconnect timers
        this.reconnectAttempts = this.maxReconnectAttempts;
        
        this.communicationService.disconnect();

        if (this.yProvider) {
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
        }
        
        this.isConnected = false;
        this.isConnecting = false;
        this.isReady = false;
        this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.DISCONNECTED);
    }

    /**
     * Flushes the message queue when connection is established
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
     * Processes incoming messages, updates state, and emits events.
     * @param {object} message - The message received from the agent.
     */
    handleIncomingMessage(message) {
        if (!message || typeof message !== 'object' || !message.type) {
            log.error('Invalid message format received:', message);
            return;
        }

        log.debug('Received message:', message.type);

        if (message.type === 'system_stats' || message.type === MESSAGE_TYPES.AGENT_STATE_UPDATE) {
            this.agentState = {...this.agentState, ...message.payload};
            this.emit('system_stats', this.agentState);
        }

        // Forward the specific event and a generic 'message' event
        this.emit(message.type, message.payload);
        this.emit(MESSAGE_TYPES.MESSAGE, message);
    }

    /**
     * Sends a message to the agent via the communication service.
     * Queues messages if not connected.
     * @param {string} type - The message type.
     * @param {object} payload - The message payload.
     * @param {object} options - Additional options.
     * @returns {boolean} - True if the message was sent or queued, false otherwise.
     */
    sendMessage(type, payload, options = {}) {
        // If not ready, queue the message
        if (!this.isReady) {
            if (options.queue === false) {
                log.warn(`Message not sent (not ready): ${type}`, payload);
                return false;
            }
            
            log.debug(`Queueing message: ${type}`, payload);
            this.messageQueue.push({type, payload, options});
            return true;
        }

        log.debug(`Sending message: ${type}`, payload);
        return this.communicationService.sendMessage(type, payload, options);
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics object
     */
    getConnectionStats() {
        return {
            ...this.connectionStats,
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            isReady: this.isReady,
            queueLength: this.messageQueue.length
        };
    }

    // --- High-level API methods ---

    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    sendAgentControl(action) {
        return this.sendMessage('agentControl', {command: action});
    }

    startAgent() {
        return this.sendAgentControl('start');
    }

    stopAgent() {
        return this.sendAgentControl('stop');
    }

    resetAgent() {
        return this.sendAgentControl('reset');
    }

    search(query, options = {}) {
        return this.sendMessage('search', {
            query,
            scope: options.scope || 'all',
            limit: options.limit || 50,
            filters: options.filters || {}
        });
    }

    getTasks() {
        return this.sendMessage('get_tasks', {});
    }

    addTask(taskData) {
        return this.sendMessage('add_task', taskData);
    }

    updateTask(taskId, updates) {
        return this.sendMessage('update_task', {taskId, updates});
    }

    deleteTask(taskId) {
        return this.sendMessage('delete_task', {taskId});
    }

    getAgentState() {
        return {...this.agentState};
    }

    isAgentRunning() {
        return this.agentState.isRunning;
    }
    
    /**
     * Waits for the agent service to be ready
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} - Resolves when ready or rejects on timeout
     */
    waitForReady(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.isReady) {
                resolve(true);
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Agent service timeout'));
            }, timeout);

            const readyHandler = () => {
                clearTimeout(timeoutId);
                this.removeListener('status', readyHandler);
                resolve(true);
            };

            this.on('status', readyHandler);
        });
    }
}

// Export a singleton instance
const agentService = new AgentService();
export default agentService;
