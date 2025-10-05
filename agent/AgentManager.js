import {Agent} from './index.js';
import {error, info, warn} from '../core/utils/logger.js';
import {formatTaskForBroadcast} from './utils/taskUtils.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import FileMonitor from './FileMonitor.js';
import {createUnifiedErrorHandler} from '../core/utils/errorHandler.js';

class AgentManager {
    constructor() {
        this.agent = new Agent();
        this.broadcast = () => {
        }; // No-op broadcast function by default
        this.system = null;
        this.fileMonitor = null;
        this.errorHandler = createUnifiedErrorHandler('AgentManager');
    }

    setBroadcast(broadcast) {
        this.broadcast = broadcast;
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
        this.errorHandler.runSync(() => {
            const eventBus = this.system.eventBus;
            if (!eventBus) {
                warn('Agent event bus not available. UI will not receive real-time updates.');
                return;
            }

            // Clean up any existing listeners first to prevent memory leaks
            this.cleanupEventListeners();

            info('Attaching event listeners to EventBus');

            // Store the listener functions so we can remove them later
            this._statusUpdateListener = (status) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'status_update', payload: status});
                }, 'broadcast:status_update');
            };

            this._systemCycleListener = (cycleCount) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'system_cycle', payload: {cycleCount}});
                }, 'broadcast:system_cycle');
            };

            this._addBeliefListener = (belief) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'add_belief', payload: formatTaskForBroadcast(belief)});
                }, 'broadcast:add_belief');
            };

            this._addGoalListener = (goal) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'add_goal', payload: formatTaskForBroadcast(goal)});
                }, 'broadcast:add_goal');
            };

            this._addQuestionListener = (question) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'add_question', payload: formatTaskForBroadcast(question)});
                }, 'broadcast:add_question');
            };

            this._reasoningStepListener = (step) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'reasoning_step', payload: step});
                }, 'broadcast:reasoning_step');
            };

            this._memoryUpdateListener = (changes) => {
                this.errorHandler.runSync(() => {
                    this.broadcast({type: 'memory_update', payload: changes});
                }, 'broadcast:memory_update');
            };

            this._tasksAddListener = (tasks) => {
                this.errorHandler.runSync(() => {
                    for (const task of tasks) {
                        this.broadcast({type: 'task_added', payload: formatTaskForBroadcast(task)});
                    }
                }, 'broadcast:tasks:add');
            };

            // Register all the listeners
            eventBus.on('status_update', this._statusUpdateListener);
            eventBus.on('system_cycle', this._systemCycleListener);
            eventBus.on('add_belief', this._addBeliefListener);
            eventBus.on('add_goal', this._addGoalListener);
            eventBus.on('add_question', this._addQuestionListener);
            eventBus.on('reasoning_step', this._reasoningStepListener);
            eventBus.on('memory_update', this._memoryUpdateListener);
            eventBus.on('tasks:add', this._tasksAddListener);
        }, 'setupEventListeners');
    }

    cleanupEventListeners() {
        const eventBus = this.system?.eventBus;
        if (!eventBus) return;

        // Remove all previously registered listeners if they exist
        if (this._statusUpdateListener) eventBus.off('status_update', this._statusUpdateListener);
        if (this._systemCycleListener) eventBus.off('system_cycle', this._systemCycleListener);
        if (this._addBeliefListener) eventBus.off('add_belief', this._addBeliefListener);
        if (this._addGoalListener) eventBus.off('add_goal', this._addGoalListener);
        if (this._addQuestionListener) eventBus.off('add_question', this._addQuestionListener);
        if (this._reasoningStepListener) eventBus.off('reasoning_step', this._reasoningStepListener);
        if (this._memoryUpdateListener) eventBus.off('memory_update', this._memoryUpdateListener);
        if (this._tasksAddListener) eventBus.off('tasks:add', this._tasksAddListener);

        // Clear the references
        this._statusUpdateListener = null;
        this._systemCycleListener = null;
        this._addBeliefListener = null;
        this._addGoalListener = null;
        this._addQuestionListener = null;
        this._reasoningStepListener = null;
        this._memoryUpdateListener = null;
        this._tasksAddListener = null;
    }

    getAgent() {
        return this.agent;
    }

    isAgentInitialized() {
        return this.agent?.isInitialized || false;
    }

    async start(maxCycles) {
        return this.errorHandler.runAsync(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: start'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_START_CYCLING, {maxCycles});
            }
        }, 'start');
    }

    async stop() {
        await this.errorHandler.runAsync(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: stop'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_STOP_CYCLING);
            }
        }, 'stop');

        await this.fileMonitor?.stop();
        this.cleanupEventListeners();
    }

    async reset() {
        // Clean up existing listeners before reset
        this.cleanupEventListeners();

        return this.errorHandler.runAsync(async () => {
            if (this.system?.commandBus) {
                this.broadcast({type: 'log', payload: {source: 'system', message: 'Agent command received: reset'}});
                await this.system.commandBus.request(SystemCommands.SYSTEM_RESET);
            }
        }, 'reset');
    }
}

export default AgentManager;