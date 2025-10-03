import logger from '../core/utils/logger.js';
import { startWebSocketServer } from './WebSocketServer.js';
import { createMessageHandler } from './MessageHandler.js';

const log = logger.create('vite-plugin');

export const agentServerPlugin = (agentManager) => ({
    name: 'agent-server-plugin',
    configureServer(server) {
        const { broadcast, setMessageHandler } = startWebSocketServer(server.httpServer);
        log.info('WebSocket server started and attached to Vite server.');

        const messageHandler = createMessageHandler(agentManager, broadcast);
        setMessageHandler(messageHandler);
        log.info('MessageHandler set.');
    },
});