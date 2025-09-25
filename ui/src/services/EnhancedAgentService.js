import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import log from '@/utils/logger';
import {MESSAGE_TYPES, UI_CONSTANTS, CONNECTION_STATUS} from '@/constants/ui';
import BaseAgentCommunicationService from '@common/services/AgentCommunicationService.js';

/**
 * Enhanced Agent Service for Web UI
 * Uses shared communication service while maintaining Y.js CRDT functionality
 */
class EnhancedAgentService extends EventEmitter {
    constructor() {
        super();
        this.url = 'ws://localhost:8080';
        this.crdtUrl = 'ws://localhost:8080/crdt';
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = UI_CONSTANTS.CONNECTION.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = UI_CONSTANTS.CONNECTION.RECONNECT_DELAY;
        this.reconnectTimer = null;
        this.connectionStartTime = null;

        // Initialize Y.js for collaborative features
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

        // Store agent state that comes from backend
        this.agentState = {
            isRunning: false,
            beliefsCount: 0,
            goalsCount: 0,
            questionsCount: 0,
            cycleCount: 0
        };

        // Initialize the shared communication service
        this.communicationService = new BaseAgentCommunicationService(this.url);
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
            // Setup Y.js WebSocket provider for collaborative editing
            this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
            this.awareness = this.yProvider.awareness;

            // Listen to awareness changes to emit events
            this.awareness.on('change', () => {
                this.emit('awareness_change');
            });

            // Use the shared communication service
            this.communicationService.on('status', (status) => {
                if (status === 'connected') {
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.connectionStats.totalConnections++;
                    this.connectionStats.lastSuccessfulConnection = new Date();

                    // Clear any reconnect timer that might be active
                    if (this.reconnectTimer) {
                        clearTimeout(this.reconnectTimer);
                        this.reconnectTimer = null;
                    }

                    this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.CONNECTED);
                    this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
                    log.info('WebSocket connected successfully');

                    // Send any pending messages
                    this.sendPendingMessages();
                } else if (status === 'disconnected') {
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.connectionStats.lastDisconnection = new Date();

                    log.info('WebSocket disconnected');
                    this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.DISCONNECTED);
                } else if (status === 'failed') {
                    log.error('Connection failed');
                    this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.FAILED);
                    this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
                }
            });

            // Listen for all incoming messages from the communication service
            this.communicationService.on('message', (message) => {
                this.handleIncomingMessage(message);
            });

            // Also listen for specific message types
            this.communicationService.on('system_stats', (stats) => {
                this.agentState = {...this.agentState, ...stats};
                log.debug('Agent state updated:', this.agentState);
                this.emit('system_stats', stats);
            });

            this.communicationService.on('add_belief', (belief) => {
                this.emit('add_belief', belief);
            });

            this.communicationService.on('add_goal', (goal) => {
                this.emit('add_goal', goal);
            });

            this.communicationService.on('add_question', (question) => {
                this.emit('add_question', question);
            });

            this.communicationService.on('task_added', (task) => {
                this.emit('task_added', task);
            });

            this.communicationService.on('reasoning_step', (step) => {
                this.emit('reasoning_step', step);
            });

            this.communicationService.on('logMessage', (logMsg) => {
                this.emit('logMessage', logMsg);
            });

            this.communicationService.on('error', (error) => {
                log.error('Communication service error:', error);
                this.emit(MESSAGE_TYPES.ERROR, error);
            });

            // Start the connection process
            this.communicationService.connect();
        } catch (error) {
            log.error('Failed to establish WebSocket connection:', error);
            this.isConnecting = false;
            this.connectionStats.totalFailedConnections++;
            this.emit('error', error);

            // Attempt to reconnect if connection failed
            this.attemptReconnect();
        }
    }

    handleIncomingMessage(message) {
        try {
            // Validate message structure
            if (!message || typeof message !== 'object' || !message.type) {
                log.error('Invalid message format received:', message);
                return;
            }

            // Handle agent state updates
            if (message.type === MESSAGE_TYPES.AGENT_STATE_UPDATE) {
                this.agentState = {...this.agentState, ...message.payload};
                log.debug('Agent state updated:', this.agentState);
            }

            this.emit(message.type, message.payload);
            this.emit(MESSAGE_TYPES.MESSAGE, message); // Also emit a generic message event
        } catch (error) {
            log.error('Failed to handle incoming message:', message, error);
            this.emit(MESSAGE_TYPES.ERROR, {
                type: MESSAGE_TYPES.PARSE_ERROR,
                message: message,
                error: error.message
            });
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
            this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.FAILED);
            this.emit(MESSAGE_TYPES.CONNECTION_STATS, this.connectionStats);
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics object
     */
    getConnectionStats() {
        return {...this.connectionStats};
    }

    disconnect() {
        this.isConnecting = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Disconnect the communication service
        this.communicationService.disconnect();

        if (this.yProvider) {
            // Cleanup yjs provider
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
        }

        // Clear any pending messages on disconnect
        this.pendingMessages = [];

        this.isConnected = false;
        this.emit('status', CONNECTION_STATUS.DISCONNECTED);
    }

    sendMessage(type, payload, options = {}) {
        const {timeout = 10000, retries = 3, priority = 1} = options;

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

        if (!this.communicationService.isConnected) {
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
                    this.emit(MESSAGE_TYPES.MESSAGE_TIMEOUT, {message: messageObj, timeout});
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

            // Use the shared communication service to send the message
            return this.communicationService.sendMessage(type, payload, options);
        } catch (error) {
            log.error('Failed to send message:', error);
            this.emit(MESSAGE_TYPES.SEND_ERROR, {
                type: MESSAGE_TYPES.SEND_ERROR,
                message: {type, payload},
                error: error.message
            });

            // Add to pending messages and attempt to reconnect
            this.pendingMessages.push(messageObj);
            return false;
        }
    }

    sendPendingMessages() {
        if (this.pendingMessages.length > 0 && this.communicationService.isConnected) {
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

    // Agent control methods
    sendAgentControl(action) {
        const message = {
            type: MESSAGE_TYPES.AGENT_CONTROL,
            payload: {command: action},
        };
        return this.sendMessage(message.type, message.payload);
    }

    // Additional agent control methods for better integration
    sendAgentStart() {
        return this.sendAgentControl('start');
    }

    sendAgentStop() {
        return this.sendAgentControl('stop');
    }

    sendAgentReset() {
        return this.sendAgentControl('reset');
    }

    search(query, options = {}) {
        const message = {
            type: MESSAGE_TYPES.SEARCH,
            payload: {
                query,
                scope: options.scope || 'all',
                limit: options.limit || 50,
                filters: options.filters || {}
            },
        };
        return this.sendMessage(message);
    }

    // Task management methods
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

    // Agent state access methods
    getAgentState() {
        return {...this.agentState};
    }

    isAgentRunning() {
        return this.agentState.isRunning;
    }

    getBeliefsCount() {
        return this.agentState.beliefsCount;
    }

    getGoalsCount() {
        return this.agentState.goalsCount;
    }

    getQuestionsCount() {
        return this.agentState.questionsCount;
    }

    getCycleCount() {
        return this.agentState.cycleCount;
    }

    // Additional methods for agent management
    startAgent() {
        return this.sendAgentControl('start');
    }

    stopAgent() {
        return this.sendAgentControl('stop');
    }

    resetAgent() {
        return this.sendAgentControl('reset');
    }

    // Narsese method
    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    // Natural language method
    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    // Enhanced error handling for agent operations
    async safeAgentOperation(operationName, operation, options = {}) {
        const {retries = 3, timeout = 10000, onError = null} = options;
        let attempts = 0;

        while (attempts < retries) {
            try {
                return await Promise.race([
                    operation(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`)), timeout)
                    )
                ]);
            } catch (error) {
                attempts++;
                log.error(`Agent operation ${operationName} failed (attempt ${attempts}/${retries}):`, error.message);

                if (onError) {
                    onError(error, attempts);
                }

                if (attempts >= retries) {
                    // Emit error event for UI to handle
                    this.emit(MESSAGE_TYPES.ERROR, {
                        type: 'AGENT_OPERATION_FAILED',
                        operation: operationName,
                        error: error.message,
                        attempts
                    });

                    throw error;
                }

                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
            }
        }
    }
}

// Export a singleton instance
const enhancedAgentService = new EnhancedAgentService();
export default enhancedAgentService;