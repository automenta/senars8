import {debug, info} from '../utils/logger.js';
import {getGoalTasks} from '../utils/task-utils.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {configService} from '../config/index.js';

const errorHandler = createUnifiedErrorHandler('Cycle');

class Cycle {
    constructor(
        configManager,
        memory,
        reasoner,
        lm,
        actionExecutor,
        perception,
        planner,
        metaCognition,
        temporalReasoner,
        priorityManager,
        eventBus
    ) {
        this.config = configService;
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.perception = perception;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.temporalReasoner = temporalReasoner;
        this.priorityManager = priorityManager;
        this.eventBus = eventBus;
        this.cycleCount = 0;
    }

    async bootstrap(_constitutionTasks) {
        // Bootstrap method - can be empty for now or add initialization logic if needed
        info('Cycle: Bootstrap completed');
    }

    async runOnce() {
        this.cycleCount++;
        debug(`Starting cycle ${this.cycleCount}`);
        this.eventBus.emit('SystemCycleStarted', this.cycleCount);

        await errorHandler.execute(async () => {
            const focusSet = this._selectFocusSet();
            const {
                derivedTasks,
                actionableGoals
            } = await this._performInference(focusSet);

            await this._executeActions(actionableGoals);
            await this._learnFromExperience(derivedTasks);

            this._updateMemory(derivedTasks);
            this.eventBus.emit('SystemCycleEnded', this.cycleCount);
        }, 'runOnce');
    }

    async run() {
        await this.runOnce();
    }

    _selectFocusSet() {
        const allTasks = this.memory.getAllTasks();
        // Use the priorityManager if available and has updatePriority method, otherwise skip priority updates
        allTasks.forEach(task => this.priorityManager?.updatePriority?.(task));

        const focusSetSize = this.config.getNumber('FOCUS_SET_SIZE', 20);
        return allTasks.sort((a, b) => (b.state?.priority || 0) - (a.state?.priority || 0))
            .slice(0, focusSetSize);
    }

    async _performInference(focusSet) {
        // Return empty arrays if reasoner is not available
        if (!this.reasoner) {
            return {
                derivedTasks: [],
                actionableGoals: []
            };
        }

        const derivedTasks = await this.reasoner.performInference(focusSet);
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
        if (!this.actionExecutor || !actionableGoals.length) {
            return;
        }

        // For now, just log the actions that would be executed
        actionableGoals.forEach(goal => {
            debug(`Execute action for goal: ${goal.termKey}`);
        });
    }

    async _learnFromExperience(derivedTasks) {
        // Placeholder implementation - in a real system this would learn from experience
        if (!this.lm || !derivedTasks.length) {
            return;
        }

        // For now, just log the tasks that would be learned from
        derivedTasks.forEach(task => {
            debug(`Would learn from task: ${task.termKey}`);
        });
    }

    _updateMemory(derivedTasks) {
        if (!this.memory || !derivedTasks.length) {
            return;
        }
        this.eventBus.emit('tasks.add', derivedTasks);
    }
}

export default Cycle;
