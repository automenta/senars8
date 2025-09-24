import {EventEmitter} from 'events';
import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';

// Simple logging utility for the UI
const log = {
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};

class AgentService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.url = 'ws://localhost:8080';
        this.isConnected = false;
        this.yDoc = new Y.Doc();
        this.yProvider = null;
        this.awareness = null;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        // Setup Y.js WebSocket provider
        this.yProvider = new WebsocketProvider('ws://localhost:8080/crdt', 'senars-room', this.yDoc);
        this.awareness = this.yProvider.awareness;

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            this.isConnected = true;
            this.emit('status', 'connected');
            log.info('WebSocket connected');
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.emit('status', 'disconnected');
            log.info('WebSocket disconnected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit(message.type, message.payload);
                this.emit('message', message); // Also emit a generic message event
            } catch (error) {
                log.error('Failed to parse incoming message:', event.data, error);
            }
        };

        this.ws.onerror = (error) => {
            log.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.yProvider) {
            this.yProvider.disconnect();
        }
    }

    sendMessage(type, payload) {
        if (!this.isConnected) {
            log.error('Cannot send message, WebSocket is not connected.');
            return;
        }
        this.ws.send(JSON.stringify({type, payload}));
    }

    sendNarsese(narsese) {
        this.sendMessage('narsese', narsese);
    }

    sendNaturalLanguage(text, intent) {
        this.sendMessage('natural_language', { text, intent });
    }

    sendAgentControl(command) {
        this.sendMessage('agentControl', {command});
    }
}

// Export a singleton instance
const agentService = new AgentService();
export default agentService;
