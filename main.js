import {execa} from 'execa';
import {createServer} from 'vite';
import path from 'path';
import Agent from './agent/index.js';
import logger from './core/utils/logger.js';
import AgentManager from './agent/AgentManager.js';
import {agentServerPlugin} from './agent/vite-plugin.js';
import {pathToFileURL} from 'url';
import {applicationConfig} from './core/index.js';
import {setupGracefulShutdown} from './core/utils/system.js';
import {handleUncaughtError} from './core/utils/system.js';
import resourceManager from './core/utils/ResourceManager.js';

const log = logger.create('main');

export const AppRunner = {
    async startWebInterface(agentManager) {
        log.info('Starting web UI...');
        try {
            const port = process.env.PORT || applicationConfig.getUiPort();
            const server = await createServer({
                configFile: path.resolve(process.cwd(), 'ui/vite.config.js'),
                root: path.resolve(process.cwd(), 'ui'),
                server: {
                    port: port,
                    clearScreen: false,
                    strictPort: true // Fail if port is busy
                },
                plugins: [agentServerPlugin(agentManager)],
            });
            await server.listen();
            server.printUrls();
            log.info(`Web UI started successfully on port ${port}`);
            
            // Register server with resource manager
            resourceManager.register('server', server, 'close');
            return server;
        } catch (error) {
            log.error(`Failed to start web UI on port ${process.env.PORT || applicationConfig.getUiPort()}. Is the port already in use?`);
            log.error(`Error details: ${error.message}`);
            log.error(`Suggestion: Try using a different port with PORT=3001 npm run dev`);
            throw error;
        }
    },

    async startTui() {
        log.info('Starting TUI...');
        const tuiProcess = execa('node', ['tui/src/index.jsx'], {stdio: 'inherit'});
        tuiProcess.on('exit', (code) => {
            log.info(`TUI process exited with code ${code}`);
            process.exit(code);
        });
        
        // Register process with resource manager
        resourceManager.register('tuiProcess', tuiProcess, 'kill');
        return tuiProcess;
    },

    async startAgent() {
        log.info('Starting agent with CoreAgent system...');
        const agent = new Agent();
        await agent.initialize();
        agent.start();
        log.info('Agent with CoreAgent system started successfully.');
        return agent;
    },

    async run(args = {}) {
        try {
            const agentManager = new AgentManager();
            // Initialization is now handled by the component that uses it (e.g., Vite plugin)
            
            // Register agent manager with resource manager
            resourceManager.register('agentManager', agentManager);
            
            if (args.web) {
                await this.startWebInterface(agentManager);
            } else if (args.tui) {
                await this.startTui();
            } else {
                await this.startAgent();
            }

            // Set up graceful shutdown after the app is running
            setupGracefulShutdown(log, () => this.shutdown());

            return {
                agentManager: resourceManager.get('agentManager'),
                server: resourceManager.get('server'),
                process: resourceManager.get('tuiProcess'),
            };
        } catch (error) {
            log.error('Application run failed:', error);
            if (process.env.NODE_ENV !== 'test') {
                process.exit(1);
            } else {
                throw error;
            }
        }
    },

    async shutdown() {
        log.info('Shutting down gracefully...');
        // Use resource manager to handle all resource cleanup
        await resourceManager.shutdown();
    },
};

// --- Main Execution ---
const getArgs = () => {
    const args = {};
    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            args[key] = value === undefined ? true : value;
        }
    }
    return args;
};

const main = async () => {
    await AppRunner.run(getArgs());
};

// This check ensures that main() is only called when the script is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        handleUncaughtError(error, log, async () => {
            // Resource manager handles cleanup
        });
    });
}