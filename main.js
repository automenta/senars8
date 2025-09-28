import { Agent } from './agent/index.js';
import TUIApplication from './tui/src/Application.js';
import WebUI from './ui/src/WebUI.js';
import logger from './common/services/Logger.js';

const mainLogger = logger.createNamespace('Main');

class SENARSMain {
    constructor(options = {}) {
        this.agent = new Agent(options.agentConfig ?? {});
        this.tui = new TUIApplication();
        this.webui = new WebUI();
        this.isShuttingDown = false;
    }

    async start() {
        mainLogger.info('Starting SENARS system...');
        try {
            await this.agent.initialize();
            mainLogger.info('Agent initialized successfully');

            await this.tui.start();
            mainLogger.info('TUI started successfully');

            await this.webui.start();
            mainLogger.info('WebUI started successfully');

            console.log('SENARS system started successfully!');
            console.log('TUI is available in the terminal.');
            console.log(`WebUI is available at http://${this.webui.host}:${this.webui.port}`);

        } catch (error) {
            mainLogger.error('Failed to start SENARS system:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }
        this.isShuttingDown = true;
        mainLogger.info('Stopping SENARS system...');

        try {
            this.tui.stop?.();
            this.webui.stop?.();
            await this.agent.stop?.();
            mainLogger.info('SENARS system stopped');
        } catch (error) {
            mainLogger.error('Error during shutdown:', error);
        }
    }
}

const main = new SENARSMain();

const handleSignal = async (signal) => {
    mainLogger.info(`Received ${signal}, shutting down...`);
    await main.shutdown();
    process.exit(0);
};

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

const handleError = async (error, type) => {
    mainLogger.error(`Unhandled ${type}:`, error);
    await main.shutdown();
    process.exit(1);
};

process.on('uncaughtException', (error) => handleError(error, 'exception'));
process.on('unhandledRejection', (reason) => handleError(reason, 'rejection'));

if (import.meta.url.startsWith('file:') && process.argv[1] === import.meta.url.slice(7)) {
    main.start();
}

export default SENARSMain;