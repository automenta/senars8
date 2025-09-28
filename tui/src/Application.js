import {TuiView} from './TuiView.js';
import {TuiController} from './TuiController.js';
import {TuiRenderer} from './TuiRenderer.js';
import AgentCommunicationService from '../../common/services/AgentCommunicationService.js';
import TUIConfig from './config/TUIConfig.js';
import logger from '../../common/services/Logger.js';
import TuiApiService from './services/TuiApiService.js';

class Application {
    constructor(options = {}) {
        this.config = new TUIConfig(options);
        this.agentService = null;
        this.tuiView = null;
        this.tuiController = null;
        this.tuiRenderer = null;
        this.isRunning = false;

        this.initialize();
    }

    async initialize() {
        this.logger = logger.createNamespace('TUIApplication');
        this.logger.info('Initializing TUI Application...');

        // Create the agent communication service
        const agentUrl = this.config.get('agent.websocketUrl') || 'ws://localhost:8080';
        this.agentService = new AgentCommunicationService(agentUrl);

        // Initialize TUI components with configuration
        this.tuiRenderer = new TuiRenderer();

        // Create the TUI API service for consistent interface
        this.tuiApiService = new TuiApiService(this.agentService);
        this.tuiApiService.initialize();

        // Pass the API service and agentService to view and controller instead of the agent instance
        this.tuiView = new TuiView(this.agentService, this.tuiRenderer, this.config);
        this.tuiController = new TuiController(this.agentService, this.tuiView, this.config, this.tuiApiService);

        this.logger.info('TUI Application initialized');
    }

    async start() {
        if (this.isRunning) {
            this.logger.info('TUI Application is already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('Starting TUI Application...');

        // Connect to the agent via WebSocket
        this.agentService.connect();

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

        // Disconnect from the agent
        this.agentService?.disconnect();

        this.isRunning = false;
        this.logger.info('TUI Application stopped');
    }

    async addTask(task) {
        // Send the task to the agent via WebSocket
        if (typeof task === 'string') {
            this.agentService.sendNarsese(task);
        } else {
            this.agentService.addTask(task);
        }
        this.logger.debug('Adding task:', task);
    }
}

export default Application;