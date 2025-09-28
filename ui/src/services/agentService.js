import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import log from '@common/utils/logger';
import AgentCommunicationService from '@common/services/AgentCommunicationService';
import { CONFIG } from '@common/constants/config.js';
import { MESSAGE_TYPES } from '@/constants/ui';

/**
 * A high-level service for the UI that manages agent communication,
 * UI-specific features like collaborative editing (Y.js), and a local
 * cache of the agent's state for performance. This is the primary
 * interface for UI components to interact with the agent.
 */
class AgentService extends EventEmitter {
    constructor() {
        super();
        this.communicationService = new AgentCommunicationService(CONFIG.CONNECTION.WEBSOCKET_URL);
        this.crdtUrl = CONFIG.CONNECTION.CRDT_WEBSOCKET_URL;

        // Y.js for collaborative editing
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;

        // Local state cache for UI performance
        this.agentState = {
            isRunning: false,
            cycleCount: 0,
            tasks: [],
            beliefs: [],
            goals: [],
            questions: [],
        };

        this.setupEventForwarding();
    }

    /**
     * Forwards events from the communication service and handles message processing.
     */
    setupEventForwarding() {
        this.communicationService.on('status', (status) => {
            this.emit('status', status);
            if (status === 'connected') {
                this.setupCollaborativeEditing();
                // Request initial state from agent upon connection
                this.sendMessage('get_system_stats', {});
                this.sendMessage('get_tasks', {});
            }
        });

        this.communicationService.on('message', (message) => {
            this.handleIncomingMessage(message);
        });

        this.communicationService.on('error', (error) => {
            this.emit('error', error);
        });
    }

    /**
     * Processes incoming messages, updates local state, and emits events for the UI.
     */
    handleIncomingMessage(message) {
        log.debug('Handling incoming message:', message.type);
        switch (message.type) {
            case MESSAGE_TYPES.SYSTEM_STATS:
            case MESSAGE_TYPES.AGENT_STATE_UPDATE:
                this.agentState = { ...this.agentState, ...message.payload };
                this.emit('system_stats', this.agentState);
                break;
            case MESSAGE_TYPES.TASKS_RESPONSE:
                this.agentState.tasks = message.payload.tasks || [];
                this.emit('task_update', this.agentState.tasks);
                break;
            case MESSAGE_TYPES.TASK_ADDED:
                this.agentState.tasks.push(message.payload);
                this.emit('task_update', this.agentState.tasks);
                break;
            // Add other message types as needed
        }

        // Forward the specific event and a generic 'message' event
        this.emit(message.type, message.payload);
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
        if (this.yProvider) {
            this.yProvider.destroy();
            this.yProvider = null;
            this.awareness = null;
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
            log.info('Collaborative editing service connected.');
        } catch (error) {
            log.error('Error setting up collaborative editing:', error);
        }
    }

    /**
     * Sends a message to the agent.
     */
    sendMessage(type, payload, options) {
        return this.communicationService.sendMessage(type, payload, options);
    }

    // --- High-level API methods for the UI ---

    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    sendNaturalLanguage(text, intent) {
        return this.sendMessage('natural_language', { text, intent });
    }

    sendAgentControl(action) {
        return this.sendMessage('agentControl', { command: action });
    }

    search(query, options) {
        return this.sendMessage('search', { query, ...options });
    }

    getTasks() {
        return this.sendMessage('get_tasks', {});
    }

    getAgentState() {
        return { ...this.agentState };
    }

    isAgentRunning() {
        return this.agentState.isRunning;
    }

    getConnectionStats() {
        return this.communicationService.getConnectionStats();
    }
}

// Export a singleton instance for the UI
const agentService = new AgentService();
export default agentService;