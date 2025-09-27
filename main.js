import {Agent} from './agent/index.js';
import TUIApplication, {TUIConfig} from './tui/src/index.js';
import WebUI, {UIConfig} from './ui/src/index.js';
import {error as logError, info as logInfo} from './core/utils/logger.js';

class SENARSMain {
    constructor(options = {}) {
        this.agent = null;
        this.tui = null;
        this.webui = null;
        this.config = {
            agentConfig: options.agentConfig ?? {},
            tuiConfig: options.tuiConfig ?? {},
            webuiConfig: options.webuiConfig ?? {port: 3000}
        };
        this.isShuttingDown = false;
    }

    async initialize() {
        logInfo('Initializing SENARS system...');

        try {
            // Create and initialize the agent
            this.agent = new Agent(this.config.agentConfig);
            await this.agent.initialize();

            logInfo('Agent initialized successfully');
        } catch (error) {
            logError('Failed to initialize agent:', error);
            throw error;
        }
    }

    async startTUI() {
        if (!this.agent) {
            throw new Error('Agent must be initialized before starting TUI');
        }

        logInfo('Starting TUI...');
        try {
            const tuiConfig = new TUIConfig(this.config.tuiConfig);
            this.tui = new TUIApplication({config: tuiConfig});
            logInfo('TUI started successfully');
        } catch (error) {
            logError('Failed to start TUI:', error);
            throw error;
        }
    }

    async startWebUI() {
        if (!this.agent) {
            throw new Error('Agent must be initialized before starting WebUI');
        }

        logInfo('Starting WebUI...');
        try {
            const webuiConfig = new UIConfig(this.config.webuiConfig);
            this.webui = new WebUI(this.agent, webuiConfig.getAll());
            await this.webui.start();
            logInfo('WebUI started successfully');
        } catch (error) {
            logError('Failed to start WebUI:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this.initialize();

            // Start both UIs
            await this.startTUI();
            await this.startWebUI();

            this._logStartupMessage();
        } catch (error) {
            logError('Failed to start SENARS system:', error);
            throw error;
        }
    }

    _logStartupMessage() {
        console.log('SENARS system started successfully!');
        console.log('TUI is available in the terminal');
        console.log('WebUI is available at http://localhost:3000');
    }

    async stop() {
        if (this.isShuttingDown) {
            return;
        }
        
        this.isShuttingDown = true;
        logInfo('Stopping SENARS system...');

        try {
            if (this.tui) {
                await this.tui.stop?.();
            }

            if (this.webui) {
                await this.webui.stop?.();
            }

            if (this.agent) {
                await this.agent.stop?.();
            }

            logInfo('SENARS system stopped');
        } catch (error) {
            logError('Error during shutdown:', error);
        }
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    logInfo('Received SIGINT, shutting down...');
    // Give some time for graceful shutdown
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('SIGTERM', async () => {
    logInfo('Received SIGTERM, shutting down...');
    // Give some time for graceful shutdown
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError('Uncaught exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// For testing purposes, we'll export the main class
export default SENARSMain;

// If this file is run directly, start the application
if (import.meta.url === `file://${process.argv[1]}`) {
    const main = new SENARSMain();
    main.start().catch((error) => {
        logError('Application startup failed:', error);
        process.exit(1);
    });
}