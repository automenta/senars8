import { EventEmitter } from 'events';

class AgentService extends EventEmitter {
    constructor() {
        super();
        this.ws = null;
        this.url = 'ws://localhost:8080';
        this.isConnected = false;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            this.isConnected = true;
            this.emit('status', 'connected');
            console.log('WebSocket connected');
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.emit('status', 'disconnected');
            console.log('WebSocket disconnected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.emit(message.type, message.payload);
                this.emit('message', message); // Also emit a generic message event
            } catch (error) {
                console.error('Failed to parse incoming message:', event.data, error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    sendMessage(type, payload) {
        if (!this.isConnected) {
            console.error('Cannot send message, WebSocket is not connected.');
            return;
        }
        this.ws.send(JSON.stringify({ type, payload }));
    }
    
    sendUserInput(text) {
        this.sendMessage('userInput', { text });
    }

    sendAgentControl(command) {
        this.sendMessage('agentControl', { command });
    }
}

// Export a singleton instance
const agentService = new AgentService();
export default agentService;
