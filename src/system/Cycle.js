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
const {getGoalTasks} = require('../utils/task-utils');
const {handleErrorWithDefault} = require('../utils/error-handler');

class Cycle {
    /**
     * Create a new Cycle instance
     * @param {Memory} memory - The memory instance to use
     * @param {Reasoner} reasoner - The reasoner instance to use
     * @param {LM} lm - The language model instance to use
     * @param {ActionExecutor} actionExecutor - The action executor instance to use
     * @param {object} config - Configuration object
     */
    constructor(memory, reasoner, lm, actionExecutor, config) {
        // Validate required dependencies
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        if (!config) {
            throw new Error('Cycle requires a config object.');
        }
        
        // Initialize core components
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.config = config;
        
        // Configure language model with reasoner and memory
        this.lm.setReasoner(this.reasoner);
        this.lm.setMemory(this.memory);
        
        // Initialize subsystems
        this.perception = new Perception(memory, lm);
        this.planner = new Planner(this.memory, this.lm, actionExecutor, this.config.planner);
        this.metaCognition = new MetaCognition();
        this.temporalReasoner = new TemporalReasoner();
        this.priorityManager = new PriorityManager(memory);
        
        // Initialize internal state
        this.driveEmbeddings = [];
        this.taskDerivations = new Map();
    }

    /**
     * Bootstrap the cycle with initial drive terms
     */
    async bootstrap() {
        // Extract drive terms from constitution tasks
        const driveTerms = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey))
            .filter(Boolean);
        this.driveEmbeddings = driveTerms.map(term => term.embedding);
    }

    /**
     * Process perception events
     * @private
     */
    async _perceive() {
        await this.perception.processEvents();
    }

    /**
     * Calculate and update task priorities
     * @private
     * @param {number} currentTime - Current timestamp
     */
    _prioritize(currentTime) {
        this.memory.getAllTasks().forEach(task => {
            task.state.priority = this.priorityManager.calculatePriority(task, currentTime, this.driveEmbeddings);
        });
    }

    /**
     * Generate hypotheses using the language model
     * @private
     * @param {Task[]} focusSet - The focus set of tasks
     * @param {Task[]} goals - Current goals
     * @param {object[]} contradictions - Current contradictions
     * @returns {Task[]} Array of generated hypotheses
     */
    async _generateLmHypotheses(focusSet, goals, contradictions) {
        // Generate hypotheses using each configured LM hypothesis configuration
        const lmHypothesesPromises = this.config.LM_HYPOTHESIS_CONFIGS.map(hypothesisConfig =>
            this.lm.generateHypotheses(focusSet, {...hypothesisConfig, goals, contradictions})
        );

        // Flatten and rank hypotheses
        const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
        return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
    }

    /**
     * Perform reasoning on the current focus set
     * @private
     * @param {object[]} contradictions - Current contradictions
     * @returns {Task[]} Array of derived tasks
     */
    async _reason(contradictions) {
        // Get the highest priority tasks as the focus set
        const focusSet = this.memory.getHighestPriorityTasks(this.config.FOCUS_SET_SIZE);
        if (focusSet.length === 0) return [];

        // Update task access timestamps
        focusSet.forEach(task => task.touch());

        // Get actionable goals
        const goals = getGoalTasks(this.memory.getAllTasks())
            .filter(task => task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority);

        // Perform different types of reasoning in parallel
        const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
            Promise.resolve(this.reasoner.performInference(focusSet)),
            Promise.resolve(this.temporalReasoner.infer(focusSet)),
            this._generateLmHypotheses(focusSet, goals, contradictions)
        ]);

        // Combine all derived tasks
        const derivedTasks = [...symbolicTasks, ...temporalTasks, ...lmTasks];

        // Add derived tasks to memory
        this.memory.addTasks(derivedTasks);
        derivedTasks.forEach(derivedTask => {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        });

        return derivedTasks;
    }

    /**
     * Perform meta-cognition operations
     * @private
     * @param {Task[]} tasks - Tasks to analyze
     * @returns {object} Object containing contradictions and meta tasks
     */
    _metaCognition(tasks) {
        // Find contradictions in the tasks
        const contradictions = this.metaCognition.findContradictions(tasks);
        if (contradictions.length === 0) {
            return {contradictions, metaTasks: []};
        }

        // Resolve contradictions
        const metaTasks = contradictions.flatMap(contradiction =>
            this.metaCognition.resolve(contradiction, 'auto')
        );

        // Add meta tasks to memory with high priority
        if (metaTasks.length > 0) {
            metaTasks.forEach(metaTask => metaTask.state.priority = this.config.META_TASK_PRIORITY);
            this.memory.addTasks(metaTasks);
        }

        return {contradictions, metaTasks};
    }

    /**
     * Enrich tasks with additional terms
     * @private
     * @param {Task[]} tasks - Tasks to enrich
     */
    async _enrich(tasks) {
        // Identify new term keys that aren't already in memory
        const newTermKeys = [...new Set(tasks.map(task => task.termKey).filter(termKey => !this.memory.getTerm(termKey)))];
        
        // Bootstrap new terms using the language model in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < newTermKeys.length; i += batchSize) {
            const batch = newTermKeys.slice(i, i + batchSize);
            const newTerms = await Promise.all(batch.map(termKey => this.lm.bootstrapTerm(termKey)));
            newTerms.forEach(term => this.memory.addTerm(term));
        }
    }

    /**
     * Get actionable goals from memory
     * @private
     * @returns {Task[]} Array of actionable goals
     */
    _getActionableGoals() {
        return getGoalTasks(this.memory.getAllTasks())
            .filter(task => task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
            .sort((a, b) => b.state.priority - a.state.priority)
            .slice(0, this.config.MAX_GOALS_TO_EXECUTE);
    }

    /**
     * Execute a goal plan with retry logic
     * @private
     * @param {Task} goal - The goal to execute
     * @param {number} maxAttempts - Maximum number of execution attempts
     * @returns {object} Execution result
     */
    async _executeGoalPlan(goal, maxAttempts = 3) {
        let result = {success: false};
        let attempts = 0;
        let lastFailedPlan = null;

        // Retry execution up to maxAttempts
        while (attempts < maxAttempts && !result.success) {
            attempts++;
            const plan = await this.planner.createPlan(goal, lastFailedPlan);

            if (plan && plan.steps.length > 0) {
                // Execute plan and handle errors
                result = await plan.execute().catch(error => ({
                    success: false,
                    task: goal.termKey,
                    error: error.message,
                }));
                if (!result.success) {
                    lastFailedPlan = plan;
                }
            } else if (plan) { // Empty plan indicates goal already achieved
                result = {success: true, planId: plan.id, results: ['Goal already achieved']};
            } else {
                // No plan could be created, break the attempt loop
                result = {success: false, error: `No plan found for ${goal.termKey}`};
                break;
            }
        }

        return result;
    }

    /**
     * Execute actions for actionable goals in parallel
     * @private
     * @returns {object[]} Array of execution results
     */
    async _act() {
        const actionableGoals = this._getActionableGoals();
        
        // Execute all actionable goals in parallel
        const executionPromises = actionableGoals.map(goal => this._executeGoalPlan(goal));
        const executionResults = await Promise.all(executionPromises);
        
        return executionResults;
    }

    /**
     * Run one complete cycle of the system
     * @returns {object} Cycle execution statistics
     */
    async runOnce() {
        const currentTime = Date.now();

        // Perception phase
        await this._perceive();
        
        // Prioritization phase
        this._prioritize(currentTime);

        // Meta-cognition phase
        const allTasks = this.memory.getAllTasks();
        const {contradictions, metaTasks} = this._metaCognition(allTasks);

        // Reasoning phase
        const derivedTasks = await this._reason(contradictions);

        // Enrichment phase
        await this._enrich([...derivedTasks, ...metaTasks]);

        // Proactive enrichment phase
        const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
        this.memory.addTasks(proactiveTasks);

        // Action execution phase
        const executionResults = await this._act();

        // Emit cycle completion event
        EventBus.emit('SystemCycleEnded');

        // Return cycle statistics
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