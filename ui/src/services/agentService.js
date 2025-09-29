import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import ApiService from '@common/services/ApiService.js';
import {CONFIG} from '@common/constants/config.js';
import log from '@core/utils/logger.js';

/**
 * A high-level service for the UI that extends the base ApiService
 * with UI-specific features like collaborative editing (Y.js).
 */
class AgentService extends ApiService {
    constructor() {
        super(CONFIG.CONNECTION.WEBSOCKET_URL);
        this.crdtUrl = CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;

        // Y.js for collaborative editing
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

        // Override logger namespace for UI-specific context
        this.logger = log.createNamespace('AgentServiceUI');

        // Hook into the connection status to manage collaborative editing
        this.on('status', (status) => {
            if (status === 'connected') {
                this.setupCollaborativeEditing();
            }
        });
    }

    /**
     * Overrides the base disconnect method to also clean up the Y.js provider.
     */
    disconnect() {
        super.disconnect();
        if (this.yProvider) {
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
            this.logger.info('Collaborative editing service disconnected.');
        }
    }

    /**
     * Sets up the Y.js WebSocket provider for collaborative editing.
     */
    setupCollaborativeEditing() {
        try {
            if (this.yProvider) {
                this.yProvider.destroy();
            }
            this.yProvider = new WebsocketProvider(this.crdtUrl, 'senars-room', this.yDoc);
            this.awareness = this.yProvider.awareness;
            this.awareness.on('change', () => this.emit('awareness_change'));
            this.logger.info('Collaborative editing service connected.');
        } catch (error) {
            this.logger.error('Error setting up collaborative editing:', error);
        }
    }
}

// Export a singleton instance for the UI
const agentService = new AgentService();
export default agentService;