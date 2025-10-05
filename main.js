import {execa} from 'execa';
import {createServer} from 'vite';
import path from 'path';
import Agent from './agent/index.js';
import logger from './core/utils/logger.js';
import AgentManager from './agent/AgentManager.js';
import {agentServerPlugin} from './agent/vite-plugin.js';
import {pathToFileURL} from 'url';

const log = logger.create('main');

export const AppRunner = {
    // Keep track of active components for graceful shutdown
    _activeProcess: null,
    _activeServer: null,
    _activeAgentManager: null,

    async startWebInterface(agentManager) {
        log.info('Starting web UI...');
        const server = await createServer({
            configFile: path.resolve(process.cwd(), 'ui/vite.config.js'),
            root: path.resolve(process.cwd(), 'ui'),
            server: {port: process.env.PORT || 8080, clearScreen: false},
            plugins: [agentServerPlugin(agentManager)],
        });
        await server.listen();
        server.printUrls();
        return server;
    },

    async startTui() {
        log.info('Starting TUI...');
        const tuiProcess = execa('node', ['tui/src/index.jsx'], {stdio: 'inherit'});
        tuiProcess.on('exit', (code) => {
            log.info(`TUI process exited with code ${code}`);
            process.exit(code);
        });
        return tuiProcess;
    },

    async startAgent() {
        log.info('Starting agent...');
        const agent = new Agent();
        await agent.initialize();
        agent.start();
        log.info('Agent started successfully.');
        return agent;
    },

    async run(args = {}) {
        try {
            const agentManager = new AgentManager();
            // Initialization is now handled by the component that uses it (e.g., Vite plugin)
            this._activeAgentManager = agentManager;

            if (args.web) {
                this._activeServer = await this.startWebInterface(agentManager);
            } else if (args.tui) {
                this._activeProcess = await this.startTui();
            } else {
                await this.startAgent();
            }

            return {
                agentManager: this._activeAgentManager,
                server: this._activeServer,
                process: this._activeProcess,
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
        if (this._activeAgentManager) {
            await this._activeAgentManager.stop();
            this._activeAgentManager = null;
        }
        if (this._activeProcess) {
            this._activeProcess.kill('SIGTERM');
            this._activeProcess = null;
        }
        if (this._activeServer) {
            // The Vite dev server will handle closing the standalone WebSocket server through the plugin's closeBundle hook
            await this._activeServer.close();
            this._activeServer = null;
        }
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
    const gracefulShutdownHandler = async (signal) => {
        log.info(`Received ${signal}.`);
        await AppRunner.shutdown();
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdownHandler('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdownHandler('SIGTERM'));

    await AppRunner.run(getArgs());
};

// This check ensures that main() is only called when the script is executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        log.error('Unhandled error in main execution:', error);
        process.exit(1);
    });
}