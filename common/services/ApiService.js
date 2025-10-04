import {EventBus} from '@senars/common/utils/eventBus.js';
import {connectionManager} from './connection.js';
import log from '../../core/utils/logger.js';

/**
 * A base service for UIs (TUI, WebUI) that manages agent communication
 * and a local cache of the agent's state for performance. This is the primary
 * interface for UI components to interact with the agent.
 */
class ApiService extends EventBus {
    /**
     * @param {string} [url] - The WebSocket URL to connect to.
     */
    constructor(url) {
        super();
        this.url = url; // The specific agent URL this service instance will talk to
        this.logger = log.create('ApiService');

        // Local state cache for UI performance
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

        this._setupEventForwarding();
    }

    /**
     * Forwards events from the connection manager and handles message processing.
     * @private
     */
    _setupEventForwarding() {
        connectionManager.on('connection', ({url, status}) => {
            if (url === this.url) {
                this.agentState.connectionStatus = status;
                this.emit('status', status);
                if (status === 'connected') {
                    this.logger.info(`Connection established to ${this.url}. Requesting initial state.`);
                    // Request initial state from agent upon connection
                    this.sendMessage('get_system_stats');
                    this.sendMessage('get_tasks');
                    this.sendMessage('get_beliefs');
                    this.sendMessage('get_goals');
                }
            }
        });

        connectionManager.on('disconnection', ({url, status}) => {
            if (url === this.url) {
                this.agentState.connectionStatus = status;
                this.emit('status', status);
            }
        });

        connectionManager.on('message', ({url, data}) => {
            if (url === this.url) {
                try {
                    const message = JSON.parse(data);
                    this._handleIncomingMessage(message);
                } catch (error) {
                    this.logger.error(`Failed to parse incoming message as JSON: ${error.message}`);
                    this.logger.debug(`Raw message data: ${data}`);
                    // Emit error event for the UI to handle
                    this.emit('error', {type: 'json_parse_error', message: error.message, data});
                }
            }
        });

        connectionManager.on('error', ({url, error}) => {
            if (url === this.url) {
                this.logger.error(`Communication error for ${url}:`, error);
                this.emit('error', error);
            }
        });
    }

    /**
     * Processes incoming messages, updates local state, and emits events for the UI.
     * @param {object} message - The message from the agent.
     * @private
     */
    _handleIncomingMessage(message) {
        const {type, payload} = message;
        this.logger.debug(`Handling incoming message: ${type}`);

        // Handle log messages separately as they are streamed and not part of the main state object.
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
     * Connects to the agent service.
     */
    connect() {
        if (!this.url) {
            this.logger.error("No URL specified for ApiService connection.");
            return;
        }
        connectionManager.connect(this.url);
    }

    /**
     * Disconnects from the agent service.
     */
    disconnect() {
        if (!this.url) return;
        connectionManager.disconnect(this.url);
    }

    /**
     * Sends a message to the agent.
     * @param {string} type - The message type.
     * @param {object} [payload={}] - The message payload.
     */
    sendMessage(type, payload = {}) {
        if (!this.url) return;
        connectionManager.send(this.url, {type, payload});
    }

    /**
     * Sends a Narsese string to the agent for processing.
     * @param {string} narsese - The Narsese content.
     */
    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    /**
     * Sends a natural language string to the agent for processing.
     * @param {string} text - The natural language text.
     * @param {string} [intent] - The intended processing for the text.
     */
    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    /**
     * Sends a command to control the agent's lifecycle (e.g., 'start', 'stop').
     * @param {string} action - The control command.
     */
    sendAgentControl(action) {
        return this.sendMessage('agentControl', {command: action});
    }

    /**
     * Performs a search query within the agent's knowledge base.
     * @param {string} query - The search query.
     * @param {object} [options] - Search options.
     */
    search(query, options) {
        return this.sendMessage('search', {query, ...options});
    }

    /**
     * Requests the current list of tasks from the agent.
     */
    getTasks() {
        return this.sendMessage('get_tasks');
    }

    /**
     * Returns the current cached state of the agent.
     * @returns {object} The local agent state.
     */
    getAgentState() {
        return {...this.agentState};
    }

    /**
     * Checks if the agent is currently running.
     * @returns {boolean}
     */
    isAgentRunning() {
        return this.agentState.isRunning;
    }

    /**
     * Gets the connection statistics.
     * @returns {Array<object>}
     */
    getConnectionStats() {
        return connectionManager.getConnections();
    }
}

export default ApiService;