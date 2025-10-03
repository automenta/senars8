import { WebSocketServer as WsServer } from 'ws';
import logger from '../core/utils/logger.js';

const log = logger.create('StandaloneWebSocketServer');

export class StandaloneWebSocketServer {
    constructor(port = 8081) {
        this.port = port;
        this.wss = null;
        this.server = null;
        this.messageHandler = null;
    }

    async start(agentManager) {
        return new Promise((resolve, reject) => {
            // Create a simple HTTP server for the WebSocket to attach to
            const http = await import('http');
            this.server = http.createServer();

            // Listen on the specified port
            this.server.listen(this.port, () => {
                log.info(`Standalone WebSocket server listening on port ${this.port}`);
                
                // Create WebSocket server attached to the HTTP server
                this.wss = new WsServer({ server: this.server });
                
                this.setupWebSocketHandlers(agentManager);
                resolve();
            });

            this.server.on('error', (err) => {
                log.error('WebSocket server error:', err);
                reject(err);
            });
        });
    }

    setupWebSocketHandlers(agentManager) {
        this.wss.on('connection', (ws) => {
            log.info('A new client connected to standalone WebSocket server');
            ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome to the standalone WebSocket server!'}}));

            ws.on('error', (err) => {
                log.error('WebSocket error:', err);
            });

            ws.on('message', async (data) => {
                if (this.messageHandler) {
                    const {executeAsync} = await import('./utils/asyncWrapper.js');
                    await executeAsync(async () => {
                        const message = JSON.parse(data);
                        await this.messageHandler(message, ws);
                    }, ws, 'handle message');
                }
            });

            ws.on('close', () => {
                log.info('Client disconnected from standalone WebSocket server');
            });
        });
    }

    setMessageHandler(handler) {
        this.messageHandler = handler;
    }

    async stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    log.info('Standalone WebSocket server closed');
                    resolve();
                });
            });
        }
    }

    broadcast(data) {
        if (this.wss && this.wss.clients) {
            this.wss.clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    }
}