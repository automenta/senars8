import {getGoalTasks} from '../utils/task-utils.js';
import {debug, info} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import EventBus from './EventBus.js';

const errorHandler = createModuleErrorHandler('Cycle');

class Cycle {
    constructor(configManager, components) {
        this.configManager = configManager;
        this.system = components; // In tests, this is the object with all components
        this.cycleCount = 0;
    }

    async bootstrap(constitutionTasks) {
        // Bootstrap method - can be empty for now or add initialization logic if needed
        info('Cycle: Bootstrap completed');
    }

    async runOnce() {
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

            // Convert actionable goals to proper action objects
            const actions = actionableGoals.map(goal => ({
                name: 'achieve',
                parameters: [goal.termKey],
                goal: goal
            }));

            // Execute each action individually
            for (const action of actions) {
                await this.system.actionExecutor.execute(action);
            }

            debug(`Cycle ${this.cycleCount} finished`);
            EventBus.emit('SystemCycleEnded', this.cycleCount);
        }, `run cycle ${this.cycleCount}`);
    }

    async run() {
        await this.runOnce();
    }

    _selectFocusSet() {
        const allTasks = this.system.memory.getAllTasks();
        // Use the priorityManager if available and has updatePriority method, otherwise skip priority updates
        if (this.system.priorityManager && typeof this.system.priorityManager.updatePriority === 'function') {
            allTasks.forEach(task => this.system.priorityManager.updatePriority(task));
        }
        const focusSetSize = this.configManager.getNumber('FOCUS_SET_SIZE', 20);
        return allTasks.sort((a, b) => {
            const priorityA = a.state?.priority || 0;
            const priorityB = b.state?.priority || 0;
            return priorityB - priorityA;
        }).slice(0, focusSetSize);
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
            goal.state?.priority >= this.configManager.getNumber('ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.1)
        );
        return {
            derivedTasks,
            actionableGoals
        };
    }
}

export default Cycle;
