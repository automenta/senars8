import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import log from '@common/utils/logger';
import {MESSAGE_TYPES, UI_CONSTANTS, CONNECTION_STATUS} from '@/constants/ui';
import AgentCommunicationService from '@common/services/AgentCommunicationService.js';

/**
 * A higher-level service that wraps the base AgentCommunicationService to add
 * application-specific functionality like Y.js for collaborative editing,
 * enhanced connection statistics, and a simplified API for the UI.
 */
class AgentService extends EventEmitter {
    constructor() {
        super();
        this.url = 'ws://localhost:8080';
        this.crdtUrl = 'ws://localhost:8080/crdt';
        this.isConnected = false;

        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

        this.connectionStats = {
            totalConnections: 0,
            totalFailedConnections: 0,
            lastConnectionAttempt: null,
            lastSuccessfulConnection: null,
            lastDisconnection: null
        };

        this.agentState = {};

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
            this.isConnected = (status === 'connected');

            if (status === 'connected') {
                this.connectionStats.totalConnections++;
                this.connectionStats.lastSuccessfulConnection = new Date();
            } else if (status === 'disconnected') {
                this.connectionStats.lastDisconnection = new Date();
            } else if (status === 'failed') {
                this.connectionStats.totalFailedConnections++;
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
     * Connects to the agent and sets up collaborative editing.
     */
    connect() {
        if (this.communicationService.isConnecting || this.isConnected) {
            log.warn('Connection attempt ignored: already connecting or connected.');
            return;
        }

        this.connectionStats.lastConnectionAttempt = new Date();
        log.info('Attempting to connect to agent service...');

        // Start the low-level connection
        this.communicationService.connect();

        // Setup Y.js WebSocket provider for collaborative editing
        this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
        this.awareness = this.yProvider.awareness;
        this.awareness.on('change', () => this.emit('awareness_change'));
    }

    /**
     * Disconnects from the agent and cleans up resources.
     */
    disconnect() {
        this.communicationService.disconnect();

        if (this.yProvider) {
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
        }
        this.isConnected = false;
        this.emit(MESSAGE_TYPES.STATUS, CONNECTION_STATUS.DISCONNECTED);
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
     * @param {string} type - The message type.
     * @param {object} payload - The message payload.
     * @param {object} options - Additional options.
     * @returns {boolean} - True if the message was sent or queued, false otherwise.
     */
    sendMessage(type, payload, options = {}) {
        return this.communicationService.sendMessage(type, payload, options);
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics object
     */
    getConnectionStats() {
        return {...this.connectionStats};
    }

    // --- High-level API methods ---

    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    sendAgentControl(action) {
        return this.sendMessage('agentControl', { command: action });
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
}

// Export a singleton instance
const agentService = new AgentService();
export default agentService;
