const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const {cosineSimilarity} = require('../utils/math');
const {calculateTemporalPriority} = require('../utils/temporal-reasoning');
const actionExecutor = require('./ActionExecutor');
const CONSTITUTION_TASKS = require('./Constitution');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');

const FOCUS_SET_SIZE = 20;
const META_TASK_PRIORITY = 0.9;
const ACTIONABLE_GOAL_PRIORITY_THRESHOLD = 0.5;
const MAX_GOALS_TO_EXECUTE = 3;

class Cycle {
    constructor(memory, reasoner, lm) {
        if (!(memory instanceof Memory)) {
            throw new Error('Cycle requires a Memory instance.');
        }
        if (!(reasoner instanceof Reasoner)) {
            throw new Error('Cycle requires a Reasoner instance.');
        }
        if (!(lm instanceof LM)) {
            throw new Error('Cycle requires an LM instance.');
        }
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.perception = new Perception(memory, lm);
        this.metaCognition = new MetaCognition();
        this.temporalReasoner = new TemporalReasoner();
        this.driveEmbeddings = [];
        this.taskDerivations = new Map();
    }

    async bootstrap() {
        this.driveEmbeddings = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey)?.embedding)
            .filter(Boolean);
    }

    calculatePriority(task, currentTime) {
        const term = this.memory.getTerm(task.termKey);
        if (!term || !term.embedding || term.embedding.length === 0) {
            return 0;
        }

        let maxSimilarity = 0;
        for (const driveEmbedding of this.driveEmbeddings) {
            const similarity = cosineSimilarity(term.embedding, driveEmbedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
        const I = (maxSimilarity + 0.1) / 1.1;
        const timeSinceCreation = currentTime - task.state.stamp.creationTime;
        const U = 1 / (1 + timeSinceCreation / 10000);
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
        for (const task of this.memory.getAllTasks()) {
            task.state.priority = this.calculatePriority(task, currentTime);
        }
    }

    async _reason() {
        const focusSet = this.memory.getHighestPriorityTasks(FOCUS_SET_SIZE);

        const symbolicDerivedTasks = this.reasoner.performInference(focusSet, this.memory.terms);
        const temporalDerivedTasks = this.temporalReasoner.infer(focusSet);
        const lmHypotheses = await this.lm.generateHypotheses(focusSet);

        const derivedTasks = [
            ...symbolicDerivedTasks,
            ...temporalDerivedTasks,
            ...lmHypotheses
        ];

        this.memory.addTasks(derivedTasks);

        for (const derivedTask of derivedTasks) {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        }

        return derivedTasks;
    }

    _metaCognition(derivedTasks) {
        // Also consider existing tasks in memory for finding contradictions
        const allTasks = [...this.memory.getAllTasks(), ...derivedTasks];
        const contradictions = this.metaCognition.findContradictions(allTasks);

        let allMetaTasks = [];
        if (contradictions.length > 0) {
            for (const contradiction of contradictions) {
                let strategy;
                if (contradiction.severity > 0.8) {
                    strategy = 'revision';
                } else if (contradiction.severity > 0.5) {
                    strategy = 'evidence_gathering';
                } else {
                    strategy = 'monitoring';
                }

                const newMetaTasks = this.metaCognition.resolve(contradiction, strategy);
                if (newMetaTasks.length > 0) {
                    allMetaTasks.push(...newMetaTasks);
                }
            }

            if (allMetaTasks.length > 0) {
                this.memory.addTasks(allMetaTasks);
                for (const metaTask of allMetaTasks) {
                    metaTask.state.priority = META_TASK_PRIORITY;
                }
            }
        }

        return {
            contradictions,
            metaTasks: allMetaTasks
        };
    }

    async _enrich(tasks) {
        for (const task of tasks) {
            if (!this.memory.getTerm(task.termKey)) {
                const newTerm = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(newTerm);
            }
        }
    }

    async _act() {
        const actionableGoals = this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority);

        const executionResults = [];
        for (const goal of actionableGoals.slice(0, MAX_GOALS_TO_EXECUTE)) {
            try {
                const result = await actionExecutor.executeGoal(goal);
                executionResults.push(result);
            } catch (error) {
                executionResults.push({success: false, task: goal.termKey, error: error.message});
            }
        }
        return executionResults;
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