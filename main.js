import { suppressOnnxWarnings } from './core/utils/onnxSuppression.js';
suppressOnnxWarnings();

import { Agent } from './agent/index.js';
import TUIApplication from './tui/src/Application.js';
import WebUI from './ui/src/WebUI.js';
import logger from './core/utils/logger.js';
import { gracefulShutdown, handleUncaughtError } from './core/utils/system.js';

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
        await this.agent.initialize();
        mainLogger.info('Agent initialized successfully');

        await this.tui.start();
        mainLogger.info('TUI started successfully');

        await this.webui.start();
        mainLogger.info('WebUI started successfully');

        console.log('SENARS system started successfully!');
        console.log('TUI is available in the terminal.');
        console.log(`WebUI is available at http://${this.webui.host}:${this.webui.port}`);
    }

    async stop() {
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

    static async run() {
        const main = new SENARSMain();

        process.on('uncaughtException', (err) => handleUncaughtError(err, mainLogger, () => main.stop()));
        process.on('unhandledRejection', (reason) => handleUncaughtError(reason, mainLogger, () => main.stop()));

        for (const signal of ['SIGINT', 'SIGTERM']) {
            process.on(signal, () => gracefulShutdown(signal, mainLogger, () => main.stop()));
        }

        try {
            await main.start();
        } catch (error) {
            mainLogger.error('Failed to start SENARS system:', error);
            await main.stop();
            process.exit(1);
        }
    }
}

if (import.meta.url.startsWith('file:') && process.argv[1] === import.meta.url.slice(7)) {
    SENARSMain.run();
}

export default SENARSMain;