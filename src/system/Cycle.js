import {
    getGoalTasks
} from '../utils/task-utils.js';
import {
    debug,
    error as logError
} from '../utils/logger.js';
import {
    createModuleErrorHandler
} from '../utils/errorHandler.js';
import EventBus from './EventBus.js';

const errorHandler = createModuleErrorHandler('Cycle');

class Cycle {
    constructor(system) {
        this.system = system;
        this.cycleCount = 0;
    }

    async run() {
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        EventBus.emit('SystemCycleStarted', this.cycleCount);

        await errorHandler.safeAsync(async () => {
            const focusSet = this._selectFocusSet();
            const {
                derivedTasks,
                actionableGoals
            } = await this._processFocusSet(focusSet);

            this.system.memory.addTasks(derivedTasks);
            await this.system.actionExecutor.execute(actionableGoals);

            debug(`Cycle ${this.cycleCount} finished`);
            EventBus.emit('SystemCycleEnded', this.cycleCount);
        }, `run cycle ${this.cycleCount}`);
    }

    _selectFocusSet() {
        const allTasks = this.system.memory.getAllTasks();
        allTasks.forEach(task => this.system.priorityManager.updatePriority(task));
        const focusSetSize = this.system.config.FOCUS_SET_SIZE;
        return allTasks.sort((a, b) => b.state.priority - a.state.priority).slice(0, focusSetSize);
    }

    async _processFocusSet(focusSet) {
        const derivedTasks = await this.system.reasoner.performInference(focusSet);
        const allTasks = [...focusSet, ...derivedTasks];
        const actionableGoals = getGoalTasks(allTasks).filter(goal =>
            goal.state.priority >= this.system.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD
        );
        return {
            derivedTasks,
            actionableGoals
        };
    }
}

export default Cycle;
