import AgentCommunicationService from '@common/services/AgentCommunicationService';
import log from '@common/utils/logger';

/**
 * API service for the TUI that handles all communication with the agent.
 * This service is a lightweight wrapper around the shared AgentCommunicationService,
 * providing a simplified and consistent interface for TUI components.
 */
class TuiApiService {
    constructor() {
        this.communicationService = new AgentCommunicationService();
        this.logger = log.createNamespace('TuiApiService');
        this.localState = {
            isRunning: false,
            cycleCount: 0,
            tasks: [],
            beliefs: [],
            goals: [],
            questions: [],
        };

        this.initialize();
    }

    /**
     * Initializes the service by establishing a connection and setting up
     * event listeners to keep the local state synchronized with the agent.
     */
    initialize() {
        this.communicationService.on('status', (status) => {
            this.logger.info(`Connection status: ${status}`);
            if (status === 'connected') {
                // Request initial state once connected
                this.communicationService.sendMessage('get_system_stats', {});
                this.communicationService.sendMessage('get_tasks', {});
            }
        });

        this.communicationService.on('system_stats', (stats) => {
            this.localState = { ...this.localState, ...stats };
            this.logger.debug('System stats updated:', stats);
        });

        this.communicationService.on('tasks_response', (response) => {
            this.localState.tasks = response.tasks || [];
            this.logger.debug('Tasks updated:', this.localState.tasks.length);
        });

        this.communicationService.on('task_added', (task) => {
            this.localState.tasks.push(task);
            this.logger.debug('Task added:', task);
        });

        // Connect to the agent service
        this.communicationService.connect();
    }

    /**
     * Sends a Narsese string to the agent for processing.
     * @param {string} content - The Narsese content.
     */
    interpretNarsese(content) {
        if (!content) {
            this.logger.warn('interpretNarsese called with empty content.');
            return;
        }
        this.logger.info(`Sending Narsese: ${content}`);
        this.communicationService.sendMessage('narsese', content);
    }

    /**
     * Sends a command to control the agent's lifecycle (e.g., 'start', 'stop').
     * @param {string} command - The control command.
     */
    sendAgentControl(command) {
        this.logger.info(`Sending agent control command: ${command}`);
        this.communicationService.sendMessage('agentControl', { command });
    }

    /**
     * Returns the current cached state of the agent.
     * @returns {object} The local state.
     */
    getState() {
        return { ...this.localState };
    }

    /**
     * Disconnects the service from the agent.
     */
    disconnect() {
        this.communicationService.disconnect();
    }

    /**
     * Allows other TUI components to listen for events from the agent.
     * @param {string} event - The name of the event to listen for.
     * @param {Function} callback - The function to call when the event occurs.
     */
    on(event, callback) {
        this.communicationService.on(event, callback);
    }

    /**
     * Removes an event listener.
     * @param {string} event - The name of the event.
     * @param {Function} callback - The callback function to remove.
     */
    off(event, callback) {
        this.communicationService.off(event, callback);
    }
}

export default TuiApiService;