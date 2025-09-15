import SystemFactory from '../system/SystemFactory.js';
import {parseTerm} from '../parser/narseseParser.js';
import {handleError} from '../utils/error-handler.js';
import MCP from './MCP.js';
import {debug, warn} from '../utils/logger.js';
import Task from '../core/Task.js';

/**
 * Agent class provides a high-level interface for controlling the SeNARS system.
 * It encapsulates system initialization, action registration, and goal management,
 * and interacts with its environment via the Model Context Protocol (MCP).
 */
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
     * Initializes the agent and the underlying SeNARS system.
     * This method must be called before any other operations.
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            this.system = await SystemFactory.createSystem(this.config);
            this.isInitialized = true;
        } catch (error) {
            handleError(error, 'Failed to initialize agent');
        }
    }

    /**
     * Registers a new tool for the agent to use.
     * @param {object} tool - The tool definition.
     * @param {string} tool.name - The name of the tool.
     * @param {string} tool.description - A description of what the tool does.
     * @param {object} tool.parameters - A description of the tool's parameters.
     * @param {Function} tool.handler - The async function to execute for the action.
     */
    addTool(tool) {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }
        if (!tool.name || !tool.handler) {
            throw new Error('Tool must have a name and a handler.');
        }
        this.tools[tool.name] = tool;
        this.system.actionExecutor.registerActionHandler(tool.name, tool.handler);
    }

    /**
     * The core decision-making loop for the agent, designed to be called by the MCP.
     * It runs reasoning cycles to derive the next best action to achieve a goal.
     * @param {string} goalString - The Narsese string representing the goal.
     * @param {Array} history - The interaction history from the MCP.
     * @returns {Promise<object|null>} A promise that resolves with the decided action or null.
     */
    async decideNextAction(goalString, _history) {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }

        debug('Available tools:', Object.keys(this.tools));
        const plan = await this.createPlan(goalString);
        debug('Created plan:', plan);

        if (plan && plan.steps.length > 0) {
            const nextStepTerm = plan.steps[0];
            const action = this._parseTermToAction(nextStepTerm);
            debug('Next action:', action);
            return action;
        }

        debug('No action decided.');
        return null;
    }

    /**
     * Executes a given action.
     * @param {object} action - The action to execute.
     * @returns {Promise<any>} The result of the action.
     */
    async executeAction(action) {
        const tool = this.tools[action.tool];
        if (!tool) {
            throw new Error(`Tool not found: ${action.tool}`);
        }

        const {
            handler,
            parameters: toolParamsDef
        } = tool;
        if (!toolParamsDef || !toolParamsDef.properties) {
            return await handler({}); // Tool has no parameters
        }

        const paramNames = Object.keys(toolParamsDef.properties);
        const params = action.parameters.reduce((obj, paramValue, index) => {
            const paramName = paramNames[index];
            if (paramName) {
                obj[paramName] = paramValue;
            }
            return obj;
        }, {});

        return await handler(params);
    }

    _parseTermToAction(term) {
        if (!term) {
            return null;
        }
        switch (term.type) {
            case 'Atomic':
                return {
                    tool: term.key,
                    parameters: []
                };
            case 'SequentialConjunction':
            case 'Conjunction':
                if (term.terms.length > 0) {
                    const [nameTerm, ...paramTerms] = term.terms;
                    return {
                        tool: nameTerm.key,
                        parameters: paramTerms.map(t => t.key.replace(/"/g, ''))
                    };
                }
                return null;
            default:
                return null;
        }
    }


    /**
     * Creates a plan to achieve a given goal using the system's planner.
     * @param {string} goalString - The Narsese string representing the goal.
     * @returns {Promise<object|null>} A promise that resolves with a plan or null.
     */
    async createPlan(goalString) {
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
    }
}

export default Agent;
