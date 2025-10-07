import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import logger from '../utils/uiLogger.js';
import {CONFIG} from '../../../common/constants/config.js';

// Use the shared config for collaborative editing
const DEFAULT_CONFIG = {
    CONNECTION: {
        CRDT_WEBSOCKET_URL: CONFIG.CONNECTION.CRDT_WEBSOCKET_URL // Default collaborative editing WebSocket from shared config
    }
};

/**
 * A high-level service for the Web UI with Web UI-specific features like collaborative editing (Y.js).
 */
class AgentService {
    constructor(url) {
        // Use EventEmitter-like functionality with a simple implementation
        this._events = {};

        this.url = url;
        this.logger = logger.create('AgentServiceUI');
        this.crdtUrl = DEFAULT_CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;

        // Y.js for collaborative editing
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

        // Initialize WebSocket connection
        this.connection = null;
        this.isConnected = false;
        this.agentState = {
            isRunning: false,
            cycleCount: 0,
            tasks: [],
            beliefs: [],
            goals: [],
            questions: [],
            notifications: [],
            connectionStatus: 'disconnected',
        };
    }

    /**
     * Event system - simple implementation
     */
    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);
    }

    off(event, callback) {
        if (this._events[event]) {
            this._events[event] = this._events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(callback => callback(data));
        }
    }

    /**
     * Connect to the agent
     */
    connect() {
        if (!this.url) {
            this.logger.error("No URL specified for AgentService connection.");
            return;
        }

        // Create WebSocket connection
        this.connection = new WebSocket(this.url);

        this.connection.onopen = () => {
            this.isConnected = true;
            this.agentState.connectionStatus = 'connected';
            this.emit('status', 'connected');
            this.logger.info('Connected to agent');

            // Request initial state
            this.sendMessage('get_system_stats');
            this.sendMessage('get_tasks');
            this.sendMessage('get_beliefs');
            this.sendMessage('get_goals');

            // Setup collaborative editing when connected
            this.setupCollaborativeEditing();
        };

        this.connection.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._handleIncomingMessage(message);
            } catch (error) {
                this.logger.error(`Failed to parse incoming message as JSON: ${error.message}`);
                this.emit('error', {type: 'json_parse_error', message: error.message, data: event.data});
            }
        };

        this.connection.onclose = (event) => {
            this.isConnected = false;
            this.agentState.connectionStatus = 'disconnected';
            this.emit('status', 'disconnected');
            this.logger.info(`Disconnected from agent: ${event.code} - ${event.reason}`);
        };

        this.connection.onerror = (error) => {
            this.logger.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    /**
     * Disconnect from the agent
     */
    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
            this.isConnected = false;
        }

        // Clean up collaborative editing
        if (this.yProvider) {
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
            this.logger.info('Collaborative editing service disconnected.');
        }
    }

    /**
     * Send a message to the agent
     */
    sendMessage(type, payload = {}) {
        if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
            this.logger.warn(`Cannot send message: WebSocket not connected (readyState: ${this.connection?.readyState})`);
            return false;
        }

        try {
            this.connection.send(JSON.stringify({type, payload}));
            return true;
        } catch (error) {
            this.logger.error(`Failed to send message: ${error.message}`);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Handle incoming messages from the agent
     */
    _handleIncomingMessage(message) {
        const {type, payload} = message;
        this.logger.debug(`Handling incoming message: ${type}`);

        // Handle log messages separately as they are streamed
        if (type === 'log') {
            this.emit('log', payload);
            return;
        }

        const messageHandlers = {
            system_stats: (p) => ({...this.agentState, ...p}),
            agent_state_update: (p) => ({...this.agentState, ...p}),
            tasks_response: (p) => ({...this.agentState, tasks: p.tasks || []}),
            task_added: (p) => ({...this.agentState, tasks: [...this.agentState.tasks, p]}),
            beliefs_response: (p) => ({...this.agentState, beliefs: p.beliefs || []}),
            belief_added: (p) => ({...this.agentState, beliefs: [...this.agentState.beliefs, p]}),
            goals_response: (p) => ({...this.agentState, goals: p.goals || []}),
            goal_added: (p) => ({...this.agentState, goals: [...this.agentState.goals, p]}),
            notification: (p) => ({...this.agentState, notifications: [...this.agentState.notifications, p]}),
        };

        if (messageHandlers[type]) {
            this.agentState = messageHandlers[type](payload);
            this.emit(type, payload); // Emit specific event
            this.emit('state_update', this.agentState); // Emit generic state update
        } else {
            this.logger.warn(`No handler for message type: ${type}`);
            this.emit(type, payload); // Forward unhandled events
        }
    }

    /**
     * Sets up the Y.js WebSocket provider for collaborative editing.
     */
    setupCollaborativeEditing() {
        if (!this.yProvider) {
            try {
                this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
                this.awareness = this.yProvider.awareness;
                this.awareness.on('change', () => this.emit('awareness_change'));
                this.logger.info('Collaborative editing service connected.');
            } catch (error) {
                this.logger.error('Error setting up collaborative editing:', error);
            }
        }
    }

    /**
     * Get current agent state
     */
    getAgentState() {
        return {...this.agentState};
    }

    /**
     * Send Narsese to the agent
     */
    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    /**
     * Send natural language to the agent
     */
    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    /**
     * Send agent control command
     */
    sendAgentControl(action) {
        return this.sendMessage('agentControl', {command: action});
    }

    /**
     * Search agent knowledge base
     */
    search(query, options) {
        return this.sendMessage('search', {query, ...options});
    }

    /**
     * Get current tasks
     */
    getTasks() {
        return this.sendMessage('get_tasks');
    }

    /**
     * Check if agent is running
     */
    isAgentRunning() {
        return this.agentState.isRunning;
    }
}

export default AgentService;