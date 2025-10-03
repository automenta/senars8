import logger from '../core/utils/logger.js';
import { StandaloneWebSocketServer } from './StandaloneWebSocketServer.js';
import { createMessageHandler } from './MessageHandler.js';

const log = logger.create('vite-plugin');

export const agentServerPlugin = (agentManager) => {
    let standaloneWsServer = null;
    
    return {
        name: 'agent-server-plugin',
        async configureServer(server) {
            // Use a separate port for WebSocket communication to avoid conflicts with Vite
            const wsPort = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8081;
            
            try {
                standaloneWsServer = new StandaloneWebSocketServer(wsPort);
                
                // Start the standalone WebSocket server
                await standaloneWsServer.start(agentManager);
                
                // Set up message handler
                const messageHandler = createMessageHandler(agentManager, (data) => {
                    standaloneWsServer.broadcast(data);
                });
                
                standaloneWsServer.setMessageHandler(messageHandler);
                
                log.info(`WebSocket server started on port ${wsPort} (standalone). UI should connect to ws://localhost:${wsPort}`);
                
                // Update config to reflect the actual WebSocket port being used
                process.env.ACTUAL_WS_PORT = wsPort.toString();
                
                // Add cleanup handler for dev server specifically
                server.httpServer.on('close', async () => {
                    if (standaloneWsServer) {
                        await standaloneWsServer.stop();
                    }
                });
                
                // Also handle process exit for proper cleanup
                const cleanup = async () => {
                    if (standaloneWsServer) {
                        await standaloneWsServer.stop();
                        standaloneWsServer = null;
                    }
                };
                
                process.on('SIGINT', cleanup);
                process.on('SIGTERM', cleanup);
                process.on('exit', cleanup);
                
            } catch (error) {
                log.error('Failed to start standalone WebSocket server:', error);
            }
        },
        
        async closeBundle() {
            // Clean up the standalone WebSocket server when Vite server closes
            if (standaloneWsServer) {
                await standaloneWsServer.stop();
                standaloneWsServer = null;
            }
        }
    };
};