import { TuiView } from './TuiView.js';
import { TuiController } from './TuiController.js';
import { TuiRenderer } from './TuiRenderer.js';
import { Agent } from '../../agent/index.js';

class Application {
    constructor(options = {}) {
        this.config = options.config || {};
        this.agent = null;
        this.tuiView = null;
        this.tuiController = null;
        this.tuiRenderer = null;
        this.isRunning = false;
        
        this.initialize();
    }

    async initialize() {
        // Create the agent
        this.agent = new Agent(this.config.agentConfig);
        await this.agent.initialize();
        
        // Initialize TUI components
        this.tuiRenderer = new TuiRenderer();
        this.tuiView = new TuiView(this.agent, this.tuiRenderer);
        this.tuiController = new TuiController(this.agent, this.tuiView);
        
        console.log('TUI Application initialized');
    }

    async start() {
        if (this.isRunning) {
            console.log('TUI Application is already running');
            return;
        }
        
        this.isRunning = true;
        console.log('Starting TUI Application...');
        
        // Start the agent
        this.agent.start();
        
        // Start the TUI interface
        this.tuiView.start();
        this.tuiController.start();
        
        console.log('TUI Application started successfully');
    }

    stop() {
        if (!this.isRunning) {
            console.log('TUI Application is not running');
            return;
        }
        
        // Stop TUI components
        this.tuiController?.stop();
        this.tuiView?.stop();
        
        // Stop the agent
        this.agent?.stop();
        
        this.isRunning = false;
        console.log('TUI Application stopped');
    }

    async addTask(task) {
        // For now, just pass the task to the agent
        // In a real implementation we would create a proper task and add it
        console.log('Adding task:', task);
    }
}

export default Application;