/**
 * WebSocket Manager for CoreAgent system
 * Manages WebSocket connections using the coreagent architecture
 */

import {System} from '../coreagent/index.js';
import logger from '../coreagent/utils/logger.js';

const log = logger.create('WebSocketManager');

/**
 * WebSocket Manager that integrates with CoreAgent system
 */
export class WebSocketManager {
    constructor(coreagentSystem, options = {}) {
        this.system = coreagentSystem;
        this.options = {
            port: options.port || 8080,
            host: options.host || 'localhost',
            path: options.path || '/ws',
            ...options
        };
        this.connections = new Map();
        this.server = null;
    }

    /**
     * Start the WebSocket manager
     */
    async start() {
        log.info(`Starting WebSocket manager on ${this.options.host}:${this.options.port}`);

        // Use coreagent's plugin system for WebSocket management
        this.system.use('websocket-manager', async (core) => {
            return {
                name: 'WebSocketManager',
                async initialize() {
                    log.info('WebSocket manager plugin initialized');
                },
                async start() {
                    log.info('WebSocket manager plugin started');
                }
            };
        });

        await this.system.loadPlugin('websocket-manager');
        log.info('WebSocket manager started successfully');
    }

    /**
     * Stop the WebSocket manager
     */
    async stop() {
        log.info('Stopping WebSocket manager');

        // Close all connections
        for (const [id, connection] of this.connections) {
            connection.close();
        }
        this.connections.clear();

        if (this.server) {
            this.server.close();
            this.server = null;
        }

        await this.system.unloadPlugin('websocket-manager');
        log.info('WebSocket manager stopped');
    }

    /**
     * Handle new connection
     */
    async handleConnection(ws, request) {
        const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        log.info(`New WebSocket connection: ${connectionId}`);

        // Store connection
        this.connections.set(connectionId, {
            id: connectionId,
            ws,
            request,
            connectedAt: new Date(),
            lastActivity: new Date()
        });

        // Set up event handlers
        ws.on('message', (data) => {
            this._handleMessage(connectionId, data);
        });

        ws.on('close', () => {
            this._handleDisconnection(connectionId);
        });

        ws.on('error', (error) => {
            log.error(`WebSocket connection ${connectionId} error:`, error);
            this._handleDisconnection(connectionId);
        });

        // Send welcome message
        this._sendToConnection(connectionId, {
            type: 'welcome',
            connectionId,
            message: 'Connected to CoreAgent WebSocket manager'
        });
    }

    /**
     * Handle incoming message from connection
     */
    async _handleMessage(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        connection.lastActivity = new Date();

        try {
            const message = JSON.parse(data.toString());
            log.debug(`Message from ${connectionId}:`, message);

            // Emit through coreagent system
            await this.system.emit('websocket:message', {
                connectionId,
                message,
                connection
            });

        } catch (error) {
            log.error(`Error parsing message from ${connectionId}:`, error);
            this._sendToConnection(connectionId, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    /**
     * Handle connection disconnection
     */
    _handleDisconnection(connectionId) {
        log.info(`WebSocket connection disconnected: ${connectionId}`);

        this.connections.delete(connectionId);

        // Emit disconnection event through coreagent
        this.system.emit('websocket:disconnected', {connectionId});
    }

    /**
     * Send message to specific connection
     */
    _sendToConnection(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.ws.readyState === 1) { // OPEN
            connection.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Broadcast message to all connections
     */
    broadcast(data) {
        const message = JSON.stringify(data);
        for (const [id, connection] of this.connections) {
            if (connection.ws.readyState === 1) {
                connection.ws.send(message);
            }
        }
    }

    /**
     * Get connection info
     */
    getConnectionInfo(connectionId) {
        return this.connections.get(connectionId);
    }

    /**
     * Get all connections
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }

    /**
     * Get connection count
     */
    getConnectionCount() {
        return this.connections.size;
    }
}