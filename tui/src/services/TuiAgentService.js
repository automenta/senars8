import ApiService from '@senars/common/services/ApiService.js';
import {CONFIG} from '@senars/common/constants/config.js';
import logger from '@senars/core/utils/logger.js';

/**
 * A high-level service for the TUI that extends the base ApiService
 * with TUI-specific features and multi-agent management.
 */
class TuiAgentService extends ApiService {
    constructor(url = CONFIG.CONNECTION.WEBSOCKET_URL) {
        super(url);

        // Override logger namespace for TUI-specific context
        this.logger = logger.create('TuiAgentService');

        // TUI-specific state management
        this.agentId = null;
        this.agentName = null;

        // Reduce reconnection attempts for better UX when no agents are available
        if (this.communicationService) {
            // Use more conservative reconnection settings for TUI
            this.communicationService.maxReconnectAttempts = 3;  // Fewer attempts
            this.communicationService.reconnectDelay = 2000;    // 2 seconds initial delay
            this.communicationService.maxReconnectDelay = 10000; // 10 seconds max
        }
    }

    /**
     * Initializes the service with a specific agent ID and name
     */
    initialize(agentId, agentName) {
        this.agentId = agentId;
        this.agentName = agentName;
        this.logger.info(`Initialized TUI Agent Service for ${agentName} (${agentId})`);
    }

    /**
     * Initializes the service with a specific agent ID and name
     */
    initialize(agentId, agentName) {
        this.agentId = agentId;
        this.agentName = agentName;
        this.logger.info(`Initialized TUI Agent Service for ${agentName} (${agentId})`);
    }

    /**
     * Sends a Narsese command to the agent with error handling
     */
    async sendNarseseCommand(narsese) {
        try {
            this.logger.debug(`Sending Narsese command: ${narsese}`);
            return await this.sendNarsese(narsese);
        } catch (error) {
            this.logger.error(`Failed to send Narsese command: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets agent status information formatted for the TUI
     */
    getTuiStatus() {
        const state = this.getAgentState();
        return {
            ...state,
            agentId: this.agentId,
            agentName: this.agentName,
            connectionStatus: state.connectionStatus || this.communicationService.isConnected ? 'connected' : 'disconnected'
        };
    }
}

export default TuiAgentService;