import {TuiView} from './TuiView.js';
import {TuiController} from './TuiController.js';
import {TuiRenderer} from './TuiRenderer.js';
import ApiService from '@senars/common/services/ApiService.js';
import {CONFIG} from '@senars/common/constants/config.js';
import logger from '@senars/core/utils/logger.js';

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
        this.logger = logger.create('TUIApplication');
        this.logger.info('Initializing TUI Application...');

        // Use the common ApiService for all agent communication
        this.apiService = new ApiService();

        // Initialize TUI components
        this.tuiRenderer = new TuiRenderer();
        this.tuiView = new TuiView(this.apiService, this.tuiRenderer);
        this.tuiController = new TuiController(this.apiService, this.tuiView);

        this.apiService.on('error', (err) => {
            this.logger.error('ApiService Error:', err);
            this.tuiView.displayError('Connection to agent failed. Please ensure the agent is running and restart the TUI.');
        });

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
        // Send tasks to the agent via the API service with error handling
        try {
            await this.apiService.sendNarsese(task);
        } catch (error) {
            this.logger.error('Failed to add task:', task, error.message);
        }
        this.logger.debug('Adding task:', task);
    }
}

export default Application;