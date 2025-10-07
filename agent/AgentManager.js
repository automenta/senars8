import {Agent} from './index.js';
import {warn} from '../core/utils/logger.js';
import {formatTaskForBroadcast} from './utils/taskUtils.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import FileMonitor from './FileMonitor.js';
import {managerHandler} from './utils/errorHandler.js';
import EventListenerManager from '../core/utils/EventListenerManager.js';

class AgentManager {
    constructor() {
        this.agent = new Agent();
        this.broadcast = () => {
        };
        this.system = null;
        this.fileMonitor = null;
        this.eventListenerManager = new EventListenerManager();
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

            // Initialize the event listener manager with configuration
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
            
            this.eventListenerManager.initialize(this.system, this.broadcast, eventConfig, { warn });
            this.eventListenerManager.setupEventListeners();

            await this.fileMonitor.start();
            return true;
        }, 'initialize', false);
    }

    setupEventListeners() {
        // Use the event listener manager for consistent behavior
        this.eventListenerManager.setupEventListeners();
    }

    cleanupEventListeners() {
        // Use the event listener manager for consistent behavior
        this.eventListenerManager.cleanupEventListeners();
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