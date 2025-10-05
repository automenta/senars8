#!/usr/bin/env node

import { execa } from 'execa';
import { createServer } from 'vite';
import path from 'path';
import AgentManager from '../agent/AgentManager.js';
import { agentServerPlugin } from '../agent/vite-plugin.js';
import logger from '../core/utils/logger.js';

const log = logger.create('tui-integrated');

class TuiIntegratedRunner {
    constructor() {
        this.agentProcess = null;
        this.tuiProcess = null;
        this.agentManager = null;
        this.server = null;
        this.isShuttingDown = false;
    }

    async startAgent() {
        log.info('Starting agent with WebSocket support...');

        try {
            // Create agent manager
            this.agentManager = new AgentManager();

            // Start Vite server with WebSocket plugin
            const port = parseInt(process.env.WS_PORT, 10) || 8081;
            this.server = await createServer({
                configFile: path.resolve(process.cwd(), 'ui/vite.config.js'),
                root: path.resolve(process.cwd(), 'ui'),
                server: { port: port, clearScreen: false },
                plugins: [agentServerPlugin(this.agentManager)],
            });

            await this.server.listen();
            this.server.printUrls();

            // Initialize agent manager
            await this.agentManager.initialize();

            log.info('Agent with WebSocket support started successfully');
        } catch (error) {
            log.error('Failed to start agent:', error);
            throw error;
        }
    }

    async startTui() {
        log.info('Starting TUI...');

        try {
            // Start TUI process
            this.tuiProcess = execa('tsx', ['tui/src/index.jsx'], {
                stdio: 'inherit',
                env: { ...process.env, WS_PORT: process.env.WS_PORT || '8081' }
            });

            this.tuiProcess.on('exit', (code) => {
                log.info(`TUI process exited with code ${code}`);
                this.shutdown();
            });

            this.tuiProcess.on('error', (error) => {
                log.error('TUI process error:', error);
                this.shutdown();
            });

            log.info('TUI started successfully');
        } catch (error) {
            log.error('Failed to start TUI:', error);
            throw error;
        }
    }

    async run() {
        try {
            // Start agent first
            await this.startAgent();

            // Give agent a moment to fully initialize
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Start TUI
            await this.startTui();

            log.info('TUI Integrated mode started successfully');
            log.info('Press Ctrl+C to stop both agent and TUI');

        } catch (error) {
            log.error('Failed to start integrated mode:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        log.info('Shutting down integrated mode...');

        try {
            // Stop TUI process
            if (this.tuiProcess) {
                this.tuiProcess.kill('SIGTERM', { forceKillAfterTimeout: 5000 });
                this.tuiProcess = null;
            }

            // Stop agent manager
            if (this.agentManager) {
                await this.agentManager.stop();
                this.agentManager = null;
            }

            // Close Vite server
            if (this.server) {
                await this.server.close();
                this.server = null;
            }

            log.info('Shutdown complete');
        } catch (error) {
            log.error('Error during shutdown:', error);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    log.info('Received SIGINT, shutting down...');
    await runner.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log.info('Received SIGTERM, shutting down...');
    await runner.shutdown();
    process.exit(0);
});

// Main execution
const runner = new TuiIntegratedRunner();
runner.run().catch(error => {
    log.error('Unhandled error in TUI integrated mode:', error);
    process.exit(1);
});