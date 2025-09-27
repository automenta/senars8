import logger from '../../common/services/Logger.js';
import eventManager from '../../common/services/EventManager.js';

class TuiController {
    constructor(agent, view, config = null) {
        this.agent = agent;
        this.view = view;
        this.config = config;
        this.isRunning = false;
        this.eventListeners = [];
        this.updateThrottleTimeout = null;
        this.throttleDelay = 100; // milliseconds
        this.logger = logger.createNamespace('TuiController');
        this.eventManager = eventManager;
        
        // Initialize event manager with the agent's event bus
        if (this.agent?.system?.eventBus) {
            this.eventManager.initialize(this.agent.system.eventBus);
        }
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;

        // Register event listeners with the agent's system
        this.registerEventListeners();

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
        // Listen to system events and update the view accordingly
        const system = this.agent?.system;
        if (system?.eventBus) {
            this.eventManager.initialize(system.eventBus);
            
            // Listen for system state changes
            this.eventManager.subscribe('system.state.changed', () => {
                // Update view when system state changes
                this.onViewUpdate();
            });

            // Listen for task events
            this.eventManager.subscribe('tasks.add', (tasks) => {
                this.logger.debug(`Tasks added: ${tasks.length}`);
                this.onViewUpdate();
            });

            this.eventManager.subscribe('tasks.update', (tasks) => {
                this.logger.debug(`Tasks updated: ${tasks.length}`);
                this.onViewUpdate();
            });

            // Listen for task removal events
            this.eventManager.subscribe('tasks.remove', (tasks) => {
                this.logger.debug(`Tasks removed: ${tasks.length}`);
                this.onViewUpdate();
            });

            // Listen for memory events
            this.eventManager.subscribe('memory.update', () => {
                this.logger.debug('Memory updated');
                this.onViewUpdate();
            });
            
            // Listen for cycle events
            this.eventManager.subscribe('system.cycle.completed', () => {
                this.onViewUpdate();
            });
        } else {
            this.logger.warn('TUI Controller: Agent system or eventBus not available');
        }
    }

    unregisterEventListeners() {
        // Use the event manager to unsubscribe from all events
        this.eventManager.unsubscribeAll();
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