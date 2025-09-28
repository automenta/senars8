import logger from '../../common/services/Logger.js';
import {MESSAGE_TYPES} from '../../common/constants/communication.js';

class TuiController {
    constructor(agentService, view, config = null, apiService = null) {
        this.agentService = agentService;
        this.view = view;
        this.config = config;
        this.apiService = apiService;
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

        // Connect to agent if not already connected
        if (!this.agentService.isConnected) {
            this.agentService.connect();
        }

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
        // Listen to system events from the agent service and update the view accordingly
        // Register various event listeners for real-time updates

        // Listen for agent state updates
        this.agentService.on(MESSAGE_TYPES.AGENT_STATE_UPDATE, () => {
            this.onViewUpdate();
        });

        // Listen for connection status changes
        this.agentService.on(MESSAGE_TYPES.STATUS, () => {
            this.onViewUpdate();
        });

        // Listen for new tasks being added
        this.agentService.on(MESSAGE_TYPES.TASK_UPDATE, () => {
            this.logger.debug('Task update received');
            this.onViewUpdate();
        });

        // Listen for system stats updates
        this.agentService.on(MESSAGE_TYPES.SYSTEM_STATS, () => {
            this.logger.debug('System stats update received');
            this.onViewUpdate();
        });

        // Listen for new beliefs
        this.agentService.on(MESSAGE_TYPES.NARSESE, (data) => {
            // Handle incoming belief/goal/question updates from the agent
            if (data?.type === 'add_belief' || data?.type === 'add_goal' || data?.type === 'add_question') {
                this.onViewUpdate();
            }
        });

        // Listen for general messages for updates
        this.agentService.on(MESSAGE_TYPES.MESSAGE, (message) => {
            if (message?.type.includes('task') || 
                message?.type.includes('belief') || 
                message?.type.includes('goal') || 
                message?.type.includes('question') ||
                message?.type.includes('system')) {
                this.onViewUpdate();
            }
        });
    }

    unregisterEventListeners() {
        // Remove all event listeners when stopping
        this.agentService.removeAllListeners();
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