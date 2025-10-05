import {WebSocketServer as WsServer} from 'ws';
import logger from '../core/utils/logger.js';
import {StandaloneWebSocketServer} from './StandaloneWebSocketServer.js';
import {WebSocketMessageHandler} from './WebSocketMessageHandler.js';

const log = logger.create('WebSocketManager');

export class WebSocketManager {
    constructor(options) {
        if (!options || (!options.server && !options.port)) {
            throw new Error('Either a server instance or a port is required.');
        }
        this.options = options;
        this.wsServerInstance = null;
        this.messageHandler = new WebSocketMessageHandler();
    }

    async start() {
        if (this.options.port) {
            log.info(`Starting standalone WebSocket server on port ${this.options.port}`);
            this.wsServerInstance = new StandaloneWebSocketServer(this.options.port);
            await this.wsServerInstance.start();
        } else {
            log.info('Attaching WebSocketManager to the provided HTTP server.');
            this.wsServerInstance = this.createAttachedServer(this.options.server);
        }
        this.wsServerInstance.setMessageHandler(this.messageHandler);
    }

    createAttachedServer(server) {
        const wss = new WsServer({server});
        const messageHandler = new WebSocketMessageHandler();

        wss.on('connection', (ws) => {
            log.info('A new client connected.');
            ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));

            ws.on('error', (err) => log.error('WebSocket error:', err));

            ws.on('message', async (data) => {
                await messageHandler.handleMessage(data, ws);
            });

            ws.on('close', () => log.info('Client disconnected.'));
        });

        const broadcast = (data) => {
            if (wss && wss.clients) {
                const message = JSON.stringify(data, (key, value) => {
                    if (typeof value === 'bigint') {
                        return value.toString();
                    }
                    return value;
                });
                wss.clients.forEach(client => {
                    if (client.readyState === client.OPEN) {
                        client.send(message);
                    }
                });
            }
        }

        const setMessageHandler = (handler) => {
            messageHandler.setHandler(handler);
        };

        const stop = async () => {
            return new Promise((resolve) => {
                if (wss) {
                    if (wss.clients) {
                        for (const client of wss.clients) {
                            if (client.readyState === client.OPEN) {
                                client.terminate();
                            }
                        }
                    }
                    wss.close(() => {
                        log.info('Attached WebSocket server connections closed.');
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }

        return {
            broadcast,
            setMessageHandler,
            stop
        };
    }

    setMessageHandler(handler) {
        this.messageHandler = handler;
        if (this.wsServerInstance) {
            this.wsServerInstance.setMessageHandler(handler);
        }
    }

    async stop() {
        if (this.wsServerInstance) {
            await this.wsServerInstance.stop();
            log.info('WebSocketManager stopped.');
        }
    }

    broadcast(data) {
        if (this.wsServerInstance) {
            this.wsServerInstance.broadcast(data);
        } else {
            log.warn('WebSocketManager is not started, cannot broadcast message.');
        }
    }
}