import {Agent} from './index.js';
import {info, warn} from '../core/utils/logger.js';
import {formatTaskForBroadcast} from './utils/taskUtils.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import FileMonitor from './FileMonitor.js';
import {managerHandler} from './utils/errorHandler.js';

class AgentManager {
    constructor() {
        this.agent = new Agent();
        this.broadcast = () => {};
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
            const eventBus = this.system.eventBus;
            if (!eventBus) {
                warn('Agent event bus not available. UI will not receive real-time updates.');
                return;
            }

            this.cleanupEventListeners();

            // Event listener configuration
            const eventConfig = {
                status_update: status => ({type: 'status_update', payload: status}),
                system_cycle: cycleCount => ({type: 'system_cycle', payload: {cycleCount}}),
                add_belief: belief => ({type: 'add_belief', payload: formatTaskForBroadcast(belief)}),
                add_goal: goal => ({type: 'add_goal', payload: formatTaskForBroadcast(goal)}),
                add_question: question => ({type: 'add_question', payload: formatTaskForBroadcast(question)}),
                reasoning_step: step => ({type: 'reasoning_step', payload: step}),
                memory_update: changes => ({type: 'memory_update', payload: changes}),
                'tasks:add': tasks => tasks.map(task => ({type: 'task_added', payload: formatTaskForBroadcast(task)}))
            };

            // Create and store listeners
            Object.entries(eventConfig).forEach(([event, formatter]) => {
                this[`_${event.replace(':', '_')}Listener`] = (...args) => {
                    const messages = Array.isArray(formatter(...args)) ? formatter(...args) : [formatter(...args)];
                    messages.forEach(msg => this.broadcast(msg));
                };
                eventBus.on(event, this[`_${event.replace(':', '_')}Listener`]);
            });
        }, 'setupEventListeners');
    }

    cleanupEventListeners() {
        const eventBus = this.system?.eventBus;
        if (!eventBus) return;

        // Event listener configuration for cleanup
        const eventConfig = [
            'status_update', 'system_cycle', 'add_belief', 'add_goal',
            'add_question', 'reasoning_step', 'memory_update', 'tasks:add'
        ];

        // Remove all previously registered listeners and clear references
        eventConfig.forEach(event => {
            const listenerName = `_${event.replace(':', '_')}Listener`;
            if (this[listenerName]) {
                eventBus.off(event, this[listenerName]);
                this[listenerName] = null;
            }
        });
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