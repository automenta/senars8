const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const Planner = require('./Planner');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');
const TemporalReasoner = require('../reasoner/TemporalReasoner');
const PriorityManager = require('../reasoner/PriorityManager');
const EventBus = require('./EventBus');
const CONSTITUTION_TASKS = require('./Constitution');

// Import phase classes
const PerceptionPhase = require('./cycle/PerceptionPhase');
const PrioritizationPhase = require('./cycle/PrioritizationPhase');
const MetaCognitionPhase = require('./cycle/MetaCognitionPhase');
const ReasoningPhase = require('./cycle/ReasoningPhase');
const EnrichmentPhase = require('./cycle/EnrichmentPhase');
const ActionPhase = require('./cycle/ActionPhase');

class Cycle {
    constructor(memory, reasoner, lm, actionExecutor, config) {
        this._validateDependencies(memory, reasoner, lm, config);
        this._initializeComponents(memory, reasoner, lm, actionExecutor, config);
        this._initializeState();
        this._initializePhases();
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

    _initializePhases() {
        this.phases = [
            new PerceptionPhase(),
            new PrioritizationPhase(),
            new MetaCognitionPhase(),
            new ReasoningPhase(),
            new EnrichmentPhase(),
            new ActionPhase(),
        ];
    }

    async bootstrap() {
        const driveTerms = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey))
            .filter(Boolean);
        this.driveEmbeddings = driveTerms.map(term => term.embedding);
    }

    async runOnce() {
        const context = {
            currentTime: Date.now(),
            driveEmbeddings: this.driveEmbeddings,
            allTasks: this.memory.getAllTasks(),
            contradictions: [],
            metaTasks: [],
            derivedTasks: [],
            proactiveTasks: [],
            executionResults: []
        };

        // PERCEPTION
        await this.phases[0].execute(this, context);

        // PRIORITIZATION
        this.phases[1].execute(this, context);

        // META-COGNITION
        const { contradictions, metaTasks } = this.phases[2].execute(this, context);
        context.contradictions = contradictions;
        context.metaTasks = metaTasks;

        // REASONING
        const derivedTasks = await this.phases[3].execute(this, context);
        context.derivedTasks = derivedTasks;

        // ENRICHMENT
        const { proactiveTasks } = await this.phases[4].execute(this, context);
        context.proactiveTasks = proactiveTasks;

        // ACTION
        const executionResults = await this.phases[5].execute(this, context);
        context.executionResults = executionResults;

        EventBus.emit('SystemCycleEnded');

        return {
            derivedTasks: context.derivedTasks.length,
            contradictions: context.contradictions.length,
            metaTasks: context.metaTasks.length,
            proactiveTasks: context.proactiveTasks.length,
            executionResults: context.executionResults
        };
    }
}

module.exports = Cycle;