#!/usr/bin/env node

/**
 * TUI Integration Demo
 *
 * This script demonstrates the complete end-to-end integration between
 * the agent and TUI, providing users with a seamless experience.
 *
 * Usage:
 *   npm run demo:tui
 *   # or
 *   node scripts/run-tui-integration-demo.js
 *
 * The script will:
 * 1. Start the agent with WebSocket support
 * 2. Start the TUI
 * 3. Ensure the TUI can discover and connect to the agent
 * 4. Provide a consistent user experience
 */

import {execa} from 'execa';
import {createServer} from 'vite';
import path from 'path';
import AgentManager from '../agent/AgentManager.js';
import {agentServerPlugin} from '../agent/vite-plugin.js';
import logger from '../core/utils/logger.js';

const log = logger.create('tui-integration-demo');

class TuiIntegrationDemo {
    constructor() {
        this.agentManager = null;
        this.server = null;
        this.tuiProcess = null;
        this.wsPort = parseInt(process.env.WS_PORT, 10) || 8081;
        this.isShuttingDown = false;
    }

    async startAgent() {
        log.info('🚀 Starting agent with WebSocket support...');

        try {
            // Create agent manager
            this.agentManager = new AgentManager();

            // Start Vite server with WebSocket plugin
            this.server = await createServer({
                configFile: path.resolve(process.cwd(), 'ui/vite.config.js'),
                root: path.resolve(process.cwd(), 'ui'),
                server: {port: this.wsPort, clearScreen: false},
                plugins: [agentServerPlugin(this.agentManager)],
            });

            await this.server.listen();
            this.server.printUrls();

            // Initialize agent manager
            await this.agentManager.initialize();

            log.info('✅ Agent started successfully');
            log.info(`📡 WebSocket server running on port ${this.wsPort}`);
        } catch (error) {
            log.error('❌ Failed to start agent:', error);
            throw error;
        }
    }

    async startTui() {
        log.info('🖥️  Starting TUI...');

        try {
            // Start TUI process
            this.tuiProcess = execa('tsx', ['tui/src/index.jsx'], {
                stdio: 'inherit',
                env: {...process.env, WS_PORT: this.wsPort.toString()}
            });

            this.tuiProcess.on('exit', (code) => {
                log.info(`TUI process exited with code ${code}`);
                this.shutdown();
            });

            this.tuiProcess.on('error', (error) => {
                log.error('TUI process error:', error);
                this.shutdown();
            });

            log.info('✅ TUI started successfully');
        } catch (error) {
            log.error('❌ Failed to start TUI:', error);
            throw error;
        }
    }

    async run() {
        try {
            console.log('🎯 TUI Integration Demo');
            console.log('======================');
            console.log('');
            console.log('This demo shows the complete integration between');
            console.log('the agent and TUI working together seamlessly.');
            console.log('');
            console.log('The demo will:');
            console.log('1. Start the agent with WebSocket support');
            console.log('2. Start the TUI');
            console.log('3. Enable automatic discovery and connection');
            console.log('4. Provide a consistent user experience');
            console.log('');
            console.log('Press Ctrl+C to stop the demo.');
            console.log('');

            // Start agent first
            await this.startAgent();

            // Give agent a moment to fully initialize
            log.info('⏳ Waiting for agent to initialize...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Start TUI
            await this.startTui();

            log.info('🎉 TUI Integration Demo started successfully!');
            log.info('');
            log.info('You should now see the TUI interface.');
            log.info('The TUI should automatically discover and connect to the agent.');
            log.info('You can interact with the agent through the TUI.');
            log.info('');
            log.info('Press Ctrl+C to stop both the agent and TUI.');

        } catch (error) {
            log.error('❌ Failed to start TUI Integration Demo:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        log.info('🛑 Shutting down TUI Integration Demo...');

        try {
            // Stop TUI process
            if (this.tuiProcess) {
                this.tuiProcess.kill('SIGTERM', {forceKillAfterTimeout: 5000});
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

            log.info('✅ Shutdown complete');
        } catch (error) {
            log.error('❌ Error during shutdown:', error);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    log.info('Received SIGINT, shutting down...');
    await demo.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log.info('Received SIGTERM, shutting down...');
    await demo.shutdown();
    process.exit(0);
});

// Main execution
const demo = new TuiIntegrationDemo();
demo.run().catch(error => {
    log.error('Unhandled error in TUI Integration Demo:', error);
    process.exit(1);
});