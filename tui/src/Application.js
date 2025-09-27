import {TuiView} from './TuiView.js';
import {TuiController} from './TuiController.js';
import {TuiRenderer} from './TuiRenderer.js';
import {Agent} from '../../agent/index.js';
import TUIConfig from './config/TUIConfig.js';
import logger from '../../common/services/Logger.js';

class Application {
    constructor(options = {}) {
        this.config = new TUIConfig(options);
        this.agent = null;
        this.tuiView = null;
        this.tuiController = null;
        this.tuiRenderer = null;
        this.isRunning = false;

        this.initialize();
    }

    async initialize() {
        this.logger = logger.createNamespace('TUIApplication');
        this.logger.info('Initializing TUI Application...');
        
        // Create the agent
        const agentConfig = this.config.get('agent') || {};
        this.agent = new Agent(agentConfig);
        await this.agent.initialize();

        // Initialize TUI components with configuration
        this.tuiRenderer = new TuiRenderer();
        this.tuiView = new TuiView(this.agent, this.tuiRenderer, this.config);
        this.tuiController = new TuiController(this.agent, this.tuiView, this.config);

        this.logger.info('TUI Application initialized');
    }

    async start() {
        if (this.isRunning) {
            this.logger.info('TUI Application is already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('Starting TUI Application...');

        // Start the agent
        this.agent.start();

        // Start the TUI interface
        this.tuiView.start();
        this.tuiController.start();

        this.logger.info('TUI Application started successfully');
    }

    stop() {
        if (!this.isRunning) {
            this.logger.info('TUI Application is not running');
            return;
        }

        // Stop TUI components
        this.tuiController?.stop();
        this.tuiView?.stop();

        // Stop the agent
        this.agent?.stop();

        this.isRunning = false;
        this.logger.info('TUI Application stopped');
    }

    async addTask(task) {
        // For now, just pass the task to the agent
        // In a real implementation we would create a proper task and add it
        this.logger.debug('Adding task:', task);
    }
}

export default Application;