import {Agent} from './index.js';
import {error, info, warn} from '../core/utils/logger.js';
import {formatTaskForBroadcast} from './utils/taskUtils.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import FileMonitor from './FileMonitor.js';
import {createUnifiedErrorHandler} from '../core/utils/errorHandler.js';

class AgentManager {
    constructor(broadcast) {
        this.agent = new Agent();
        this.broadcast = broadcast;
        this.system = null;
        this.fileMonitor = null;
        this.errorHandler = createUnifiedErrorHandler('AgentManager');
    }

    async initialize() {
        return this.errorHandler.runAsync(async () => {
            await this.agent.initialize();
            this.system = this.agent.system;

            this.fileMonitor = new FileMonitor(this.system, this.agent.config.fileMonitoring);
            this.fileMonitor.initialize();

            info('Agent initialized');
            this.broadcast({type: 'agentStatus', payload: 'initialized'});

            this.setupEventListeners();
            await this.fileMonitor.start();
            return true;
        }, 'initialize', {
            onError: (err) => {
                error('Agent initialization failed:', err);
                this.broadcast({type: 'agentStatus', payload: 'initialization_failed'});
                return false;
            }
        });
    }

    setupEventListeners() {
        const eventBus = this.system.eventBus;
        if (!eventBus) {
            warn('Agent event bus not available. UI will not receive real-time updates.');
            return;
        }

        info('Attaching event listeners to EventBus');
        const events = {
            'status_update': (status) => ({type: 'status_update', payload: status}),
            'system_cycle': (cycleCount) => ({type: 'system_cycle', payload: {cycleCount}}),
            'add_belief': (belief) => ({type: 'add_belief', payload: formatTaskForBroadcast(belief)}),
            'add_goal': (goal) => ({type: 'add_goal', payload: formatTaskForBroadcast(goal)}),
            'add_question': (question) => ({type: 'add_question', payload: formatTaskForBroadcast(question)}),
            'add_task': (task) => ({type: 'task_added', payload: formatTaskForBroadcast(task)}),
            'reasoning_step': (step) => ({type: 'reasoning_step', payload: step}),
            'memory_update': (changes) => ({type: 'memory_update', payload: changes}),
        };

        for (const [eventName, formatter] of Object.entries(events)) {
            eventBus.on(eventName, (data) => this.broadcast(formatter(data)));
        }
    }

    getAgent() {
        return this.agent;
    }

    async start(maxCycles) {
        if (this.system?.commandBus) {
            this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: start'}});
            await this.system.commandBus.request(SystemCommands.SYSTEM_START_CYCLING, {maxCycles});
        }
    }

    async stop() {
        if (this.system?.commandBus) {
            this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: stop'}});
            await this.system.commandBus.request(SystemCommands.SYSTEM_STOP_CYCLING);
        }
        await this.fileMonitor?.stop();
    }

    async reset() {
        if (this.system?.commandBus) {
            this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: reset'}});
            await this.system.commandBus.request(SystemCommands.SYSTEM_RESET);
        }
    }
}

export default AgentManager;