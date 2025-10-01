import {WebSocketServer as WsServer} from 'ws';
import {serverError, serverInfo} from './utils/logger.js';

export const startWebSocketServer = (port) => {
    const wss = new WsServer({port});
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
                try {
                    const message = JSON.parse(data);
                    await messageHandler(message, ws);
                } catch (err) {
                    serverError('Failed to handle message:', err);
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: {message: 'Invalid message format or handler error.'}
                    }));
                }
            }
        });

        ws.on('close', () => {
            serverInfo('Client disconnected');
        });
    });

    const setMessageHandler = (handler) => {
        messageHandler = handler;
    };

    serverInfo(`Agent WebSocket server started on port ${port}`);

    return {wss, broadcast, setMessageHandler};
};