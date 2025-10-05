import WebSocket from 'ws';

/**
 * Creates a WebSocket client with message buffering and listener capabilities.
 * @param {string} url - The WebSocket URL to connect to.
 * @param {number} timeout - Connection timeout in milliseconds.
 * @returns {Promise<WebSocket>} A promise that resolves with the enhanced WebSocket instance.
 */
export function createWebSocketClient(url, timeout = 2000) {
    const ws = new WebSocket(url);
    ws.messageBuffer = [];
    ws.messageListeners = [];

    ws.on('message', (data) => {
        const message = JSON.parse(data);

        // Check if any listener is waiting for this message
        const listenerIndex = ws.messageListeners.findIndex(listener => listener.filter(message));

        if (listenerIndex > -1) {
            // If a listener is found, resolve its promise and remove it
            const [listener] = ws.messageListeners.splice(listenerIndex, 1);
            listener.resolve(message);
        } else {
            // Otherwise, add the message to the buffer
            ws.messageBuffer.push(message);
        }
    });

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            ws.close();
            reject(new Error(`WebSocket connection to ${url} timed out after ${timeout}ms`));
        }, timeout);

        ws.on('open', () => {
            clearTimeout(timer);
            resolve(ws);
        });

        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * Awaits the next message from a WebSocket client that matches a filter.
 * Checks a buffer of received messages before waiting for a new one.
 * @param {WebSocket} ws - The WebSocket client.
 * @param {Function} [filter=() => true] - A function to filter messages.
 * @param {number} [timeout=2000] - Timeout in milliseconds.
 * @returns {Promise<any>} A promise that resolves with the parsed message data.
 */
export function awaitNextMessage(ws, filter = () => true, timeout = 2000) {
    // First, check the buffer for a matching message
    const bufferedIndex = ws.messageBuffer.findIndex(filter);
    if (bufferedIndex > -1) {
        const [message] = ws.messageBuffer.splice(bufferedIndex, 1);
        return Promise.resolve(message);
    }

    // If no matching message is in the buffer, set up a listener
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            // On timeout, remove the listener and reject the promise
            const index = ws.messageListeners.indexOf(listener);
            if (index > -1) {
                ws.messageListeners.splice(index, 1);
            }
            reject(new Error(`Did not receive a message within ${timeout}ms`));
        }, timeout);

        const listener = {
            filter,
            resolve: (message) => {
                clearTimeout(timer);
                resolve(message);
            },
        };

        ws.messageListeners.push(listener);
    });
}

/**
 * Gracefully closes a WebSocket connection.
 * @param {WebSocket} ws - The WebSocket client to close.
 */
export function closeWebSocket(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
}

/**
 * Waits for a WebSocket instance to reach a specific readyState.
 * @param {WebSocket} socket - The WebSocket instance.
 * @param {number} state - The target readyState (e.g., WebSocket.OPEN, WebSocket.CLOSED).
 * @param {number} [timeout=1000] - Timeout in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the state is reached or rejects on timeout.
 */
export function waitForSocketState(socket, state, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            clearInterval(interval);
            reject(new Error(`Socket did not reach state ${state} within ${timeout}ms`));
        }, timeout);

        const interval = setInterval(() => {
            if (socket.readyState === state) {
                clearInterval(interval);
                clearTimeout(timer);
                resolve();
            }
        }, 10);
    });
}

/**
 * Optimized WebSocket test fixture for integration tests.
 * Reduces setup time by reusing connections and optimizing timeouts.
 */
export class WebSocketTestFixture {
    constructor(port, options = {}) {
        this.port = port;
        this.wsUrl = `ws://localhost:${port}`;
        this.options = {
            connectionTimeout: 2000,
            messageTimeout: 1000, // Reduced from 2000ms
            setupTimeout: 10000, // Reduced from 60000ms
            cleanupTimeout: 5000, // Reduced from 30000ms
            ...options
        };
        this.wsManager = null;
        this.agentManager = null;
        this.clients = [];
        this.messageHandler = null;
    }

    /**
     * Set up the WebSocket test fixture with AgentManager and WebSocketManager.
     * @param {Function} messageHandlerFactory - Factory function to create message handler
     * @param {object} agentConfig - Configuration for AgentManager
     */
    async setup(messageHandlerFactory, agentConfig = {}) {
        const {WebSocketManager} = await import('../../agent/WebSocketManager.js');
        const AgentManager = (await import('../../agent/AgentManager.js')).default;

        // Create and start WebSocket manager
        this.wsManager = new WebSocketManager({port: this.port});
        await this.wsManager.start();

        // Create agent manager
        this.agentManager = new AgentManager();
        this.agentManager.setBroadcast(this.wsManager.broadcast.bind(this.wsManager));

        // Create and set message handler
        this.messageHandler = messageHandlerFactory(this.agentManager, this.wsManager.broadcast.bind(this.wsManager));
        this.wsManager.setMessageHandler(this.messageHandler);

        // Initialize agent manager
        await this.agentManager.initialize();
    }

    /**
     * Create multiple WebSocket clients in parallel for better performance.
     * @param {number} count - Number of clients to create
     * @returns {Promise<WebSocket[]>} Array of created clients
     */
    async createClients(count = 1) {
        const clientPromises = Array(count).fill().map(() => createWebSocketClient(this.wsUrl, this.options.connectionTimeout));
        const clients = await Promise.all(clientPromises);

        // Wait for all clients to receive connection acknowledgment in parallel
        const ackPromises = clients.map(client =>
            awaitNextMessage(client, (msg) => msg.type === 'connection_ack', this.options.messageTimeout)
        );

        await Promise.all(ackPromises);
        this.clients.push(...clients);
        return clients;
    }

    /**
     * Send a message to a specific client and wait for a response.
     * @param {WebSocket} client - The WebSocket client
     * @param {object} message - Message to send
     * @param {Function} responseFilter - Filter function for the expected response
     * @param {number} timeout - Response timeout (optional)
     * @returns {Promise<object>} Response message
     */
    async sendAndExpect(client, message, responseFilter, timeout = this.options.messageTimeout) {
        client.send(JSON.stringify(message));
        return awaitNextMessage(client, responseFilter, timeout);
    }

    /**
     * Clean up all resources.
     */
    async cleanup() {
        // Close all clients in parallel
        const closePromises = this.clients.map(closeWebSocket);
        await Promise.all(closePromises);
        this.clients = [];

        // Stop managers
        if (this.wsManager) {
            await this.wsManager.stop();
        }
        if (this.agentManager) {
            await this.agentManager.stop();
        }
    }
}

/**
 * Creates a shared WebSocket test fixture for multiple test files.
 * @param {number} port - Port number for the WebSocket server
 * @param {object} options - Configuration options
 * @returns {WebSocketTestFixture} Configured test fixture
 */
export function createWebSocketTestFixture(port, options = {}) {
    return new WebSocketTestFixture(port, options);
}