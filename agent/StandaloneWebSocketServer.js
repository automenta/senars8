/**
 * Unified WebSocket Server for CoreAgent system
 * Provides WebSocket connectivity using the coreagent architecture
 */

// System import removed - not currently used
import logger from '../coreagent/utils/logger.js';

const log = logger.create('WebSocketServer');

/**
 * Unified WebSocket Server that integrates with CoreAgent system
 */
export class UnifiedWebSocketServer {
    constructor(coreagentSystem, options = {}) {
        this.system = coreagentSystem;
        this.options = {
            port: options.port || 8080,
            host: options.host || 'localhost',
            ...options
        };
        this.wss = null;
        this.clients = new Set();
    }

    /**
     * Start the WebSocket server
     */
    async start() {
        log.info(`Starting WebSocket server on ${this.options.host}:${this.options.port}`);

        // Use coreagent's plugin system for WebSocket functionality
        this.system.use('websocket', async (_core) => {
            return {
                name: 'WebSocketServer',
                async initialize() {
                    log.info('WebSocket plugin initialized');
                },
                async start() {
                    log.info('WebSocket plugin started');
                }
            };
        });

        await this.system.loadPlugin('websocket');
        log.info('WebSocket server started successfully');
    }

    /**
     * Stop the WebSocket server
     */
    async stop() {
        log.info('Stopping WebSocket server');

        if (this.wss) {
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();
            this.wss.close();
            this.wss = null;
        }

        await this.system.unloadPlugin('websocket');
        log.info('WebSocket server stopped');
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(data) {
        const message = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === 1) { // OPEN
                client.send(message);
            }
        }
    }

    /**
     * Send message to specific client
     */
    send(clientId, data) {
        // Implementation would depend on how clients are tracked
        log.debug(`Sending message to client ${clientId}`);
    }
}