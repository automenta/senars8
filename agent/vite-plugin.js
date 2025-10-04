import logger from '../core/utils/logger.js';
import {WebSocketManager} from './WebSocketManager.js';
import {createMessageHandler} from './MessageHandler.js';

const log = logger.create('vite-plugin');

export const agentServerPlugin = (agentManager) => {
    let wsManager = null;

    return {
        name: 'agent-server-plugin',
        async configureServer(server) {
            try {
                // 1. Create the WebSocketManager.
                // If WS_PORT is specified, run a standalone server. Otherwise, attach to Vite's server.
                if (process.env.WS_PORT) {
                    const wsPort = parseInt(process.env.WS_PORT, 10);
                    log.info(`Starting standalone WebSocket server on port ${wsPort}`);
                    wsManager = new WebSocketManager({port: wsPort});
                } else {
                    log.info('Attaching WebSocketManager to Vite dev server.');
                    wsManager = new WebSocketManager({server: server.httpServer});
                }

                await wsManager.start();

                // 2. Link the WebSocketManager to the AgentManager
                agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

                // 3. Initialize the AgentManager
                await agentManager.initialize();

                // 4. Set up the message handler
                const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
                wsManager.setMessageHandler(messageHandler);

                if (!process.env.WS_PORT) {
                    const address = server.httpServer.address();
                    if (address) {
                        log.info(`WebSocketManager attached to Vite dev server on port ${address.port}.`);
                    } else {
                        log.info('WebSocketManager attached to Vite dev server.');
                    }
                }

            } catch (error) {
                log.error('Failed to configure WebSocketManager:', error);
            }
        },

        async closeBundle() {
            if (wsManager) {
                await wsManager.stop();
                wsManager = null;
            }
        }
    };
};