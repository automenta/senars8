import {WebSocketServer as WsServer} from 'ws';
import logger from '../core/utils/logger.js';
import {WebSocketMessageHandler} from './WebSocketMessageHandler.js';

const log = logger.create('StandaloneWebSocketServer');

export class StandaloneWebSocketServer {
    constructor(port) {
        if (!port) {
            throw new Error('A port is required to start the standalone WebSocket server.');
        }
        this.port = port;
        this.wss = null;
        this.messageHandler = new WebSocketMessageHandler();
    }

    async start() {
        return new Promise((resolve) => {
            this.wss = new WsServer({port: this.port}, () => {
                log.info(`Standalone WebSocket server started on port ${this.port}`);
                resolve();
            });
            this.setupWebSocketHandlers();
        });
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws) => {
            log.info('A new client connected.');
            ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));

            ws.on('error', (err) => {
                log.error('WebSocket error:', err);
            });

            ws.on('message', async (data) => {
                await this.messageHandler.handleMessage(data, ws);
            });

            ws.on('close', () => {
                log.info('Client disconnected.');
            });
        });
    }

    setMessageHandler(handler) {
        this.messageHandler.setHandler(handler);
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