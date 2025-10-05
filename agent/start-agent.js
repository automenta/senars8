import logger from '../core/utils/logger.js';
import AgentManager from './AgentManager.js';
import {UnifiedWebSocketServer} from './StandaloneWebSocketServer.js';
import {createMessageHandler} from './MessageHandler.js';

const log = logger.create('start-agent');

const startAgent = async () => {
    try {
        log.info('Starting agent with WebSocket server...');

        const agentManager = new AgentManager();
        const wsPort = parseInt(process.env.WS_PORT, 10) || 8081;
        const wsManager = new UnifiedWebSocketServer({port: wsPort});

        await wsManager.start();

        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        await agentManager.initialize();

        const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
        wsManager.setMessageHandler(messageHandler);

        log.info(`Agent and WebSocket server started on port ${wsPort}.`);

        // Graceful shutdown
        const shutdown = async () => {
            log.info('Shutting down agent and WebSocket server...');
            await agentManager.stop();
            await wsManager.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

    } catch (error) {
        log.error('Failed to start agent:', error);
        process.exit(1);
    }
};

startAgent();