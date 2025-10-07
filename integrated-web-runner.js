import {createServer} from 'vite';
import path from 'path';
import {fileURLToPath} from 'url';
import logger from './core/utils/logger.js';
import AgentManager from './agent/AgentManager.js';
import {UnifiedWebSocketServer} from './agent/StandaloneWebSocketServer.js';
import {createMessageHandler} from './agent/MessageHandler.js';
import {findAvailablePort} from './tests/utils/networkUtils.js';
import {applicationConfig} from './core/config/index.js';
import {setupGracefulShutdown} from './core/utils/system.js';

const log = logger.create('integrated-web-runner');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IntegratedWebRunner {
    constructor() {
        this.viteServer = null;
        this.agentManager = null;
        this.wsServer = null;
        this.port = null;
        this.wsPort = null;
    }

    async start() {
        try {
            log.info('Starting integrated Web UI with embedded Agent...');

            // Use configured ports, with fallback to available ports
            this.port = await findAvailablePort(applicationConfig.getUiPort());
            this.wsPort = await findAvailablePort(applicationConfig.getWsPort());

            log.info(`Using HTTP port: ${this.port}`);
            log.info(`Using WebSocket port: ${this.wsPort}`);

            // Start the agent manager first
            await this.startAgent();

            // Start the Vite dev server with the agent plugin
            await this.startViteServer();

            // Set up graceful shutdown
            setupGracefulShutdown(log, () => this.cleanup());

            log.info('Integrated Web UI started successfully!');
            log.info(`Web UI available at: http://localhost:${this.port}`);
            log.info(`WebSocket server running on port: ${this.wsPort}`);

            return {
                port: this.port,
                wsPort: this.wsPort,
                server: this.viteServer,
                agentManager: this.agentManager,
                wsServer: this.wsServer
            };

        } catch (error) {
            log.error('Failed to start integrated Web UI:', error);
            await this.cleanup();
            throw error;
        }
    }

    async startAgent() {
        log.info('Starting embedded agent...');

        this.agentManager = new AgentManager();

        // Create WebSocket server for the agent
        this.wsServer = new UnifiedWebSocketServer({port: this.wsPort});
        await this.wsServer.start();

        // Set up message handling
        const messageHandler = createMessageHandler(this.agentManager, this.wsServer.broadcast.bind(this.wsServer));
        this.wsServer.setMessageHandler(messageHandler);

        // Link WebSocket server to agent manager
        this.agentManager.setBroadcast(this.wsServer.broadcast.bind(this.wsServer));

        // Initialize the agent manager
        await this.agentManager.initialize();

        log.info('Embedded agent started successfully');
    }

    async startViteServer() {
        log.info('Starting Vite dev server...');

        // Set environment variables for the Web UI to connect to our WebSocket server
        process.env.WS_PORT = this.wsPort.toString();
        process.env.VITE_WS_URL = `ws://localhost:${this.wsPort}`;

        try {
            this.viteServer = await createServer({
                configFile: path.resolve(__dirname, 'ui/vite.config.js'),
                root: path.resolve(__dirname, 'ui'),
                server: {
                    port: this.port,
                    host: '0.0.0.0', // Allow external connections
                    strictPort: true, // Fail if port is busy
                    clearScreen: false,
                    // Better HMR configuration for development
                    hmr: {
                        overlay: true, // Show overlay on errors
                    }
                },
                define: {
                    __WS_PORT__: this.wsPort,
                    __DEV_MODE__: true,
                    // Make sure environment is correctly set
                    'process.env.NODE_ENV': JSON.stringify('development')
                },
                // Enable better logging during development
                logLevel: 'info'
            });

            await this.viteServer.listen();
            this.viteServer.printUrls();

            log.info(`Vite dev server started on port ${this.port}`);
        } catch (error) {
            log.error(`Failed to start Vite dev server on port ${this.port}. Is the port already in use?`);
            log.error(`Error details: ${error.message}`);
            log.error(`Suggestion: Try using a different port or stopping other applications using port ${this.port}`);
            throw error;
        }
    }



    async cleanup() {
        log.info('Cleaning up integrated Web UI...');

        if (this.agentManager) {
            try {
                await this.agentManager.stop();
                log.info('Agent manager stopped');
            } catch (error) {
                log.error('Error stopping agent manager:', error);
            }
        }

        if (this.wsServer) {
            try {
                await this.wsServer.stop();
                log.info('WebSocket server stopped');
            } catch (error) {
                log.error('Error stopping WebSocket server:', error);
            }
        }

        if (this.viteServer) {
            try {
                await this.viteServer.close();
                log.info('Vite dev server stopped');
            } catch (error) {
                log.error('Error stopping Vite dev server:', error);
            }
        }
    }
}

// Main execution
const main = async () => {
    const runner = new IntegratedWebRunner();
    await runner.start();

    // Keep the process alive
    return new Promise(() => {
        // Process will be terminated by graceful shutdown handlers
    });
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    import {handleUncaughtError} from './core/utils/system.js';
    main().catch(error => {
        handleUncaughtError(error, log, async () => {
            // Perform any necessary cleanup here
        });
    });
}

export default IntegratedWebRunner;