const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const {calculateTemporalPriority} = require('../utils/temporal-reasoning');
const actionExecutor = require('./ActionExecutor');
const CONSTITUTION_TASKS = require('./Constitution');
const PerceptionEnhanced = require('./PerceptionEnhanced');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');

const FOCUS_SET_SIZE = 20;
const META_TASK_PRIORITY = 0.9;
const ACTIONABLE_GOAL_PRIORITY_THRESHOLD = 0.5;
const MAX_GOALS_TO_EXECUTE = 3;

class Cycle {
    constructor(memory, reasoner, lm) {
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.perception = new PerceptionEnhanced(memory, lm);
        this.metaCognition = new MetaCognition();
        this.temporalReasoner = new TemporalReasoner();
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

    calculatePriority(task, currentTime) {
        const term = this.memory.getTerm(task.termKey);
        if (!term?.embedding?.length) return 0;

        const maxSimilarity = this.driveEmbeddings.reduce((max, driveEmbedding) => {
            const similarity = require('../utils/math').cosineSimilarity(term.embedding, driveEmbedding);
            return similarity > max ? similarity : max;
        }, 0);

        const I = (maxSimilarity + 0.1) / 1.1;
        const U = 1 / (1 + (currentTime - task.state.stamp.creationTime) / 10000);
        const T = calculateTemporalPriority(task, currentTime);
        const C = task.state.truthValue.confidence;
        const E = 1 / term.complexity;

        return I * U * T * C * E;
    }

    async _perceive() {
        const newTasks = await this.perception.processEvents();
        this.memory.addTasks(newTasks);
    }

    _prioritize(currentTime) {
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.calculatePriority(task, currentTime);
        });
    }

    async _reason() {
        const focusSet = this.memory.getHighestPriorityTasks(FOCUS_SET_SIZE);
        if (focusSet.length === 0) return [];

        const symbolicDerivedTasks = this.reasoner.performInference(focusSet);
        const temporalDerivedTasks = this.temporalReasoner.infer(focusSet);

        const hypothesisConfigs = [
            {type: 'general', num: 2},
            {type: 'creative', num: 1},
            {type: 'sophisticated', num: 1},
        ];

        const lmHypothesesPromises = hypothesisConfigs.map(config =>
            this.lm.generateHypotheses(focusSet, config)
        );

        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        const rankedHypotheses = await this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);

        const derivedTasks = [
            ...symbolicDerivedTasks,
            ...temporalDerivedTasks,
            ...rankedHypotheses
        ];

        this.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        });

        return derivedTasks;
    }

    _metaCognition(derivedTasks) {
        const allTasks = [...this.memory.getAllTasks(), ...derivedTasks];
        const contradictions = this.metaCognition.findContradictions(allTasks);
        if (contradictions.length === 0) return {contradictions: [], metaTasks: []};

        const allMetaTasks = contradictions.flatMap(contradiction =>
            this.metaCognition.resolve(contradiction, 'auto')
        );

        if (allMetaTasks.length > 0) {
            this.memory.addTasks(allMetaTasks);
            allMetaTasks.forEach(metaTask => metaTask.state.priority = META_TASK_PRIORITY);
        }

        return {contradictions, metaTasks: allMetaTasks};
    }

    async _enrich(tasks) {
        const newTermKeys = [...new Set(tasks.map(t => t.termKey).filter(tk => !this.memory.getTerm(tk)))];
        const newTerms = await Promise.all(newTermKeys.map(termKey => this.lm.bootstrapTerm(termKey)));
        newTerms.forEach(term => this.memory.addTerm(term));
    }

    async _act() {
        const actionableGoals = this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority)
            .slice(0, MAX_GOALS_TO_EXECUTE);

        return Promise.all(actionableGoals.map(goal =>
            actionExecutor.executeGoal(goal).catch(error => ({
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