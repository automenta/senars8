import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import BaseUiAgentService from '@senars/common/services/BaseUiAgentService.js';
import {CONFIG} from '@senars/common/constants/config.js';

/**
 * A high-level service for the Web UI that extends the base UI agent service
 * with Web UI-specific features like collaborative editing (Y.js).
 */
class AgentService extends BaseUiAgentService {
    constructor(url) {
        super(url, 'AgentServiceUI');
        this.crdtUrl = CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;

        // Y.js for collaborative editing
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

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

export default AgentService;