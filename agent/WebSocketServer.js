import {WebSocketServer as WsServer} from 'ws';
import {error as serverError, info as serverInfo} from '../core/utils/logger.js';

export const startWebSocketServer = (server) => {
    const wss = new WsServer({server});
    let messageHandler = null;

    const broadcast = (data) => {
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    };

    wss.on('connection', (ws) => {
        serverInfo('A new client connected');
        ws.send(JSON.stringify({type: 'connection_ack', payload: {message: 'Welcome!'}}));

        ws.on('error', (err) => serverError('WebSocket error:', err));

        ws.on('message', async (data) => {
            if (messageHandler) {
                const {executeAsync} = await import('./utils/asyncWrapper.js');
                await executeAsync(async () => {
                    const message = JSON.parse(data);
                    await messageHandler(message, ws);
                }, ws, 'handle message');
            }
        });

        ws.on('close', () => {
            serverInfo('Client disconnected');
        });
    });

    const setMessageHandler = (handler) => {
        messageHandler = handler;
    };

    return {wss, broadcast, setMessageHandler};
};