import logger from '../../core/utils/logger.js';
import {throttle} from './utils/async.js';

const VIEW_UPDATE_EVENTS = [
    'state_update',
    'status',
    'task_update',
    'system_stats',
    'narsese',
    'message',
];

const THROTTLE_DELAY = 100; // milliseconds

class TuiController {
    constructor(apiService, view) {
        this.apiService = apiService;
        this.view = view;
        this.isRunning = false;
        this.eventListeners = new Map();
        this.logger = logger.create('TuiController');

        this.throttledRender = throttle(() => {
            if (this.view?.render) {
                this.view.render();
            }
        }, THROTTLE_DELAY);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.registerEventListeners();
        this.logger.debug('TUI Controller started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.unregisterEventListeners();
        this.logger.debug('TUI Controller stopped');
    }

    registerEventListeners() {
        VIEW_UPDATE_EVENTS.forEach(event => {
            const listener = () => this.onViewUpdate();
            this.eventListeners.set(event, listener);
            this.apiService.on(event, listener);
        });
        this.logger.debug('Event listeners registered for TUI updates');
    }

    unregisterEventListeners() {
        this.eventListeners.forEach((listener, event) => {
            this.apiService.off(event, listener);
        });
        this.eventListeners.clear();
        this.logger.debug('Event listeners unregistered');
    }

    onViewUpdate() {
        this.throttledRender();
    }
}

export {TuiController};