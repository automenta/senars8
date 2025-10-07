import AgentManager from '../../agent/AgentManager.js';
import {UnifiedWebSocketServer} from '../../agent/StandaloneWebSocketServer.js';
import {findAvailablePort} from '../../tests/utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {spawn} from 'child_process';
import {setTimeout} from 'timers/promises';

/**
 * Demo showing TUI integration with agent system
 */
class TuiDemo {
    constructor() {
        this.agentManager = null;
        this.wsManager = null;
        this.tuiProcess = null;
        this.wsPort = null;
    }

    /**
     * Run the TUI demo
     */
    async run() {
        console.log('Starting TUI Demo...');

        try {
            // Find an available port
            this.wsPort = await findAvailablePort(8090);
            console.log(`Using port: ${this.wsPort}`);

            // Start the agent WebSocket server
            await this.startAgentServer();

            // Start the TUI
            await this.startTui();

            // Send some demo commands to the system
            await this.runDemoCommands();

            // Allow user interaction for 30 seconds
            console.log('TUI running. Allowing interaction for 30 seconds...');
            await setTimeout(30000);

        } catch (error) {
            console.error('Error in TUI demo:', error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Start the agent WebSocket server
     */
    async startAgentServer() {
        console.log('Starting agent server...');
        this.agentManager = new AgentManager();
        this.wsManager = new UnifiedWebSocketServer({port: this.wsPort});

        await this.wsManager.start();

        // Link server to agent manager
        this.agentManager.setBroadcast(this.wsManager.broadcast.bind(this.wsManager));

        // Create and set message handler
        const messageHandler = createMessageHandler(this.agentManager, this.wsManager.broadcast.bind(this.wsManager));
        this.wsManager.setMessageHandler(messageHandler);

        // Initialize agent manager
        await this.agentManager.initialize();
        console.log('Agent server started successfully');
    }

    /**
     * Start the TUI process
     */
    async startTui() {
        console.log('Starting TUI...');
        this.tuiProcess = spawn('npx', ['tsx', 'tui/src/index.jsx'], {
            env: {...process.env, WS_PORT: this.wsPort.toString()},
            stdio: 'inherit'  // This makes the TUI visible to the user
        });

        this.tuiProcess.on('error', (err) => {
            console.error('TUI process error:', err);
        });

        this.tuiProcess.on('close', (code) => {
            console.log(`TUI process exited with code ${code}`);
        });

        // Wait a bit for TUI to connect
        await setTimeout(2000);
        console.log('TUI started successfully');
    }

    /**
     * Send demo commands to show system behavior
     */
    async runDemoCommands() {
        console.log('Running demo commands...');

        // In a real scenario, we would send commands through the WebSocket
        // For now, we'll just log what would happen
        console.log('Demo: Adding sample tasks and observing the system...');

        // Simulate some agent activity to show in the TUI
        await setTimeout(() => {
            console.log('Simulated: Agent processed a task');
        }, 5000);

        await setTimeout(() => {
            console.log('Simulated: New belief formed');
        }, 10000);

        await setTimeout(() => {
            console.log('Simulated: Inference completed');
        }, 15000);
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        console.log('Cleaning up...');

        if (this.tuiProcess) {
            this.tuiProcess.kill();
        }

        if (this.wsManager) {
            await this.wsManager.stop();
        }

        if (this.agentManager) {
            await this.agentManager.stop();
        }

        console.log('Cleanup completed');
    }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const demo = new TuiDemo();
    demo.run().catch(console.error);
}

export default TuiDemo;