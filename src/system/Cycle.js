const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const {calculateTemporalPriority} = require('../utils/temporal-reasoning');
const Planner = require('./Planner');
const CONSTITUTION_TASKS = require('./Constitution');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');
const PriorityManager = require('../reasoner/PriorityManager');
const EventBus = require('./EventBus');

class Cycle {
    constructor(memory, reasoner, lm, actionExecutor, config) {
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        if (!config) {
            throw new Error('Cycle requires a config object.');
        }
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
        const lmHypothesesPromises = this.config.LM_HYPOTHESIS_CONFIGS.map(hConfig =>
            this.lm.generateHypotheses(focusSet, {...hConfig, goals, contradictions})
        );

        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    async _reason(contradictions) {
        const focusSet = this.memory.getHighestPriorityTasks(this.config.FOCUS_SET_SIZE);
        if (focusSet.length === 0) return [];

        focusSet.forEach(task => task.touch());

        const goals = this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority);

        const symbolicTasks = this.reasoner.performInference(focusSet);
        const temporalTasks = this.temporalReasoner.infer(focusSet);
        const lmTasks = await this._generateLmHypotheses(focusSet, goals, contradictions);

        const derivedTasks = [...symbolicTasks, ...temporalTasks, ...lmTasks];

        this.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        });

        return derivedTasks;
    }

    _metaCognition(tasks) {
        const contradictions = this.metaCognition.findContradictions(tasks);
        if (contradictions.length === 0) {
            return {contradictions, metaTasks: []};
        }

        const metaTasks = contradictions.flatMap(c =>
            this.metaCognition.resolve(c, 'auto')
        );

        if (metaTasks.length > 0) {
            metaTasks.forEach(mt => mt.state.priority = this.config.META_TASK_PRIORITY);
            this.memory.addTasks(metaTasks);
        }

        return {contradictions, metaTasks};
    }

    async _enrich(tasks) {
        const newTermKeys = [...new Set(tasks.map(t => t.termKey).filter(tk => !this.memory.getTerm(tk)))];
        const newTerms = await Promise.all(newTermKeys.map(termKey => this.lm.bootstrapTerm(termKey)));
        newTerms.forEach(term => this.memory.addTerm(term));
    }

    _getActionableGoals() {
        return this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority)
            .slice(0, this.config.MAX_GOALS_TO_EXECUTE);
    }

    async _executeGoalPlan(goal, maxAttempts = 3) {
        let result = {success: false};
        let attempts = 0;
        let lastFailedPlan = null;

        while (attempts < maxAttempts && !result.success) {
            attempts++;
            const plan = await this.planner.createPlan(goal, lastFailedPlan);

            if (plan && plan.steps.length > 0) {
                result = await plan.execute().catch(error => ({
                    success: false,
                    task: goal.termKey,
                    error: error.message,
                }));
                if (!result.success) {
                    lastFailedPlan = plan;
                }
            } else if (plan) { // Empty plan, goal already achieved
                result = {success: true, planId: plan.id, results: ['Goal already achieved']};
            } else {
                // No plan could be created, break the attempt loop
                result = {success: false, error: `No plan found for ${goal.termKey}`};
                break;
            }
        }

        return result;
    }

    async _act() {
        const actionableGoals = this._getActionableGoals();
        const executionResults = [];
        
        for (const goal of actionableGoals) {
            const result = await this._executeGoalPlan(goal);
            executionResults.push(result);

            // If a goal fails after all attempts, stop processing further goals.
            if (!result.success) {
                break;
            }
        }
        
        return executionResults;
    }

    async runOnce() {
        const currentTime = Date.now();

        await this._perceive();
        this._prioritize(currentTime);

        const allTasks = this.memory.getAllTasks();
        const {contradictions, metaTasks} = this._metaCognition(allTasks);

        const derivedTasks = await this._reason(contradictions);

        await this._enrich([...derivedTasks, ...metaTasks]);

        const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
        this.memory.addTasks(proactiveTasks);

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