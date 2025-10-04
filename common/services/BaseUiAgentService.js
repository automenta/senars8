import ApiService from '@senars/common/services/ApiService.js';
import {logger} from '@senars/common';

/**
 * Base agent service for UI implementations (both Web UI and TUI)
 * Contains common UI-specific functionality that can be shared
 */
class BaseUiAgentService extends ApiService {
    /**
     * @param {string} url - The WebSocket URL for the agent connection
     * @param {string} loggerNamespace - The namespace for the logger
     */
    constructor(url, loggerNamespace) {
        super(url);
        this.logger = logger.create(loggerNamespace);
        this.logger.info(`${loggerNamespace} initialized for ${url}`);
    }

    /**
     * Returns a formatted status suitable for UI display
     * @returns {object} Formatted agent status
     */
    getUiStatus() {
        const state = this.getAgentState();
        return {
            ...state,
            agentUrl: this.url,
            connectionStatus: state.connectionStatus,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Formats agent state for UI-specific display needs
     * @param {object} state - Raw agent state
     * @returns {object} Formatted state for UI
     */
    formatStateForUi(state) {
        return {
            ...state,
            formattedUptime: this.formatUptime(state.uptime),
            statusText: this.getConnectionStatusText(state.connectionStatus)
        };
    }

    /**
     * Format uptime for display
     * @private
     */
    formatUptime(uptimeStr) {
        // If uptime is already formatted, return it; otherwise, format it
        if (typeof uptimeStr === 'string') {
            return uptimeStr;
        }
        
        // Convert seconds to HH:MM:SS format
        const totalSeconds = uptimeStr || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get connection status text for UI
     * @private
     */
    getConnectionStatusText(status) {
        const statusMap = {
            'connected': 'Connected',
            'connecting': 'Connecting...',
            'disconnected': 'Disconnected',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }
}

export default BaseUiAgentService;