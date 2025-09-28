import logger from '../../common/services/Logger.js';
import {MESSAGE_TYPES} from '../../common/constants/communication.js';

class TuiController {
    constructor(apiService, view, config = null) {
        this.apiService = apiService;
        this.view = view;
        this.config = config;
        this.isRunning = false;
        this.eventListeners = [];
        this.updateThrottleTimeout = null;
        this.throttleDelay = 100; // milliseconds
        this.logger = logger.createNamespace('TuiController');

        // Register event listeners with the agent service
        this.registerEventListeners();
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;

        // The connection is now managed by the Application, so we just listen.

        this.logger.debug('TUI Controller started');
    }

    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;

        // Remove event listeners
        this.unregisterEventListeners();

        // Clear any pending throttled updates
        if (this.updateThrottleTimeout) {
            clearTimeout(this.updateThrottleTimeout);
            this.updateThrottleTimeout = null;
        }

        this.logger.debug('TUI Controller stopped');
    }

    registerEventListeners() {
        // Listen to system events from the api service and update the view accordingly
        // Register various event listeners for real-time updates

        const eventsToUpdate = [
            'state_update',
            'status',
            'task_update',
            'system_stats',
            'narsese',
            'message',
        ];

        for (const event of eventsToUpdate) {
            this.apiService.on(event, () => this.onViewUpdate());
        }

        this.logger.debug('Event listeners registered for TUI updates');
    }

    unregisterEventListeners() {
        // Remove all event listeners when stopping
        this.apiService.removeAllListeners();
    }

    onViewUpdate() {
        // Throttle view updates to avoid excessive rendering
        if (this.updateThrottleTimeout) {
            // Already scheduled, skip
            return;
        }

        // Schedule update
        this.updateThrottleTimeout = setTimeout(() => {
            this.updateThrottleTimeout = null;
            if (this.view && typeof this.view.render === 'function') {
                this.view.render();
            }
        }, this.throttleDelay);
    }
}

export {TuiController};