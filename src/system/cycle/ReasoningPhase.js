const BasePhase = require('./BasePhase');

class ReasoningPhase extends BasePhase {
    constructor() {
        super('Reasoning');
    }

    async execute(cycle, context) {
        const { contradictions } = context;

        const focusSet = this._getFocusSet(cycle);
        if (focusSet.length === 0) {
            return [];
        }

        const goals = this._getPrioritizedGoals(cycle);
        const derivedTasks = await this._performReasoning(cycle, focusSet, goals, contradictions);
        this._storeDerivedTasks(cycle, derivedTasks, focusSet);

        return derivedTasks;
    }

    _getFocusSet(cycle) {
        const focusSet = cycle.memory.getHighestPriorityTasks(cycle.config.FOCUS_SET_SIZE);
        focusSet.forEach(task => task.touch());
        return focusSet;
    }

    _getPrioritizedGoals(cycle) {
        // Assuming getPrioritizedGoals is a function in cycleUtils that needs memory and config
        const { getPrioritizedGoals } = require('../cycleUtils');
        return getPrioritizedGoals(cycle.memory, cycle.config);
    }

    async _performReasoning(cycle, focusSet, goals, contradictions) {
        const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
            Promise.resolve(cycle.reasoner.performInference(focusSet)),
            Promise.resolve(cycle.temporalReasoner.infer(focusSet)),
            this._generateLmHypotheses(cycle, focusSet, goals, contradictions)
        ]);
        return [...symbolicTasks, ...temporalTasks, ...lmTasks];
    }

    async _generateLmHypotheses(cycle, focusSet, goals, contradictions) {
        const lmHypothesesPromises = cycle.config.LM_HYPOTHESIS_CONFIGS.map(hypothesisConfig =>
            cycle.lm.generateHypotheses(focusSet, { ...hypothesisConfig, goals, contradictions })
        );
        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return cycle.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    _storeDerivedTasks(cycle, derivedTasks, focusSet) {
        cycle.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            cycle.taskDerivations.set(derivedTask.id, [...focusSet]);
        });
    }
}

module.exports = ReasoningPhase;
