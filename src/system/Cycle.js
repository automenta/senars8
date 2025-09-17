import {safeAsync} from '../utils/errorHandler.js';
import {getGoalTasks} from '../utils/task-utils.js';
import EventBus from './EventBus.js';

class Cycle {
    constructor(configManager, {
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
        this.configManager = configManager;
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

        this.phases = [{
            name: 'Perception',
            execute: this._runPerceptionPhase.bind(this)
        }, {
            name: 'Prioritization',
            execute: this._runPrioritizationPhase.bind(this)
        }, {
            name: 'MetaCognition',
            execute: this._runMetaCognitionPhase.bind(this)
        }, {
            name: 'Reasoning',
            execute: this._runReasoningPhase.bind(this)
        }, {
            name: 'Enrichment',
            execute: this._runEnrichmentPhase.bind(this)
        }, {
            name: 'Action',
            execute: this._runActionPhase.bind(this)
        },];
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
            this.driveEmbeddings = driveTerms.map(term => term.embedding).filter(Boolean);
        }, 'Cycle.bootstrap');
    }

    async runOnce() {
        return await safeAsync(async () => {
            const context = {
                currentTime: Date.now(),
                driveEmbeddings: this.driveEmbeddings,
                allTasks: this.memory.getAllTasks(),
                contradictions: [],
                metaTasks: [],
                derivedTasks: [],
                proactiveTasks: [],
                executionResults: [],
            };

            for (const phase of this.phases) {
                const result = await phase.execute(context);
                Object.assign(context, result);
            }

            this._storeDerivedTasks(context.derivedTasks);
            EventBus.emit('SystemCycleEnded');

            return {
                derivedTasks: context.derivedTasks.length,
                contradictions: context.contradictions.length,
                metaTasks: context.metaTasks.length,
                proactiveTasks: context.proactiveTasks.length,
                executionResults: context.executionResults
            };
        }, 'Cycle.runOnce');
    }

    async _runPerceptionPhase() {
        return Promise.resolve();
    }

    _runPrioritizationPhase(context) {
        const {
            currentTime,
            driveEmbeddings
        } = context;
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.priorityManager.calculatePriority(task, currentTime, driveEmbeddings);
        });
    }

    async _runMetaCognitionPhase(context) {
        const contradictions = (await EventBus.request('MetaCognition.findContradictions', context.allTasks)) || [];
        if (contradictions.length === 0) {
            return {
                contradictions: [],
                metaTasks: []
            };
        }

        const resolutionPromises = contradictions.map(c => EventBus.request('MetaCognition.resolve', {
            contradiction: c,
            strategy: 'auto'
        }));
        const resolvedTasksArray = await Promise.all(resolutionPromises);
        const metaTasks = resolvedTasksArray.flat().filter(Boolean);

        if (metaTasks.length > 0) {
            const metaTaskPriority = this.configManager.getNumber('cycle.META_TASK_PRIORITY', 0.99);
            metaTasks.forEach(metaTask => metaTask.state.priority = metaTaskPriority);
            this.memory.addTasks(metaTasks);
        }
        return {
            contradictions,
            metaTasks
        };
    }

    async _runReasoningPhase(context) {
        const focusSet = this._getFocusSet();
        if (focusSet.length === 0) {
            return {
                derivedTasks: []
            };
        }

        const goals = this._getPrioritizedGoals();
        const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
            this.reasoner.performInference(focusSet),
            this.temporalReasoner.infer(focusSet),
            this._generateLmHypotheses(focusSet, goals, context.contradictions)
        ]);
        const derivedTasks = [...symbolicTasks, ...temporalTasks, ...lmTasks].filter(Boolean);
        return {
            derivedTasks
        };
    }

    async _runEnrichmentPhase(context) {
        const newTermKeys = this._getNewTermKeys([...context.derivedTasks, ...context.metaTasks]);
        await this._bootstrapTerms(newTermKeys);

        const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
        this.memory.addTasks(proactiveTasks);
        return {
            proactiveTasks
        };
    }

    async _runActionPhase() {
        const actionableGoals = this._getActionableGoals();
        const executionResults = await Promise.all(actionableGoals.map(goal => this._executeGoalPlan(goal)));
        return {
            executionResults
        };
    }

    _getFocusSet() {
        const focusSetSize = this.configManager.getNumber('cycle.FOCUS_SET_SIZE', 20);
        const focusSet = this.memory.getHighestPriorityTasks(focusSetSize);
        focusSet.forEach(task => task.touch());
        return focusSet;
    }

    async _generateLmHypotheses(focusSet, goals, contradictions) {
        const lmHypothesisConfigs = this.configManager.getArray('cycle.LM_HYPOTHESIS_CONFIGS', []);
        const lmHypothesesPromises = lmHypothesisConfigs.map(hypothesisConfig =>
            this.lm.generateHypotheses(focusSet, {
                ...hypothesisConfig,
                goals,
                contradictions
            })
        );
        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    _storeDerivedTasks(derivedTasks) {
        if (!derivedTasks || derivedTasks.length === 0) return;
        this.memory.addTasks(derivedTasks);
    }

    _getNewTermKeys(tasks) {
        return [...new Set(tasks.map(task => task.termKey).filter(termKey => !this.memory.getTerm(termKey)))];
    }

    async _bootstrapTerms(termKeys) {
        const batchSize = this.configManager.getNumber('system.BATCH_SIZE', 10);
        for (let i = 0; i < termKeys.length; i += batchSize) {
            const batch = termKeys.slice(i, i + batchSize);
            const termPromises = batch.map(termKey => this.lm.bootstrapTerm(termKey));
            const newTerms = (await Promise.all(termPromises)).filter(Boolean);
            newTerms.forEach(term => this.memory.addTerm(term));
        }
    }

    _getPrioritizedGoals() {
        const priorityThreshold = this.configManager.getNumber('cycle.ACTIONABLE_GOAL_PRIORITY_THRESHOLD', 0.9);
        const maxGoals = this.configManager.getNumber('cycle.MAX_GOALS_TO_EXECUTE', 5);
        return getGoalTasks(this.memory.getAllTasks())
            .filter(task => task.state.priority > priorityThreshold)
            .slice(0, maxGoals);
    }

    _getActionableGoals() {
        return this._getPrioritizedGoals();
    }

    async _executeGoalPlan(goal, maxAttempts = 3) {
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const plan = await this.planner.createPlan(goal);
            if (!plan) {
                return {
                    success: false,
                    error: `No plan found for ${goal.termKey}`
                };
            }
            if (plan.steps.length === 0) {
                return {
                    success: true,
                    planId: plan.id,
                    results: ['Goal already achieved']
                };
            }
            try {
                return await plan.execute();
            } catch (err) {
                if (attempts === maxAttempts - 1) {
                    return {
                        success: false,
                        task: goal.termKey,
                        error: err.message
                    };
                }
            }
        }
    }
}

export default Cycle;
