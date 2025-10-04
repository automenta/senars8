/**
 * Web UI Demo Application
 * Demonstrates the Web UI capabilities with an agent connection
 */

import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {findAvailablePort} from '../../tests/utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {spawn} from 'child_process';
import {setTimeout} from 'timers/promises';

class WebUIDemo {
    constructor() {
        this.agentManager = null;
        this.wsManager = null;
        this.wsPort = null;
        this.demoInterval = null;
    }

    /**
     * Run the Web UI demo
     */
    async run() {
        console.log('Starting Web UI Demo...');
        
        try {
            // Find an available port
            this.wsPort = await findAvailablePort(8095);
            console.log(`Using WebSocket port: ${this.wsPort}`);
            
            // Start the agent WebSocket server
            await this.startAgentServer();
            
            // Provide instructions to the user
            console.log('\n===============================================');
            console.log('Web UI Demo Instructions:');
            console.log('- Run `cd ui && npm run dev` to start the UI');
            console.log('- Open browser to http://localhost:5173');
            console.log('- The UI will auto-connect to ws://localhost:' + this.wsPort);
            console.log('===============================================\n');
            
            // Simulate some agent activity to show in the UI
            this.demoInterval = setInterval(() => {
                this.simulateAgentActivity();
            }, 5000);
            
            console.log('Demo server running. Press Ctrl+C to stop.');
            
            // Keep the process alive
            await this.waitForInterrupt();
            
        } catch (error) {
            console.error('Error in Web UI demo:', error);
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
        this.wsManager = new WebSocketManager({port: this.wsPort});

        await this.wsManager.start();
        
        // Link server to agent manager
        this.agentManager.setBroadcast(this.wsManager.broadcast.bind(this.wsManager));

        // Create and set message handler
        const messageHandler = createMessageHandler(this.agentManager, this.wsManager.broadcast.bind(this.wsManager));
        this.wsManager.setMessageHandler(messageHandler);

        // Initialize agent manager
        await this.agentManager.initialize();
        console.log('Agent server started successfully on port', this.wsPort);
    }

    /**
     * Simulate agent activity to demonstrate functionality
     */
    async simulateAgentActivity() {
        console.log('Simulating agent activity...');
        
        // Simulate a few different types of agent events
        const activities = [
            { type: 'task_added', data: { termKey: '(bird --> animal)', priority: 0.9 } },
            { type: 'belief_added', data: { termKey: '(animal --> living)', confidence: 0.85 } },
            { type: 'inference_made', data: { statement: '(bird --> living)', confidence: 0.78 } },
            { type: 'cycle_completed', data: { cycle: Math.floor(Math.random() * 1000) + 1 } }
        ];
        
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        
        if (this.agentManager && this.wsManager) {
            // Broadcast the simulated activity
            this.wsManager.broadcast({
                type: randomActivity.type,
                payload: randomActivity.data,
                timestamp: new Date().toISOString()
            });
            
            console.log(`  - ${randomActivity.type}:`, randomActivity.data);
        }
    }

    /**
     * Wait for interrupt signal (Ctrl+C)
     */
    waitForInterrupt() {
        return new Promise((resolve) => {
            process.on('SIGINT', () => {
                console.log('\nReceived interrupt signal. Shutting down...');
                resolve();
            });
            
            process.on('SIGTERM', () => {
                console.log('\nReceived termination signal. Shutting down...');
                resolve();
            });
        });
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        console.log('Shutting down demo...');
        
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
        }
        
        if (this.wsManager) {
            await this.wsManager.stop();
        }
        
        if (this.agentManager) {
            await this.agentManager.stop();
        }
        
        console.log('Demo shutdown complete');
    }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const demo = new WebUIDemo();
    demo.run().catch(console.error);
}

export default WebUIDemo;