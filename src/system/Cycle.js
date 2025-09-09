const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Planner = require('./Planner');
const CONSTITUTION_TASKS = require('./Constitution');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');
const PriorityManager = require('../reasoner/PriorityManager');
const EventBus = require('./EventBus');
const Task = require('../core/Task');
const {
    getNewTermKeys,
    bootstrapTerms,
    getPrioritizedGoals,
    getActionableGoals,
    attemptPlanExecution,
    executeGoalPlan
} = require('./cycleUtils');

class Cycle {
    constructor(memory, reasoner, lm, actionExecutor, config) {
        this._validateDependencies(memory, reasoner, lm, config);
        this._initializeComponents(memory, reasoner, lm, actionExecutor, config);
        this._initializeState();
    }

    _validateDependencies(memory, reasoner, lm, config) {
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        if (!config) {
            throw new Error('Cycle requires a config object.');
        }
    }

    _initializeComponents(memory, reasoner, lm, actionExecutor, config) {
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.config = config;

        this.lm.setReasoner(this.reasoner);
        this.lm.setMemory(this.memory);

        this.perception = new Perception(memory, lm);
        this.planner = new Planner(this.memory, this.lm, actionExecutor, this.config.planner);
        this.metaCognition = new MetaCognition();
        this.temporalReasoner = new TemporalReasoner();
        this.priorityManager = new PriorityManager(memory);
    }

    _initializeState() {
        this.driveEmbeddings = [];
        this.taskDerivations = new Map();
    }

    async bootstrap() {
        const driveTerms = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey))
            .filter(Boolean);
        this.driveEmbeddings = driveTerms.map(term => term.embedding);
    }

    async _perceive() {
        await this.perception.processEvents();
    }

    _prioritize(currentTime) {
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.priorityManager.calculatePriority(task, currentTime, this.driveEmbeddings);
        });
    }

    async _generateLmHypotheses(focusSet, goals, contradictions) {
        const lmHypothesesPromises = this.config.LM_HYPOTHESIS_CONFIGS.map(hypothesisConfig =>
            this.lm.generateHypotheses(focusSet, {...hypothesisConfig, goals, contradictions})
        );
        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    _getFocusSet() {
        const focusSet = this.memory.getHighestPriorityTasks(this.config.FOCUS_SET_SIZE);
        focusSet.forEach(task => task.touch());
        return focusSet;
    }

    _getPrioritizedGoals() {
        return getPrioritizedGoals(this.memory, this.config);
    }

    async _performReasoning(focusSet, goals, contradictions) {
        const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
            Promise.resolve(this.reasoner.performInference(focusSet)),
            Promise.resolve(this.temporalReasoner.infer(focusSet)),
            this._generateLmHypotheses(focusSet, goals, contradictions)
        ]);
        return [...symbolicTasks, ...temporalTasks, ...lmTasks];
    }

    _storeDerivedTasks(derivedTasks, focusSet) {
        this.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        });
    }

    async _reason(contradictions) {
        const focusSet = this._getFocusSet();
        if (focusSet.length === 0) return [];

        const goals = this._getPrioritizedGoals();
        const derivedTasks = await this._performReasoning(focusSet, goals, contradictions);
        this._storeDerivedTasks(derivedTasks, focusSet);

        return derivedTasks;
    }

    _resolveContradictions(contradictions) {
        const metaTasks = contradictions.flatMap(contradiction =>
            this.metaCognition.resolve(contradiction, 'auto')
        );

        if (metaTasks.length > 0) {
            metaTasks.forEach(metaTask => metaTask.state.priority = this.config.META_TASK_PRIORITY);
            this.memory.addTasks(metaTasks);
        }
        return metaTasks;
    }

    _metaCognition(tasks) {
        const contradictions = this.metaCognition.findContradictions(tasks);
        if (contradictions.length === 0) {
            return {contradictions, metaTasks: []};
        }
        const metaTasks = this._resolveContradictions(contradictions);
        return {contradictions, metaTasks};
    }

    _getNewTermKeys(tasks) {
        return getNewTermKeys(tasks, this.memory);
    }

    async _bootstrapTerms(termKeys) {
        await bootstrapTerms(termKeys, this.lm, this.memory, this.config);
    }

    async _enrich(tasks) {
        const newTermKeys = this._getNewTermKeys(tasks);
        await this._bootstrapTerms(newTermKeys);
    }

    _getActionableGoals() {
        return getActionableGoals(this.memory, this.config);
    }

    async _attemptPlanExecution(plan, goal) {
        return attemptPlanExecution(plan, goal);
    }

    async _executeGoalPlan(goal, maxAttempts = 3) {
        return executeGoalPlan(this.planner, goal, maxAttempts);
    }

    async _act() {
        const actionableGoals = this._getActionableGoals();
        const executionPromises = actionableGoals.map(goal => this._executeGoalPlan(goal));
        return await Promise.all(executionPromises);
    }

    async _proactiveEnrichment() {
        const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
        this.memory.addTasks(proactiveTasks);
        return proactiveTasks;
    }

    async runOnce() {
        const currentTime = Date.now();

        await this._perceive();
        this._prioritize(currentTime);

        const allTasks = this.memory.getAllTasks();
        const {contradictions, metaTasks} = this._metaCognition(allTasks);

        const derivedTasks = await this._reason(contradictions);
        await this._enrich([...derivedTasks, ...metaTasks]);
        const proactiveTasks = await this._proactiveEnrichment();
        const executionResults = await this._act();

        EventBus.emit('SystemCycleEnded');

        return {
            derivedTasks: derivedTasks.length,
            contradictions: contradictions.length,
            metaTasks: metaTasks.length,
            proactiveTasks: proactiveTasks.length,
            executionResults
        };
    }
}

module.exports = Cycle;