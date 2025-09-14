import Memory from '../memory/Memory.js';
import Reasoner from '../reasoner/Reasoner.js';
import LM from '../lm/LM.js';
import Planner from './Planner.js';
import Perception from './Perception.js';
import MetaCognition from './MetaCognition.js';
import TemporalReasoner from '../reasoner/TemporalReasoner.js';
import PriorityManager from '../reasoner/PriorityManager.js';
import EventBus from './EventBus.js';
import CONSTITUTION_TASKS from './Constitution.js';
import Task from '../core/Task.js';
import {safeAsync, safeSync, handleError} from '../utils/error-handler.js';
import {error, debug} from '../utils/logger.js';

/**
 * Cycle represents a single iteration of the cognitive processing loop.
 * 
 * The Cycle orchestrates the entire cognitive process, which consists of:
 * 1. Perception - Processing incoming events and information
 * 2. Prioritization - Calculating task priorities based on various factors
 * 3. Meta-Cognition - Detecting and resolving contradictions
 * 4. Reasoning - Applying inference rules to derive new knowledge
 * 5. Enrichment - Generating new terms and proactive knowledge
 * 6. Action - Executing plans for high-priority goals
 * 
 * Each cycle operates on the current state of memory and updates it with new information.
 */
class Cycle {
    /**
     * Creates a new Cycle instance.
     * @param {Memory} memory - The memory instance to operate on
     * @param {Reasoner} reasoner - The reasoner instance for symbolic inference
     * @param {LM} lm - The language model instance for neuro-symbolic processing
     * @param {ActionExecutor} actionExecutor - The action executor for plan execution
     * @param {object} config - Configuration options
     */
    constructor(memory, reasoner, lm, actionExecutor, config) {
        this._validateDependencies(memory, reasoner, lm, config);
        this._initializeComponents(memory, reasoner, lm, actionExecutor, config);
        this._initializeState();
    }

    /**
     * Validates that all required dependencies are provided
     * @param {Memory} memory - The memory instance
     * @param {Reasoner} reasoner - The reasoner instance
     * @param {LM} lm - The language model instance
     * @param {object} config - Configuration options
     * @private
     */
    _validateDependencies(memory, reasoner, lm, config) {
        if (!(memory instanceof Memory) || !(reasoner instanceof Reasoner) || !(lm instanceof LM)) {
            throw new Error('Cycle requires instances of Memory, Reasoner, and LM.');
        }
        if (!config) {
            throw new Error('Cycle requires a config object.');
        }
    }

    /**
     * Initializes all components needed for the cycle
     * @param {Memory} memory - The memory instance
     * @param {Reasoner} reasoner - The reasoner instance
     * @param {LM} lm - The language model instance
     * @param {ActionExecutor} actionExecutor - The action executor
     * @param {object} config - Configuration options
     * @private
     */
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

    /**
     * Initializes internal state variables
     * @private
     */
    _initializeState() {
        this.driveEmbeddings = []; // Embeddings for constitutional drives
        this.taskDerivations = new Map(); // Maps derived task IDs to their source tasks
    }

    /**
     * Bootstraps the cycle by initializing drive embeddings from constitutional tasks
     * @returns {Promise<void>}
     */
    async bootstrap() {
        return await safeAsync(async () => {
            const driveTerms = CONSTITUTION_TASKS
                .filter(task => task.punctuation === '!')
                .map(task => this.memory.getTerm(task.termKey))
                .filter(Boolean);
            this.driveEmbeddings = driveTerms.map(term => term.embedding);
        }, 'Cycle.bootstrap');
    }

    /**
     * Runs a single iteration of the cognitive cycle
     * 
     * This method orchestrates the entire cognitive process:
     * 1. Processes incoming perception events
     * 2. Updates task priorities
     * 3. Detects and resolves contradictions
     * 4. Performs reasoning to derive new tasks
     * 5. Enriches knowledge with proactive generation
     * 6. Executes action plans for high-priority goals
     * 
     * @returns {Promise<object>} Results of the cycle including counts of various operations
     */
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
                executionResults: []
            };

            // PERCEPTION: Process incoming events and information
            await this._runPerceptionPhase();

            // PRIORITIZATION: Calculate task priorities based on various factors
            this._runPrioritizationPhase(context);

            // META-COGNITION: Detect and resolve contradictions
            const {contradictions, metaTasks} = await this._runMetaCognitionPhase(context);
            context.contradictions = contradictions;
            context.metaTasks = metaTasks;

            // REASONING: Apply inference rules to derive new knowledge
            context.derivedTasks = await this._runReasoningPhase(context);

            // ENRICHMENT: Generate new terms and proactive knowledge
            const {proactiveTasks} = await this._runEnrichmentPhase(context);
            context.proactiveTasks = proactiveTasks;

            // ACTION: Execute plans for high-priority goals
            context.executionResults = await this._runActionPhase();

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

    // --- Phase Implementations ---

    /**
     * Runs the perception phase of the cycle
     * @returns {Promise<void>}
     * @private
     */
    async _runPerceptionPhase() {
        return await safeAsync(async () => {
            await this.perception.processEvents();
        }, 'Cycle._runPerceptionPhase');
    }

    /**
     * Runs the prioritization phase of the cycle
     * @param {object} context - The cycle context
     * @private
     */
    _runPrioritizationPhase(context) {
        return safeSync(() => {
            const {currentTime, driveEmbeddings} = context;
            this.memory.getAllTasks().forEach(task => {
                task.state.priority = this.priorityManager.calculatePriority(task, currentTime, driveEmbeddings);
            });
        }, 'Cycle._runPrioritizationPhase');
    }

    /**
     * Runs the meta-cognition phase of the cycle
     * @param {object} context - The cycle context
     * @returns {Promise<object>} Object containing contradictions and meta tasks
     * @private
     */
    async _runMetaCognitionPhase(context) {
        return await safeAsync(async () => {
            const {allTasks} = context;
            const contradictions = (await EventBus.request('MetaCognition.findContradictions', allTasks)) || [];
            const metaTasks = contradictions.length > 0 ? await this._resolveContradictions(contradictions) : [];
            return {contradictions, metaTasks};
        }, 'Cycle._runMetaCognitionPhase');
    }

    /**
     * Runs the reasoning phase of the cycle
     * @param {object} context - The cycle context
     * @returns {Promise<Task[]>} Array of derived tasks
     * @private
     */
    async _runReasoningPhase(context) {
        return await safeAsync(async () => {
            const {contradictions} = context;
            const focusSet = this._getFocusSet();
            if (focusSet.length === 0) {
                return [];
            }

            const goals = this._getPrioritizedGoals();
            const derivedTasks = await this._performReasoning(focusSet, goals, contradictions);
            this._storeDerivedTasks(derivedTasks, focusSet);

            return derivedTasks;
        }, 'Cycle._runReasoningPhase');
    }

    /**
     * Runs the enrichment phase of the cycle
     * @param {object} context - The cycle context
     * @returns {Promise<object>} Object containing proactive tasks
     * @private
     */
    async _runEnrichmentPhase(context) {
        return await safeAsync(async () => {
            const {derivedTasks, metaTasks} = context;

            const newTermKeys = this._getNewTermKeys([...derivedTasks, ...metaTasks]);
            await this._bootstrapTerms(newTermKeys);

            return {proactiveTasks: await this._proactiveEnrichment()};
        }, 'Cycle._runEnrichmentPhase');
    }

    /**
     * Runs the action phase of the cycle
     * @returns {Promise<any[]>} Array of execution results
     * @private
     */
    async _runActionPhase() {
        return await safeAsync(async () => {
            const actionableGoals = this._getActionableGoals();
            const executionPromises = actionableGoals.map(goal => this._executeGoalPlan(goal));
            return Promise.all(executionPromises);
        }, 'Cycle._runActionPhase');
    }

    // --- Phase Helper Methods ---

    /**
     * Resolves contradictions by generating meta tasks
     * @param {Array} contradictions - Array of contradictions to resolve
     * @returns {Promise<Task[]>} Array of meta tasks
     * @private
     */
    async _resolveContradictions(contradictions) {
        return await safeAsync(async () => {
            const resolutionPromises = contradictions.map(contradiction =>
                EventBus.request('MetaCognition.resolve', {
                    contradiction,
                    strategy: 'auto'
                })
            );
            const resolvedTasksArray = await Promise.all(resolutionPromises);
            const metaTasks = resolvedTasksArray.flat().filter(Boolean);

            if (metaTasks.length > 0) {
                metaTasks.forEach(metaTask => metaTask.state.priority = this.config.META_TASK_PRIORITY);
                this.memory.addTasks(metaTasks);
            }
            return metaTasks;
        }, 'Cycle._resolveContradictions');
    }

    /**
     * Gets the focus set of high-priority tasks for reasoning
     * @returns {Task[]} Array of focus tasks
     * @private
     */
    _getFocusSet() {
        return safeSync(() => {
            const focusSet = this.memory.getHighestPriorityTasks(this.config.FOCUS_SET_SIZE);
            focusSet.forEach(task => task.touch());
            return focusSet;
        }, 'Cycle._getFocusSet', []);
    }

    /**
     * Performs reasoning on the focus set
     * @param {Task[]} focusSet - Array of tasks to reason on
     * @param {Task[]} goals - Array of current goals
     * @param {Array} contradictions - Array of current contradictions
     * @returns {Promise<Task[]>} Array of derived tasks
     * @private
     */
    async _performReasoning(focusSet, goals, contradictions) {
        return await safeAsync(async () => {
            const [symbolicTasks, temporalTasks, lmTasks] = await Promise.all([
                Promise.resolve(this.reasoner.performInference(focusSet)),
                Promise.resolve(this.temporalReasoner.infer(focusSet)),
                this._generateLmHypotheses(focusSet, goals, contradictions)
            ]);
            return [...symbolicTasks, ...temporalTasks, ...lmTasks];
        }, 'Cycle._performReasoning');
    }

    /**
     * Generates hypotheses using the language model
     * @param {Task[]} focusSet - Array of focus tasks
     * @param {Task[]} goals - Array of current goals
     * @param {Array} contradictions - Array of current contradictions
     * @returns {Promise<Task[]>} Array of generated hypotheses
     * @private
     */
    async _generateLmHypotheses(focusSet, goals, contradictions) {
        return await safeAsync(async () => {
            const lmHypothesesPromises = this.config.LM_HYPOTHESIS_CONFIGS.map(hypothesisConfig =>
                this.lm.generateHypotheses(focusSet, {...hypothesisConfig, goals, contradictions})
            );
            const lmHypotheses = (await Promise.all(lmHypothesesPromises)).flat();
            return this.lm.evaluateAndRankHypotheses(focusSet, lmHypotheses);
        }, 'Cycle._generateLmHypotheses');
    }

    /**
     * Stores derived tasks in memory and tracks their derivations
     * @param {Task[]} derivedTasks - Array of derived tasks
     * @param {Task[]} focusSet - Array of focus tasks that led to derivation
     * @private
     */
    _storeDerivedTasks(derivedTasks, focusSet) {
        return safeSync(() => {
            this.memory.addTasks(derivedTasks);
            derivedTasks.forEach(derivedTask => {
                this.taskDerivations.set(derivedTask.id, [...focusSet]);
            });
        }, 'Cycle._storeDerivedTasks');
    }

    /**
     * Performs proactive enrichment of knowledge
     * @returns {Promise<Task[]>} Array of proactive tasks
     * @private
     */
    async _proactiveEnrichment() {
        return await safeAsync(async () => {
            const proactiveTasks = await this.lm.proactiveEnrichment(this.memory.getAllTasks());
            this.memory.addTasks(proactiveTasks);
            return proactiveTasks;
        }, 'Cycle._proactiveEnrichment');
    }

    // --- Utility Methods (from cycleUtils.js) ---

    /**
     * Gets new term keys from tasks that don't yet exist in memory
     * @param {Task[]} tasks - Array of tasks
     * @returns {string[]} Array of new term keys
     * @private
     */
    _getNewTermKeys(tasks) {
        return safeSync(() => {
            return [...new Set(tasks.map(task => task.termKey).filter(termKey => !this.memory.getTerm(termKey)))];
        }, 'Cycle._getNewTermKeys', []);
    }

    /**
     * Bootstraps terms by generating embeddings for new term keys
     * @param {string[]} termKeys - Array of term keys to bootstrap
     * @returns {Promise<void>}
     * @private
     */
    async _bootstrapTerms(termKeys) {
        return await safeAsync(async () => {
            const batchSize = this.config.system.BATCH_SIZE;
            for (let i = 0; i < termKeys.length; i += batchSize) {
                const batch = termKeys.slice(i, i + batchSize);
                const termPromises = batch.map(termKey => this.lm.bootstrapTerm(termKey));
                const newTerms = await Promise.all(termPromises);
                newTerms.forEach(term => this.memory.addTerm(term));
            }
        }, 'Cycle._bootstrapTerms');
    }

    /**
     * Gets prioritized goals based on priority thresholds
     * @returns {Task[]} Array of prioritized goals
     * @private
     */
    _getPrioritizedGoals() {
        return safeSync(() => {
            return Task.getGoalTasks(this.memory.getAllTasks())
                .filter(task => task.state.priority > this.config.ACTIONABLE_GOAL_PRIORITY_THRESHOLD)
                .slice(0, this.config.MAX_GOALS_TO_EXECUTE);
        }, 'Cycle._getPrioritizedGoals', []);
    }

    /**
     * Gets actionable goals (same as prioritized goals in current implementation)
     * @returns {Task[]} Array of actionable goals
     * @private
     */
    _getActionableGoals() {
        return safeSync(() => {
            return this._getPrioritizedGoals();
        }, 'Cycle._getActionableGoals', []);
    }

    /**
     * Executes a goal plan with retry logic
     * @param {Task} goal - The goal task to execute
     * @param {number} maxAttempts - Maximum number of execution attempts
     * @returns {Promise<object>} Execution result
     * @private
     */
    async _executeGoalPlan(goal, maxAttempts = 3) {
        return await safeAsync(async () => {
            let result = {success: false};
            let attempts = 0;
            let lastFailedPlan = null;

            while (attempts < maxAttempts && !result.success) {
                attempts++;
                const plan = await this.planner.createPlan(goal, lastFailedPlan);
                result = await this._attemptPlanExecution(plan, goal);
                if (!result.success && result.failedPlan) {
                    lastFailedPlan = result.failedPlan;
                    delete result.failedPlan;
                } else if (!result.success) {
                    break;
                }
            }
            return result;
        }, 'Cycle._executeGoalPlan');
    }

    /**
     * Attempts to execute a plan
     * @param {object} plan - The plan to execute
     * @param {Task} goal - The goal task
     * @returns {Promise<object>} Execution result
     * @private
     */
    async _attemptPlanExecution(plan, goal) {
        return await safeAsync(async () => {
            if (plan && plan.steps.length > 0) {
                return await plan.execute().catch(error => ({
                    success: false,
                    task: goal.termKey,
                    error: error.message,
                    failedPlan: plan,
                }));
            }
            if (plan) {
                return {success: true, planId: plan.id, results: ['Goal already achieved']};
            }
            return {success: false, error: `No plan found for ${goal.termKey}`};
        }, 'Cycle._attemptPlanExecution');
    }
}

export default Cycle;