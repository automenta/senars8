import {debug, info} from '../utils/logger.js';
import {getGoalTasks} from '../utils/task-utils.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {configService} from '../config/index.js';
import {SystemCommands} from './SystemCommands.js';
import {SystemEvents} from './SystemEvents.js';

const errorHandler = createUnifiedErrorHandler('Cycle');

class Cycle {
    constructor(
        configManager,
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
        this.reasoner = reasoner;
        this.lm = lm;
        this.perception = perception;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.temporalReasoner = temporalReasoner;
        this.priorityManager = priorityManager;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.cycleCount = 0;
    }

    async bootstrap(_constitutionTasks) {
        info('Cycle: Bootstrap completed');
    }

    async runOnce() {
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        this.eventBus.emit(SystemEvents.CYCLE_START, this.cycleCount);

        await errorHandler.execute(async () => {
            const focusSet = await this._selectFocusSet();
            const {
                derivedTasks,
                actionableGoals
            } = await this._performInference(focusSet);

            await this._executeActions(actionableGoals);
            await this._learnFromExperience(derivedTasks);

            await this._updateMemory(derivedTasks);
            this.eventBus.emit(SystemEvents.CYCLE_COMPLETE, this.cycleCount);
        }, 'runOnce');
    }

    async run() {
        await this.runOnce();
    }

    async _selectFocusSet() {
        const allTasks = await this.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);
        if (!allTasks) return [];

        allTasks.forEach(task => this.priorityManager?.updatePriority?.(task));

        const focusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
        return allTasks.sort((a, b) => (b.state?.priority || 0) - (a.state?.priority || 0))
            .slice(0, focusSetSize);
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
        const allTasks = [...focusSet, ...derivedTasks];
        const priorityThreshold = this.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1);
        const actionableGoals = getGoalTasks(allTasks).filter(goal =>
            goal.state?.priority >= priorityThreshold
        );
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
