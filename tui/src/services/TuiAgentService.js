import ApiService from '@senars/common/services/ApiService.js';
import {logger} from '@senars/common';

/**
 * A lightweight service for the TUI that extends the base ApiService
 * with TUI-specific logging and context.
 */
class TuiAgentService extends ApiService {
    /**
     * @param {string} url - The WebSocket URL for the agent connection.
     */
    constructor(url) {
        super(url);
        // Override the default logger to use a TUI-specific namespace
        this.logger = logger.create('TuiAgentService');
        this.logger.info(`TUI Agent Service initialized for ${url}`);
    }

    /**
     * Provides a TUI-specific representation of the agent's state.
     * @returns {object} The agent's state, formatted for the TUI.
     */
    getTuiStatus() {
        const state = this.getAgentState();
        return {
            ...state,
            agentUrl: this.url,
            connectionStatus: state.connectionStatus,
        };
    }
}

export default TuiAgentService;