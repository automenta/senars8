import { TuiView } from './TuiView.js';
import { TuiController } from './TuiController.js';
import { TuiRenderer } from './TuiRenderer.js';
import ApiService from '@common/services/ApiService.js';
import { CONFIG } from '@common/constants/config.js';
import logger from '@common/services/Logger.js';

class Application {
    constructor() {
        this.apiService = null;
        this.tuiView = null;
        this.tuiController = null;
        this.tuiRenderer = null;
        this.isRunning = false;

        this.initialize();
    }

    async initialize() {
        this.logger = logger.createNamespace('TUIApplication');
        this.logger.info('Initializing TUI Application...');

        // Use the common ApiService for all agent communication
        this.apiService = new ApiService();

        // Initialize TUI components, passing the API service and centralized config
        this.tuiRenderer = new TuiRenderer();
        this.tuiView = new TuiView(this.apiService, this.tuiRenderer, CONFIG.TUI);
        this.tuiController = new TuiController(this.apiService, this.tuiView, CONFIG.TUI);

        this.logger.info('TUI Application initialized');
    }

    async start() {
        if (this.isRunning) {
            this.logger.info('TUI Application is already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('Starting TUI Application...');

        // The ApiService handles its own connection lifecycle.
        this.apiService.connect();

        // Start the TUI view and controller.
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

        // Disconnect from the agent via the API service
        this.apiService?.disconnect();

        this.isRunning = false;
        this.logger.info('TUI Application stopped');
    }

    async addTask(task) {
        // Send tasks to the agent via the API service
        this.apiService.sendNarsese(task);
        this.logger.debug('Adding task:', task);
    }
}

export default Application;