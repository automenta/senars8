const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const {calculateTemporalPriority} = require('../utils/temporal-reasoning');
const planner = require('./Planner');
const CONSTITUTION_TASKS = require('./Constitution');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');
const PriorityManager = require('../reasoner/PriorityManager');
const config = require('../config');

class Cycle {
    constructor(memory, reasoner, lm) {
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.perception = new Perception(memory, lm);
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
        const newTasks = await this.perception.processEvents();
        this.memory.addTasks(newTasks);
    }

    _prioritize(currentTime) {
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.priorityManager.calculatePriority(task, currentTime, this.driveEmbeddings);
        });
    }

    async _generateLmHypotheses(focusSet) {
        const lmHypothesesPromises = config.LM_HYPOTHESIS_CONFIGS.map(hConfig =>
            this.lm.generateHypotheses(focusSet, hConfig)
        );

        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    async _reason() {
        const focusSet = this.memory.getHighestPriorityTasks(config.FOCUS_SET_SIZE);
        if (focusSet.length === 0) return [];

        const symbolicTasks = this.reasoner.performInference(focusSet);
        const temporalTasks = this.temporalReasoner.infer(focusSet);
        const lmTasks = await this._generateLmHypotheses(focusSet);

        const derivedTasks = [...symbolicTasks, ...temporalTasks, ...lmTasks];

        this.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        });

        return derivedTasks;
    }

    _metaCognition(derivedTasks) {
        const allTasks = [...this.memory.getAllTasks(), ...derivedTasks];
        const contradictions = this.metaCognition.findContradictions(allTasks);
        if (contradictions.length === 0) {
            return {contradictions, metaTasks: []};
        }

        const metaTasks = contradictions.flatMap(c =>
            this.metaCognition.resolve(c, 'auto')
        );

        if (metaTasks.length > 0) {
            metaTasks.forEach(mt => mt.state.priority = config.META_TASK_PRIORITY);
            this.memory.addTasks(metaTasks);
        }

        return {contradictions, metaTasks};
    }

    async _enrich(tasks) {
        const newTermKeys = [...new Set(tasks.map(t => t.termKey).filter(tk => !this.memory.getTerm(tk)))];
        const newTerms = await Promise.all(newTermKeys.map(termKey => this.lm.bootstrapTerm(termKey)));
        newTerms.forEach(term => this.memory.addTerm(term));
    }

    async _act() {
        const actionableGoals = this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority)
            .slice(0, config.MAX_GOALS_TO_EXECUTE);

        return Promise.all(actionableGoals.map(goal =>
            planner.planAndExecute(goal).catch(error => ({
                success: false,
                task: goal.termKey,
                error: error.message
            }))
        ));
    }

    async runOnce() {
        const currentTime = Date.now();

        await this._perceive();
        this._prioritize(currentTime);
        const derivedTasks = await this._reason();
        const {contradictions, metaTasks} = this._metaCognition(derivedTasks);
        await this._enrich([...derivedTasks, ...metaTasks]);
        const executionResults = await this._act();

        return {
            derivedTasks: derivedTasks.length,
            contradictions: contradictions.length,
            metaTasks: metaTasks.length,
            executionResults
        };
    }
}

module.exports = Cycle;