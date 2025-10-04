import {WebSocketServer as WsServer} from 'ws';
import logger from '../core/utils/logger.js';

const log = logger.create('StandaloneWebSocketServer');

export class StandaloneWebSocketServer {
    constructor(port) {
        if (!port) {
            throw new Error('A port is required to start the standalone WebSocket server.');
        }
        this.port = port;
        this.wss = null;
        this.messageHandler = null;
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
                if (this.messageHandler) {
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
                        await this.messageHandler(message, ws);
                    }, ws, 'handle message');
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