import {debug} from '../../core/utils/logger.js';

class TuiController {
    constructor(agent, view, config = null) {
        this.agent = agent;
        this.view = view;
        this.config = config;
        this.isRunning = false;
        this.eventListeners = [];
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;

        // Register event listeners with the agent's system
        this.registerEventListeners();

        debug('TUI Controller started');
    }

    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;

        // Remove event listeners
        this.unregisterEventListeners();

        debug('TUI Controller stopped');
    }

    registerEventListeners() {
        // Listen to system events and update the view accordingly
        const system = this.agent?.system;
        if (system?.eventBus) {
            // Listen for system state changes
            system.eventBus.on('system.state.changed', () => {
                // Update view when system state changes
                this.onViewUpdate();
            });

            // Listen for task events
            system.eventBus.on('tasks.add', (tasks) => {
                debug(`Tasks added: ${tasks.length}`);
                this.onViewUpdate();
            });

            system.eventBus.on('tasks.update', (tasks) => {
                debug(`Tasks updated: ${tasks.length}`);
                this.onViewUpdate();
            });

            // Listen for memory events
            system.eventBus.on('memory.update', () => {
                debug('Memory updated');
                this.onViewUpdate();
            });
        }
    }

    unregisterEventListeners() {
        const system = this.agent?.system;
        if (system?.eventBus) {
            system.eventBus.removeAllListeners('system.state.changed');
            system.eventBus.removeAllListeners('tasks.add');
            system.eventBus.removeAllListeners('tasks.update');
            system.eventBus.removeAllListeners('memory.update');
        }
    }

    onViewUpdate() {
        // Throttle view updates to avoid excessive rendering
        if (this.view && typeof this.view.render === 'function') {
            // For now, we'll just log that an update was requested
            // The view handles its own rendering at a controlled interval
        }
    }
}

export {TuiController};