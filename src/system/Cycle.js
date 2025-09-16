import {safeAsync, safeSync} from '../utils/error-handler.js';
import {getGoalTasks} from '../utils/task-utils.js';
import EventBus from './EventBus.js';

class Cycle {
    constructor(config, {
        memory,
        reasoner,
        lm,
        actionExecutor,
        perception,
        planner,
        metaCognition,
        temporalReasoner,
        priorityManager
    }) {
        this._validateDependencies({
            memory,
            reasoner,
            lm,
            actionExecutor,
            perception,
            planner,
            metaCognition,
            temporalReasoner,
            priorityManager
        });
        this.config = config;
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.actionExecutor = actionExecutor;
        this.perception = perception;
        this.planner = planner;
        this.metaCognition = metaCognition;
        this.temporalReasoner = temporalReasoner;
        this.priorityManager = priorityManager;

        this.lm.setReasoner(this.reasoner);
        this.lm.setMemory(this.memory);

        this._initializeState();
    }

    _validateDependencies(components) {
        for (const [name, component] of Object.entries(components)) {
            if (!component) {
                throw new Error(`Cycle requires a valid instance for '${name}'.`);
            }
        }
    }

    _initializeState() {
        this.driveEmbeddings = [];
        this.taskDerivations = new Map();
    }

    async bootstrap(constitutionTasks) {
        return await safeAsync(async () => {
            if (!constitutionTasks) return;
            const driveTerms = constitutionTasks
                .filter(task => task.punctuation === '!')
                .map(task => this.memory.getTerm(task.termKey))
                .filter(Boolean);
            this.driveEmbeddings = driveTerms.map(term => term.embedding);
        }, 'Cycle.bootstrap');
    }

    async runOnce() {
        return await safeAsync(async () => {
            const context = {
                currentTime: Date.now(),
                driveEmbeddings: this.driveEmbeddings,
                allTasks: this.memory.getAllTasks(),
            };

            await this._runPerceptionPhase(context);
            this._runPrioritizationPhase(context);
            const {contradictions, metaTasks} = await this._runMetaCognitionPhase(context);
            const derivedTasks = await this._runReasoningPhase(context, contradictions);

            this._storeDerivedTasks(derivedTasks);

            const {proactiveTasks} = await this._runEnrichmentPhase(context, derivedTasks, metaTasks);
            const executionResults = await this._runActionPhase(context);

            EventBus.emit('SystemCycleEnded');

            return {
                derivedTasks: derivedTasks.length,
                contradictions: contradictions.length,
                metaTasks: metaTasks.length,
                proactiveTasks: proactiveTasks.length,
                executionResults: executionResults
            };
        }, 'Cycle.runOnce');
    }

    // --- Phase Implementations ---

    async _runPerceptionPhase(context) {
        // The perception instance handles its own state and events
        return Promise.resolve();
    }

    _runPrioritizationPhase(context) {
        const {currentTime, driveEmbeddings} = context;
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.priorityManager.calculatePriority(task, currentTime, driveEmbeddings);
        });
    }

    async _runMetaCognitionPhase(context) {
        const contradictions = (await EventBus.request('MetaCognition.findContradictions', context.allTasks)) || [];
        if (contradictions.length === 0) {
            return {contradictions: [], metaTasks: []};
        }

        const resolutionPromises = contradictions.map(c => EventBus.request('MetaCognition.resolve', {
            contradiction: c,
            strategy: 'auto'
        }));
        const resolvedTasksArray = await Promise.all(resolutionPromises);
        const metaTasks = resolvedTasksArray.flat().filter(Boolean);

        if (metaTasks.length > 0) {
            metaTasks.forEach(metaTask => metaTask.state.priority = this.config.META_TASK_PRIORITY);
            this.memory.addTasks(metaTasks);
        }
        return {contradictions, metaTasks};
    }

    async _runReasoningPhase(context, contradictions) {
        const focusSet = this._getFocusSet();
        if (focusSet.length === 0) {
            return [];
        }

        const goals = this._getPrioritizedGoals();
        const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
            this.reasoner.performInference(focusSet),
            this.temporalReasoner.infer(focusSet),
            this._generateLmHypotheses(focusSet, goals, contradictions)
        ]);
        return [...symbolicTasks, ...temporalTasks, ...lmTasks].filter(Boolean);
    }

    async _runEnrichmentPhase(context, derivedTasks, metaTasks) {
        const newTermKeys = this._getNewTermKeys([...derivedTasks, ...metaTasks]);
        await this._bootstrapTerms(newTermKeys);

        const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
        this.memory.addTasks(proactiveTasks);
        return {proactiveTasks};
    }

    async _runActionPhase(context) {
        const actionableGoals = this._getActionableGoals();
        const executionPromises = actionableGoals.map(goal => this._executeGoalPlan(goal));
        return Promise.all(executionPromises);
    }

    // --- Helper Methods ---

    _getFocusSet() {
        const focusSet = this.memory.getHighestPriorityTasks(this.config.FOCUS_SET_SIZE);
        focusSet.forEach(task => task.touch());
        return focusSet;
    }

    async _generateLmHypotheses(focusSet, goals, contradictions) {
        const lmHypothesesPromises = this.config.LM_HYPOTHESIS_CONFIGS.map(hypothesisConfig =>
            this.lm.generateHypotheses(focusSet, {...hypothesisConfig, goals, contradictions})
        );
        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    _storeDerivedTasks(derivedTasks) {
        if (!derivedTasks || derivedTasks.length === 0) return;
        this.memory.addTasks(derivedTasks);
        // Derivation tracking can be added here if needed
    }

    _getNewTermKeys(tasks) {
        return [...new Set(tasks.map(task => task.termKey).filter(termKey => !this.memory.getTerm(termKey)))];
    }

    async _bootstrapTerms(termKeys) {
        const batchSize = this.config.system.BATCH_SIZE;
        for (let i = 0; i < termKeys.length; i += batchSize) {
            const batch = termKeys.slice(i, i + batchSize);
            const termPromises = batch.map(termKey => this.lm.bootstrapTerm(termKey));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
        }
    }

    _getPrioritizedGoals() {
        return getGoalTasks(this.memory.getAllTasks())
            .filter(task => task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .slice(0, this.config.MAX_GOALS_TO_EXECUTE);
    }

    _getActionableGoals() {
        return this._getPrioritizedGoals();
    }

    async _executeGoalPlan(goal, maxAttempts = 3) {
        let result = {success: false};
        let attempts = 0;
        let lastFailedPlan = null;

        while (attempts < maxAttempts && !result.success) {
            attempts++;
            const plan = await this.planner.createPlan(goal, lastFailedPlan);
            if (plan && plan.steps.length > 0) {
                result = await plan.execute().catch(err => ({
                    success: false,
                    task: goal.termKey,
                    error: err.message,
                    failedPlan: plan
                }));
                if (!result.success && result.failedPlan) {
                    lastFailedPlan = result.failedPlan;
                    delete result.failedPlan;
                }
            } else if (plan) {
                result = {success: true, planId: plan.id, results: ['Goal already achieved']};
            } else {
                result = {success: false, error: `No plan found for ${goal.termKey}`};
                break;
            }
        }
        return result;
    }
}

export default Cycle;
