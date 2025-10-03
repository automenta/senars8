import { execa } from 'execa';
import { createServer } from 'vite';
import path from 'path';
import Agent from './agent/index.js';
import logger from './core/utils/logger.js';
import { startWebSocketServer } from './agent/WebSocketServer.js';
import { createMessageHandler } from './agent/MessageHandler.js';
import AgentManager from './agent/AgentManager.js';

const log = logger.create('main');

// Custom Vite plugin to integrate the WebSocket server
const agentServerPlugin = (agentManager) => ({
    name: 'agent-server-plugin',
    configureServer(server) {
        const { broadcast, setMessageHandler } = startWebSocketServer(server.httpServer);
        log.info('WebSocket server started and attached to Vite server.');

        const messageHandler = createMessageHandler(agentManager, broadcast);
        setMessageHandler(messageHandler);
        log.info('MessageHandler set.');
    },
});

async function start() {
    const args = process.argv.slice(2);

    if (args.includes('--web')) {
        log.info('Starting web UI and agent server...');
        try {
            const agentManager = new AgentManager(() => {}); // Dummy broadcast for now
            await agentManager.initialize();
            log.info('AgentManager initialized.');

            const viteServer = await createServer({
                configFile: path.resolve(process.cwd(), 'ui/vite.config.js'),
                root: path.resolve(process.cwd(), 'ui'),
                server: {
                    port: 8080,
                },
                plugins: [agentServerPlugin(agentManager)],
            });

            await viteServer.listen();
            viteServer.printUrls();
        } catch (error) {
            log.error('Failed to start web UI and agent server:', error);
            process.exit(1);
        }
    } else if (args.includes('--tui')) {
        log.info('Starting TUI...');
        try {
            const tuiProcess = execa('node', ['tui/src/index.js'], {
                stdio: 'inherit',
            });
            tuiProcess.on('exit', (code) => {
                log.info(`TUI process exited with code ${code}`);
            });
        } catch (error) {
            log.error('Failed to start TUI:', error);
            process.exit(1);
        }
    } else {
        log.info('Starting agent...');
        try {
            const agent = new Agent();
            await agent.initialize();
            agent.start();
            log.info('Agent started successfully.');
        } catch (error) {
            log.error('Failed to start agent:', error);
            process.exit(1);
        }
    }
}

start().catch((error) => {
    log.error('Unhandled error in main:', error);
    process.exit(1);
});