import {Agent} from './index.js';
import {warn} from '../core/utils/logger.js';
import {formatTaskForBroadcast} from './utils/taskUtils.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import FileMonitor from './FileMonitor.js';
import {managerHandler} from './utils/errorHandler.js';

class AgentManager {
    constructor() {
        this.agent = new Agent();
        this.broadcast = () => {
        };
        this.system = null;
        this.fileMonitor = null;
    }

    setBroadcast(broadcast) {
        this.broadcast = broadcast;
    }

    async initialize() {
        return managerHandler.execute(async () => {
            await this.agent.initialize();
            this.system = this.agent.system;

            this.fileMonitor = new FileMonitor(this.system, this.agent.config.fileMonitoring);
            this.fileMonitor.initialize();

            this.broadcast({type: 'agentStatus', payload: 'initialized'});

            this.setupEventListeners();
            await this.fileMonitor.start();
            return true;
        }, 'initialize', false);
    }

    setupEventListeners() {
        managerHandler.runSync(() => {
            if (!this.system?.eventBus) {
                warn('Agent event bus not available. UI will not receive real-time updates.');
                return;
            }

            this.cleanupEventListeners();

            // Event listener configuration map - DRY approach
            this._eventConfig = {
                status_update: status => ({type: 'status_update', payload: status}),
                system_cycle: cycleCount => ({type: 'system_cycle', payload: {cycleCount}}),
                add_belief: belief => ({type: 'add_belief', payload: formatTaskForBroadcast(belief)}),
                add_goal: goal => ({type: 'add_goal', payload: formatTaskForBroadcast(goal)}),
                add_question: question => ({type: 'add_question', payload: formatTaskForBroadcast(question)}),
                reasoning_step: step => ({type: 'reasoning_step', payload: step}),
                memory_update: changes => ({type: 'memory_update', payload: changes}),
                'tasks:add': tasks => tasks.map(task => ({type: 'task_added', payload: formatTaskForBroadcast(task)}))
            };

            // Create and register listeners efficiently
            for (const [event, formatter] of Object.entries(this._eventConfig)) {
                const listenerName = this._getListenerName(event);
                this[listenerName] = this._createListener(formatter);
                this.system.eventBus.on(event, this[listenerName]);
            }
        }, 'setupEventListeners');
    }

    // Helper to generate consistent listener names
    _getListenerName(event) {
        return `_${event.replace(':', '_')}Listener`;
    }

    // Helper to create listeners with consistent behavior
    _createListener(formatter) {
        return (...args) => {
            const messages = Array.isArray(formatter(...args)) ? formatter(...args) : [formatter(...args)];
            for (const msg of messages) {
                this.broadcast(msg);
            }
        };
    }

    cleanupEventListeners() {
        if (!this.system?.eventBus || !this._eventConfig) return;

        // Use the same configuration for cleanup - consistent DRY approach
        for (const event of Object.keys(this._eventConfig)) {
            const listenerName = this._getListenerName(event);
            if (this[listenerName]) {
                this.system.eventBus.off(event, this[listenerName]);
                this[listenerName] = null;
            }
        }
    }

    getAgent() {
        return this.agent;
    }

    isAgentInitialized() {
        return this.agent?.isInitialized || false;
    }

    async start(maxCycles) {
        return managerHandler.execute(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: start'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_START_CYCLING, {maxCycles});
            }
        }, 'start');
    }

    async stop() {
        await managerHandler.execute(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: stop'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_STOP_CYCLING);
            }
        }, 'stop');

        await this.fileMonitor?.stop();
        this.cleanupEventListeners();
    }

    async reset() {
        this.cleanupEventListeners();

        return managerHandler.execute(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: reset'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_RESET);
            }
        }, 'reset');
    }
}

export default AgentManager;