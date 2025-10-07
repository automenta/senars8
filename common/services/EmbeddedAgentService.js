import {EventEmitter} from 'events';
import AgentManager from '../../agent/AgentManager.js';
import logger from '../../core/utils/logger.js';

const log = logger.create('EmbeddedAgentService');

/**
 * Service for managing an embedded (in-process) agent instance.
 * Provides direct access to an agent without WebSocket connections.
 */
class EmbeddedAgentService extends EventEmitter {
    constructor() {
        super();
        this.agentManager = null;
        this.isInitialized = false;
        this.isRunning = false;
    }

    /**
     * Initialize the embedded agent
     */
    async initialize() {
        if (this.isInitialized) {
            log.warn('Embedded agent already initialized');
            return;
        }

        try {
            log.info('Initializing embedded agent...');

            this.agentManager = new AgentManager();

            // Set up broadcast handler to forward agent events
            this.agentManager.setBroadcast((message) => {
                this._handleAgentMessage(message);
            });

            await this.agentManager.initialize();
            this.isInitialized = true;

            log.info('Embedded agent initialized successfully');
            this.emit('initialized');
        } catch (error) {
            log.error('Failed to initialize embedded agent:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Start the embedded agent
     */
    async start(maxCycles) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isRunning) {
            log.warn('Embedded agent already running');
            return;
        }

        try {
            log.info('Starting embedded agent...');
            await this.agentManager.start(maxCycles);
            this.isRunning = true;
            this.emit('started');
        } catch (error) {
            log.error('Failed to start embedded agent:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop the embedded agent
     */
    async stop() {
        if (!this.isInitialized || !this.isRunning) {
            return;
        }

        try {
            log.info('Stopping embedded agent...');
            await this.agentManager.stop();
            this.isRunning = false;
            this.emit('stopped');
        } catch (error) {
            log.error('Failed to stop embedded agent:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Reset the embedded agent
     */
    async reset() {
        if (!this.isInitialized) {
            return;
        }

        try {
            log.info('Resetting embedded agent...');
            await this.agentManager.reset();
            this.emit('reset');
        } catch (error) {
            log.error('Failed to reset embedded agent:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Get the current agent instance
     */
    getAgent() {
        return this.agentManager?.getAgent();
    }

    /**
     * Get the agent state
     */
    getAgentState() {
        const agent = this.getAgent();
        return agent?.getAgentState() || {};
    }

    /**
     * Send a message to the agent
     */
    sendMessage(type, payload = {}) {
        if (!this.isInitialized) {
            log.warn('Cannot send message: embedded agent not initialized');
            return;
        }

        try {
            // Forward the message to the agent through the agent manager
            this._handleIncomingMessage({type, payload});
        } catch (error) {
            log.error('Failed to send message to embedded agent:', error);
            this.emit('error', error);
        }
    }

    /**
     * Handle messages from the agent manager
     */
    _handleAgentMessage(message) {
        // Forward agent messages as if they came from WebSocket
        // Use custom JSON serialization to handle BigInt values
        const serializedMessage = JSON.stringify(message, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        this.emit('message', {data: serializedMessage});
    }

    /**
     * Handle incoming messages for the agent
     */
    _handleIncomingMessage(message) {
        const {type, payload} = message;

        if (!this.isInitialized) {
            log.warn('Cannot handle message: embedded agent not initialized');
            return;
        }

        try {
            const agent = this.getAgent();
            if (!agent) {
                throw new Error('Agent not available');
            }

            // Route messages to appropriate agent handlers
            switch (type) {
                case 'narsese':
                    agent.system.commandBus.request('process_narsese', {content: payload});
                    break;
                case 'natural_language':
                    agent.system.commandBus.request('process_natural_language', {
                        text: payload.text,
                        intent: payload.intent
                    });
                    break;
                case 'agentControl':
                    this._handleAgentControl(payload.command);
                    break;
                case 'get_system_stats':
                    this._handleGetSystemStats();
                    break;
                case 'get_tasks':
                    this._handleGetTasks();
                    break;
                case 'get_beliefs':
                    this._handleGetBeliefs();
                    break;
                case 'get_goals':
                    this._handleGetGoals();
                    break;
                case 'search':
                    this._handleSearch(payload.query, payload.options);
                    break;
                default:
                    log.warn(`Unhandled message type: ${type}`);
            }
        } catch (error) {
            log.error(`Failed to handle message ${type}:`, error);
            this.emit('error', error);
        }
    }

    /**
     * Handle agent control commands
     */
    _handleAgentControl(command) {
        switch (command) {
            case 'start':
                this.start();
                break;
            case 'stop':
                this.stop();
                break;
            case 'reset':
                this.reset();
                break;
            default:
                log.warn(`Unknown agent control command: ${command}`);
        }
    }

    /**
     * Handle get system stats request
     */
    _handleGetSystemStats() {
        const state = this.getAgentState();
        const stats = {
            isRunning: this.isRunning,
            cycleCount: state.cycleCount || 0,
            uptime: state.uptime || 0,
            connectionStatus: 'connected'
        };

        this.emit('message', {
            data: JSON.stringify({
                type: 'system_stats',
                payload: stats
            })
        });
    }

    /**
     * Handle get tasks request
     */
    _handleGetTasks() {
        const state = this.getAgentState();
        this.emit('message', {
            data: JSON.stringify({
                type: 'tasks_response',
                payload: {tasks: state.tasks || []}
            })
        });
    }

    /**
     * Handle get beliefs request
     */
    _handleGetBeliefs() {
        const state = this.getAgentState();
        this.emit('message', {
            data: JSON.stringify({
                type: 'beliefs_response',
                payload: {beliefs: state.beliefs || []}
            })
        });
    }

    /**
     * Handle get goals request
     */
    _handleGetGoals() {
        const state = this.getAgentState();
        this.emit('message', {
            data: JSON.stringify({
                type: 'goals_response',
                payload: {goals: state.goals || []}
            })
        });
    }

    /**
     * Handle search request
     */
    _handleSearch(query, options) {
        // For now, return empty results - can be enhanced later
        this.emit('message', {
            data: JSON.stringify({
                type: 'search_response',
                payload: {results: []}
            })
        });
    }

    /**
     * Cleanup resources
     */
    async destroy() {
        try {
            await this.stop();
            this.removeAllListeners();
            this.agentManager = null;
            this.isInitialized = false;
            log.info('Embedded agent service destroyed');
        } catch (error) {
            log.error('Error during embedded agent cleanup:', error);
        }
    }
}

export default EmbeddedAgentService;