import {WebSocketServer as WsServer} from 'ws';
import logger from '../core/utils/logger.js';

const log = logger.create('UnifiedWebSocketServer');

/**
 * Unified WebSocket server that handles both standalone and attached server modes.
 * Consolidates common WebSocket functionality to eliminate duplication.
 */
export class UnifiedWebSocketServer {
    constructor(options) {
        if (!options || (!options.server && !options.port)) {
            throw new Error('Either a server instance or a port is required.');
        }
        this.options = options;
        this.wss = null;
        this.messageHandler = null;
        this.isStandalone = !!options.port;
    }

    async start() {
        if (this.isStandalone) {
            return this._startStandalone();
        } else {
            return this._startAttached();
        }
    }

    async _startStandalone() {
        return new Promise((resolve) => {
            this.wss = new WsServer({port: this.options.port}, () => {
                log.info(`Standalone WebSocket server started on port ${this.options.port}`);
                resolve();
            });
            this._setupWebSocketHandlers();
        });
    }

    async _startAttached() {
        this.wss = new WsServer({server: this.options.server});
        this._setupWebSocketHandlers();
        log.info('WebSocket server attached to HTTP server');
        return Promise.resolve();
    }

    _setupWebSocketHandlers() {
        this.wss.on('connection', (ws) => {
            log.info('A new client connected.');
            ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));

            ws.on('error', (err) => {
                log.error('WebSocket error:', err);
            });

            ws.on('message', async (data) => {
                if (this.messageHandler) {
                    await this.messageHandler(data, ws);
                }
            });

            ws.on('close', () => {
                log.info('Client disconnected.');
            });
        });
    }

    setMessageHandler(handler) {
        this.messageHandler = handler;
    }

    async stop() {
        return new Promise((resolve) => {
            if (this.wss) {
                if (this.wss.clients) {
                    for (const client of this.wss.clients) {
                        if (client.readyState === client.OPEN) {
                            client.terminate();
                        }
                    }
                }
                this.wss.close(() => {
                    log.info('WebSocket server connections closed.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    broadcast(data) {
        if (this.wss && this.wss.clients) {
            const message = JSON.stringify(data, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            });
            this.wss.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                    client.send(message);
                }
            });
        }
    }
}