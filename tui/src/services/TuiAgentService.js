import BaseUiAgentService from '@senars/common/services/BaseUiAgentService.js';
import {connectionManager} from '@senars/common/services/connection.js';

/**
 * A lightweight service for the TUI that extends the base UI agent service
 * with TUI-specific functionality. Supports both WebSocket and embedded modes.
 */
class TuiAgentService extends BaseUiAgentService {
    /**
     * @param {string} url - The WebSocket URL for the agent connection, or null for embedded mode.
     */
    constructor(url) {
        // Use embedded mode if no URL provided or if explicitly set to 'embedded'
        if (!url || url === 'embedded') {
            super('embedded', 'TuiAgentService');
            this.connectionMode = 'embedded';
        } else {
            super(url, 'TuiAgentService');
            this.connectionMode = 'websocket';
        }
    }

    /**
     * Connect to the agent service.
     */
    connect() {
        if (this.connectionMode === 'embedded') {
            // For embedded mode, create the embedded connection
            connectionManager.createEmbedded();
        } else {
            // For WebSocket mode, use the parent implementation
            super.connect();
        }
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
            connectionMode: this.connectionMode,
        };
    }
}

export default TuiAgentService;