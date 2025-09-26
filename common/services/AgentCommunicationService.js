import Ws from 'ws';

// Universal WebSocket implementation that works in both Node.js and the browser.
const WebSocket = typeof window !== 'undefined' ? window.WebSocket : Ws;

/**
 * Shared Agent Communication Service for Web UI and TUI
 * This service is compatible with browser and Node.js WebSocket APIs
 */
class AgentCommunicationService {
    constructor(url = 'ws://localhost:8080') {
        this.url = url;
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.reconnectTimer = null;

        // Store pending messages when disconnected
        this.pendingMessages = [];

        // Agent state
        this.agentState = {
            isRunning: false,
            beliefsCount: 0,
            goalsCount: 0,
            questionsCount: 0,
            cycleCount: 0,
            temperature: 0,
            memoryUsage: 0
        };

        // Event listeners
        this.listeners = {};
    }

    // Basic event system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    connect() {
        if (this.isConnecting) {
            console.log('Connection attempt already in progress');
            return;
        }

        if (this.isConnected) {
            console.log('Already connected, skipping connection attempt');
            return;
        }

        this.isConnecting = true;
        console.log('Attempting to connect to agent service...');

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0; // Reset on successful connection

                // Clear any reconnect timer that might be active
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }

                this.emit('status', 'connected');
                console.log('WebSocket connected successfully');

                // Send any pending messages
                this.sendPendingMessages();
            };

            this.ws.onclose = (event) => {
                this.isConnected = false;
                this.isConnecting = false;
                console.log(`WebSocket disconnected: ${event.reason || 'no reason'}. Code: ${event.code}`);
                this.emit('status', 'disconnected');

                // Attempt to reconnect unless it was a deliberate close
                if (event.code !== 1000) { // 1000 is normal closure
                    this.attemptReconnect();
                }
            };

            this.ws.onmessage = (event) => {
                const messageData = typeof event.data === 'string' ? event.data : event.data.toString();
                try {
                    const message = JSON.parse(messageData);
                    // Validate message structure
                    if (!message || typeof message !== 'object' || !message.type) {
                        console.error('Invalid message format received:', messageData);
                        return;
                    }

                    // Handle agent state updates
                    if (message.type === 'system_stats') {
                        this.agentState = {
                            ...this.agentState,
                            ...message.payload
                        };
                        console.log('Agent state updated:', this.agentState);
                    }

                    this.emit(message.type, message.payload);
                    this.emit('message', message); // Also emit a generic message event
                } catch (error) {
                    console.error('Failed to parse incoming message:', messageData, error);
                    this.emit('error', {
                        type: 'parse_error',
                        message: messageData,
                        error: error.message
                    });
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error);
            this.isConnecting = false;
            this.emit('error', error);

            // Attempt to reconnect if connection failed
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached, giving up.');
            this.emit('status', 'failed');
        }
    }

    disconnect() {
        this.isConnecting = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting'); // 1000 is normal closure code
            this.ws = null;
        }

        // Clear any pending messages on disconnect
        this.pendingMessages = [];

        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    sendMessage(type, payload, options = {}) {
        const {timeout = 10000, priority = 1} = options;

        // Validate inputs
        if (!type) {
            console.error('Message type is required');
            return false;
        }

        if (typeof payload === 'undefined' || payload === null) {
            console.warn('Sending message with null/undefined payload:', type);
            payload = {};
        }

        // Create message object with metadata
        const messageObj = {
            type,
            payload,
            timestamp: Date.now(),
            id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            priority
        };

        if (!this.isConnected) {
            // Add to pending messages if not connected
            this.pendingMessages.push(messageObj);
            console.log(`Not connected, queuing message: ${type}. Queue size: ${this.pendingMessages.length}`);

            // Attempt to reconnect if we haven't recently tried
            if (!this.isConnecting) {
                this.connect();
            }

            return false;
        }

        try {
            const messageStr = JSON.stringify({type, payload});

            // Verify WebSocket is still open before sending
            if (this.ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket is not open, cannot send message');
                this.pendingMessages.push(messageObj);
                return false;
            }

            this.ws.send(messageStr);
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            this.emit('send_error', {
                type: 'send_error',
                message: {type, payload},
                error: error.message
            });

            // Add to pending messages and attempt to reconnect
            this.pendingMessages.push(messageObj);
            return false;
        }
    }

    sendPendingMessages() {
        if (this.pendingMessages.length > 0 && this.isConnected) {
            console.log(`Sending ${this.pendingMessages.length} pending messages`);

            // Send all pending messages
            const messagesToSend = [...this.pendingMessages];
            this.pendingMessages = []; // Clear the queue

            messagesToSend.forEach(message => {
                try {
                    this.sendMessage(message.type, message.payload);
                } catch (error) {
                    console.error('Error sending pending message:', error, message);
                    // Re-queue the message if there was an error
                    this.pendingMessages.push(message);
                }
            });
        }
    }

    // Agent control methods
    sendAgentControl(action) {
        return this.sendMessage('agentControl', {command: action});
    }

    startAgent() {
        return this.sendAgentControl('start');
    }

    stopAgent() {
        return this.sendAgentControl('stop');
    }

    resetAgent() {
        return this.sendAgentControl('reset');
    }

    // Task management methods
    getTasks() {
        return this.sendMessage('get_tasks', {});
    }

    addTask(taskData) {
        return this.sendMessage('add_task', taskData);
    }

    sendNarsese(narsese) {
        return this.sendMessage('narsese', narsese);
    }

    search(query, options = {}) {
        return this.sendMessage('search', {
            query,
            scope: options.scope || 'all',
            limit: options.limit || 50,
            filters: options.filters || {}
        });
    }

    // System stats
    getSystemStats() {
        return this.sendMessage('get_system_stats', {});
    }

    getConfig() {
        return this.sendMessage('get_config', {});
    }

    // Get current agent state
    getAgentState() {
        return {...this.agentState};
    }

    isAgentRunning() {
        return this.agentState.isRunning;
    }

    getBeliefsCount() {
        return this.agentState.beliefsCount;
    }

    getGoalsCount() {
        return this.agentState.goalsCount;
    }

    getQuestionsCount() {
        return this.agentState.questionsCount;
    }

    getCycleCount() {
        return this.agentState.cycleCount;
    }
}

export default AgentCommunicationService;