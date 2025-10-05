import logger from '../core/utils/logger.js';
import {UnifiedWebSocketServer} from './StandaloneWebSocketServer.js';
import {createMessageHandler} from './MessageHandler.js';

const log = logger.create('vite-plugin');

export const agentServerPlugin = (agentManager) => {
  let wsManager = null;

  return {
    name: 'agent-server-plugin',
    async configureServer(server) {
      try {
        if (process.env.WS_PORT) {
          const wsPort = parseInt(process.env.WS_PORT, 10);
          log.info(`Starting standalone WebSocket server on port ${wsPort}`);
          wsManager = new UnifiedWebSocketServer({port: wsPort});
        } else {
          log.info('Attaching UnifiedWebSocketServer to Vite dev server.');
          wsManager = new UnifiedWebSocketServer({server: server.httpServer});
        }

        await wsManager.start();
        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));
        await agentManager.initialize();

        const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
        wsManager.setMessageHandler(messageHandler);

        if (!process.env.WS_PORT) {
          const address = server.httpServer.address();
          log.info(address
            ? `UnifiedWebSocketServer attached to Vite dev server on port ${address.port}.`
            : 'WebSocket server attached to Vite dev server.'
          );
        }
      } catch (error) {
        log.error('Failed to configure UnifiedWebSocketServer:', error);
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