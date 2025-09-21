import {debug, info} from '../utils/logger.js';
import {getGoalTasks} from '../utils/task-utils.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import EventBus from './EventBus.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('Cycle');

class Cycle {
    constructor(configManager, components) {
        this.config = createConfigAccessor(configManager);
        this.system = components; // In tests, this is the object with all components
        this.cycleCount = 0;
    }

    async bootstrap(_constitutionTasks) {
        // Bootstrap method - can be empty for now or add initialization logic if needed
        info('Cycle: Bootstrap completed');
    }

    async runOnce() {
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        EventBus.emit('SystemCycleStarted', this.cycleCount);

        await errorHandler.execute(async () => {
            const focusSet = this._selectFocusSet();
            const {
                derivedTasks,
                actionableGoals
            } = await this._performInference(focusSet);

            await this._executeActions(actionableGoals);
            await this._learnFromExperience(derivedTasks);

            this._updateMemory(derivedTasks);
            EventBus.emit('SystemCycleEnded', this.cycleCount);
        }, 'runOnce');
    }

    async run() {
        await this.runOnce();
    }

    _selectFocusSet() {
        const allTasks = this.system.memory.getAllTasks();
        // Use the priorityManager if available and has updatePriority method, otherwise skip priority updates
        allTasks.forEach(task => this.system.priorityManager?.updatePriority?.(task));

        const focusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
        return allTasks.sort((a, b) => (b.state?.priority || 0) - (a.state?.priority || 0))
            .slice(0, focusSetSize);
    }

    async _performInference(focusSet) {
        // Return empty arrays if reasoner is not available
        if (!this.system.reasoner) {
            return {
                derivedTasks: [],
                actionableGoals: []
            };
        }

        const derivedTasks = await this.system.reasoner.performInference(focusSet);
        const allTasks = [...focusSet, ...derivedTasks];
        const actionableGoals = getGoalTasks(allTasks).filter(goal =>
            goal.state?.priority >= this.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1)
        );
        return {
            derivedTasks,
            actionableGoals
        };
    }

    async _executeActions(actionableGoals) {
        // Placeholder implementation - in a real system this would execute actions
        if (!this.system.actionExecutor || !actionableGoals.length) {
            return;
        }

        // For now, just log the actions that would be executed
        actionableGoals.forEach(goal => {
            debug(`Would execute action for goal: ${goal.termKey}`);
        });
    }

    async _learnFromExperience(derivedTasks) {
        // Placeholder implementation - in a real system this would learn from experience
        if (!this.system.lm || !derivedTasks.length) {
            return;
        }

        // For now, just log the tasks that would be learned from
        derivedTasks.forEach(task => {
            debug(`Would learn from task: ${task.termKey}`);
        });
    }

    _updateMemory(derivedTasks) {
        // Placeholder implementation - in a real system this would update memory
        if (!this.system.memory || !derivedTasks.length) {
            return;
        }

        // For now, just log the tasks that would be added to memory
        derivedTasks.forEach(task => {
            debug(`Would add task to memory: ${task.termKey}`);
        });
    }

    async _processFocusSet(focusSet) {
        // Return empty arrays if reasoner is not available
        if (!this.system.reasoner) {
            return {
                derivedTasks: [],
                actionableGoals: []
            };
        }

        const derivedTasks = await this.system.reasoner.performInference(focusSet);
        const allTasks = [...focusSet, ...derivedTasks];
        const actionableGoals = getGoalTasks(allTasks).filter(goal =>
            goal.state?.priority >= this.config.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1)
        );
        return {
            derivedTasks,
            actionableGoals
        };
    }
}

export default Cycle;
