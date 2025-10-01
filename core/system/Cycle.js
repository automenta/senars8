import {
    debug,
    info
} from '../utils/logger.js';
import {
    createUnifiedErrorHandler
} from '../utils/errorHandler.js';
import {
    wrapAsync
} from '../utils/asyncWrapper.js';
import {
    configService
} from '../config/index.js';
import {
    SystemCommands
} from './SystemCommands.js';
import {
    SystemEvents
} from './SystemEvents.js';

const errorHandler = createUnifiedErrorHandler('Cycle');

class Cycle {
    constructor(
        configManager,
        memory,
        reasoner,
        lm,
        perception,
        planner,
        metaCognition,
        temporalReasoner,
        priorityManager,
        eventBus,
        commandBus
    ) {
        this.config = configService;
        this.memory = memory; // Kept for now for direct access if needed, but prefer commands/events
        this.reasoner = reasoner; // Kept for now
        this.lm = lm;
        this.perception = perception;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.temporalReasoner = temporalReasoner;
        this.priorityManager = priorityManager;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.cycleCount = 0;

        this.runOnce = wrapAsync(this._runOnce.bind(this), 'Cycle', 'runOnce');
    }

    async bootstrap(_constitutionTasks) {
        info('Cycle: Bootstrap completed');
    }

    async _runOnce() {
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        this.eventBus.emit(SystemEvents.CYCLE_START, this.cycleCount);

        const focusSet = await this._selectFocusSet();
        const {
            derivedTasks,
            actionableGoals
        } = await this._performInference(focusSet);

        await this._executeActions(actionableGoals);
        await this._learnFromExperience(derivedTasks);

        await this._updateMemory(derivedTasks);
        this.eventBus.emit(SystemEvents.CYCLE_COMPLETE, this.cycleCount);
    }

    async run() {
        await this.runOnce();
    }

    async _selectFocusSet() {
        const focusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
        const focusSet = await this.commandBus.request(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, focusSetSize);
        if (!focusSet) return [];

        // Only update priorities if priorityManager exists
        if (this.priorityManager && this.priorityManager.updatePriority) {
            for (const task of focusSet) {
                this.priorityManager.updatePriority(task);
            }
        }

        return focusSet;
    }

    async _performInference(focusSet) {
        if (!this.reasoner || !focusSet || focusSet.length === 0) {
            return {
                derivedTasks: [],
                actionableGoals: []
            };
        }

        const derivedTasks = await this.commandBus.request(SystemCommands.REASONER_PROCESS_TASK, {
            focusSet
        });
        
        // Filter actionable goals from both focusSet and derivedTasks in a single pass
        const priorityThreshold = this.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1);
        const actionableGoals = [];
        
        // Combine both arrays and filter in one pass for better performance
        const allTasks = focusSet.concat(derivedTasks);
        for (const task of allTasks) {
            if (task.punctuation === '!' && task.state?.priority >= priorityThreshold) {
                actionableGoals.push(task);
            }
        }
        
        return {
            derivedTasks,
            actionableGoals
        };
    }

    async _executeActions(actionableGoals) {
        if (!actionableGoals || !actionableGoals.length) {
            return;
        }
        for (const goal of actionableGoals) {
            try {
                debug(`Requesting execution for goal: ${goal.termKey}`);
                await this.commandBus.request(SystemCommands.EXECUTE_ACTION, goal);
            } catch (error) {
                errorHandler.handle(error, `_executeActions for goal ${goal.termKey}`);
            }
        }
    }

    async _learnFromExperience(derivedTasks) {
        if (!this.lm || !derivedTasks || !derivedTasks.length) {
            return;
        }
        derivedTasks.forEach(task => {
            debug(`Would learn from task: ${task.termKey}`);
        });
    }

    async _updateMemory(derivedTasks) {
        if (!derivedTasks || !derivedTasks.length) {
            return;
        }
        await this.eventBus.emitAsync(SystemEvents.TASKS_ADD, derivedTasks);
    }
}

export default Cycle;
