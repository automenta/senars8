import {WebSocketServer as WsServer} from 'ws';
import logger from '../core/utils/logger.js';
import {StandaloneWebSocketServer} from './StandaloneWebSocketServer.js';

const log = logger.create('WebSocketManager');

export class WebSocketManager {
    constructor(options) {
        if (!options || (!options.server && !options.port)) {
            throw new Error('Either a server instance or a port is required.');
        }
        this.options = options;
        this.wsServerInstance = null;
        this.messageHandler = null;
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

        const setupWebSocketHandlers = (handler) => {
            wss.on('connection', (ws) => {
                log.info('A new client connected.');
                ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));

                ws.on('error', (err) => log.error('WebSocket error:', err));

                ws.on('message', async (data) => {
                    if (handler) {
                        const {executeAsync} = await import('./utils/asyncWrapper.js');
                        await executeAsync(async () => {
                            let message;
                            try {
                                message = JSON.parse(data, (key, value) => {
                                    // Convert string representations of large numbers back to numbers
                                    if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
                                        // This might be a large number that was converted to string to preserve precision
                                        // Check if it fits in a safe integer, otherwise potentially convert to BigInt
                                        const numValue = Number(value);
                                        if (Number.isSafeInteger(numValue)) {
                                            return numValue;
                                        } else {
                                            // For unsafe integers, we can preserve as BigInt for internal processing
                                            try {
                                                return BigInt(value);
                                            } catch (e) {
                                                return value; // Keep as string if BigInt conversion fails
                                            }
                                        }
                                    }
                                    return value;
                                });
                            } catch (parseError) {
                                console.error('Error parsing WebSocket message:', parseError);
                                // Send error response to client
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    payload: {message: 'Invalid JSON received: ' + parseError.message}
                                }));
                                return;
                            }
                            await handler(message, ws);
                        }, ws, 'handle message');
                    }
                });

                ws.on('close', () => log.info('Client disconnected.'));
            });
        };

        let messageHandler = null;

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
            messageHandler = handler;
            // Since this is called after instantiation, we need to ensure the handlers are set up
            setupWebSocketHandlers(messageHandler);
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