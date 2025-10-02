import {EventEmitter} from 'events';
import AgentCommunicationService from './AgentCommunicationService.js';
import log from '@senars/core/utils/logger.js';
import {CONFIG} from '../constants/config.js';

/**
 * A base service for UIs (TUI, WebUI) that manages agent communication
 * and a local cache of the agent's state for performance. This is the primary
 * interface for UI components to interact with the agent.
 */
class ApiService extends EventEmitter {
    /**
     * @param {string} [url] - The WebSocket URL to connect to. Defaults to the config URL.
     */
    constructor(url = CONFIG.CONNECTION.WEBSOCKET_URL) {
        super();
        this.communicationService = new AgentCommunicationService(url);
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
        };

        this._setupEventForwarding();
    }

    /**
     * Forwards events from the communication service and handles message processing.
     * @private
     */
    _setupEventForwarding() {
        this.communicationService.on('status', (status) => {
            this.emit('status', status);
            if (status === 'connected') {
                this.logger.info('Connection established. Requesting initial state.');
                // Request initial state from agent upon connection
                this.sendMessage('get_system_stats');
                this.sendMessage('get_tasks');
                this.sendMessage('get_beliefs');
                this.sendMessage('get_goals');
            }
        });

        this.communicationService.on('message', (message) => {
            this._handleIncomingMessage(message);
        });

        this.communicationService.on('error', (error) => {
            this.logger.error('Communication error:', error);
            this.emit('error', error);
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
        this.communicationService.connect();
    }

    /**
     * Disconnects from the agent service.
     */
    disconnect() {
        this.communicationService.disconnect();
    }

    /**
     * Sends a message to the agent.
     * @param {string} type - The message type.
     * @param {object} [payload={}] - The message payload.
     * @param {object} [options={}] - Additional options.
     * @returns {Promise<any>} A promise that resolves with the response.
     */
    sendMessage(type, payload = {}, options = {}) {
        return this.communicationService.sendMessage(type, payload, options);
    }

    /**
     * Sends a Narsese string to the agent for processing.
     * @param {string} narsese - The Narsese content.
     * @returns {Promise<any>}
     */
    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    /**
     * Sends a natural language string to the agent for processing.
     * @param {string} text - The natural language text.
     * @param {string} [intent] - The intended processing for the text.
     * @returns {Promise<any>}
     */
    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', {text, intent});
    }

    /**
     * Sends a command to control the agent's lifecycle (e.g., 'start', 'stop').
     * @param {string} action - The control command.
     * @returns {Promise<any>}
     */
    sendAgentControl(action) {
        return this.sendMessage('agentControl', {command: action});
    }

    /**
     * Performs a search query within the agent's knowledge base.
     * @param {string} query - The search query.
     * @param {object} [options] - Search options.
     * @returns {Promise<any>}
     */
    search(query, options) {
        return this.sendMessage('search', {query, ...options});
    }

    /**
     * Requests the current list of tasks from the agent.
     * @returns {Promise<any>}
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
     * @returns {object}
     */
    getConnectionStats() {
        return this.communicationService.getConnectionStats();
    }
}

export default ApiService;