import BaseUiAgentService from '@senars/common/services/BaseUiAgentService.js';

/**
 * A lightweight service for the TUI that extends the base UI agent service
 * with TUI-specific functionality.
 */
class TuiAgentService extends BaseUiAgentService {
    /**
     * @param {string} url - The WebSocket URL for the agent connection.
     */
    constructor(url) {
        super(url, 'TuiAgentService');
    }

    /**
     * Provides a TUI-specific representation of the agent's state.
     * @returns {object} The agent's state, formatted for the TUI.
     */
    getTuiStatus() {
        const state = this.getAgentState();
        return {
            ...this.formatStateForUi(state),
            agentUrl: this.url,
        };
    }
}

export default TuiAgentService;