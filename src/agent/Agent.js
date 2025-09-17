import SystemFactory from '../system/SystemFactory.js';
import {parseTerm} from '../parser/narseseParser.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import MCP from './MCP.js';
import {debug, warn} from '../utils/logger.js';
import Task from '../core/Task.js';

/**
 * Provides a high-level API for controlling the SeNARS system, encapsulating
 * initialization, tool registration, and goal-oriented planning. It serves as the
 * primary interface for an external application to interact with the cognitive architecture.
 */
const errorHandler = createModuleErrorHandler('Agent');

class Agent {
    /**
     * @param {object} [config={}] - Optional configuration to override system defaults.
     */
    constructor(config = {}) {
        this.system = null;
        this.config = config;
        this.isInitialized = false;
        this.mcp = new MCP(this);
        this.tools = {};
    }

    /**
     * Asynchronously initializes the agent and the underlying SeNARS system.
     * This method must be successfully called before any other operations.
     */
    async initialize() {
        if (this.isInitialized) return;
        await errorHandler.safeAsync(async () => {
            this.system = await SystemFactory.createSystem(this.config);
            this.isInitialized = true;
            debug('Agent initialized successfully.');
        }, 'initialize');
    }

    /**
     * Registers a new tool (action) that the agent can use to interact with its environment.
     * @param {object} tool - The tool definition.
     * @param {string} tool.name - The unique name of the tool.
     * @param {string} [tool.description] - A semantic description of the tool's purpose.
     * @param {object} [tool.parameters] - A schema describing the tool's parameters.
     * @param {Function} tool.handler - The async function to execute when the tool is called.
     */
    addTool(tool) {
        if (!this.isInitialized) throw new Error('Agent must be initialized before adding tools.');
        if (!tool || !tool.name || typeof tool.handler !== 'function') {
            throw new Error('Tool must be an object with a name and a handler function.');
        }
        this.tools[tool.name] = tool;
        this.system.actionExecutor.registerActionHandler(tool.name, tool.handler);
        debug(`Tool registered: ${tool.name}`);
    }

    /**
     * The core decision-making loop for the agent. Given a goal, it formulates a plan
     * and determines the next immediate action to take.
     * @param {string} goalString - The Narsese string representing the desired goal state.
     * @param {Array} [_history] - The interaction history (currently unused, for future extension).
     * @returns {Promise<object|null>} The next action to execute, or null if no plan is found.
     */
    async decideNextAction(goalString, _history) {
        if (!this.isInitialized) throw new Error('Agent not initialized.');
        debug('Deciding next action for goal:', goalString);

        const plan = await this.createPlan(goalString);
        if (!plan || plan.steps.length === 0) {
            debug('No actionable plan found.');
            return null;
        }

        const nextStep = plan.steps[0];
        const action = this._parseTermToAction(nextStep);
        debug('Next action determined:', action);
        return action;
    }

    /**
     * Executes a given action by invoking the corresponding registered tool handler.
     * @param {object} action - The action object, containing the tool name and parameters.
     * @returns {Promise<any>} The result of the executed tool handler.
     */
    async executeAction(action) {
        const tool = this.tools[action.tool];
        if (!tool) throw new Error(`Tool not found: ${action.tool}`);

        const {handler, parameters: toolParamsDef} = tool;
        if (!toolParamsDef?.properties) {
            return handler({}); // No parameters defined
        }

        const paramNames = Object.keys(toolParamsDef.properties);
        const params = action.parameters.reduce((acc, value, i) => {
            if (paramNames[i]) acc[paramNames[i]] = value;
            return acc;
        }, {});

        return handler(params);
    }

    /**
     * Converts a Narsese Term from a plan step into a structured action object.
     * @param {Term} term - The term to parse.
     * @returns {object|null} A structured action object or null if parsing fails.
     * @private
     */
    _parseTermToAction(term) {
        if (!term) return null;

        switch (term.type) {
            case 'Atomic':
                return {tool: term.key, parameters: []};
            case 'SequentialConjunction':
            case 'Conjunction': {
                const [nameTerm, ...paramTerms] = term.terms;
                if (!nameTerm) return null;
                return {
                    tool: nameTerm.key,
                    parameters: paramTerms.map(t => t.key.replace(/"/g, ''))
                };
            }
            default:
                warn(`Cannot parse term of type '${term.type}' to an action:`, term);
                return null;
        }
    }

    /**
     * Invokes the system's planner to create a sequence of steps to achieve a goal.
     * @param {string} goalString - The Narsese string for the goal.
     * @returns {Promise<object|null>} A plan object or null if planning fails.
     */
    async createPlan(goalString) {
        return await errorHandler.safeAsync(async () => {
            const goalTerm = parseTerm(goalString);
            if (!goalTerm) {
                warn(`Could not parse goal string: ${goalString}`);
                return null;
            }

            const goalTask = new Task(goalTerm, '!');
            const plan = await this.system.reasoner.planner.createPlan(goalTask);

            if (!plan || plan.steps.length === 0) {
                warn(`No plan could be created for goal: ${goalString}`);
                return null;
            }
            return plan;
        }, `createPlan for goal: ${goalString}`, null);
    }
}

export default Agent;
