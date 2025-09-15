import SystemFactory from '../system/SystemFactory.js';
import { parseTerm } from '../parser/narseseParser.js';
import Task from '../core/Task.js';
import { handleError } from '../utils/error-handler.js';
import EventBus from '../system/EventBus.js';
import MCP from './MCP.js';

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
    async decideNextAction(goalString, history) {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }

        console.log('Available tools:', this.tools);
        const plan = await this.createPlan(goalString);
        console.log('Created plan:', plan);

        if (plan && plan.steps.length > 0) {
            // For now, we'll just execute the first step of the plan.
            // A more advanced agent would have a plan execution module.
            console.log('Next action:', plan.steps[0]);
            return plan.steps[0];
        }

        console.log('No action decided.');
        return null;
    }

    /**
     * Executes a given action.
     * @param {object} action - The action to execute.
     * @returns {Promise<any>} The result of the action.
     */
    async executeAction(action) {
        if (!this.tools[action.tool]) {
            throw new Error(`Tool not found: ${action.tool}`);
        }
        const handler = this.tools[action.tool].handler;
        const params = action.parameters.reduce((obj, param, index) => {
            const paramName = Object.keys(this.tools[action.tool].parameters.properties)[index];
            obj[paramName] = param;
            return obj;
        }, {});
        return await handler(params);
    }

    /**
     * Creates a plan to achieve a given goal using a simple forward-chaining planner.
     * @param {string} goalString - The Narsese string representing the goal.
     * @returns {Promise<object|null>} A promise that resolves with a plan or null.
     */
    async createPlan(goalString) {
        const goalTerm = parseTerm(goalString);
        if (!goalTerm) {
            return null;
        }

        const goalAction = goalTerm.terms[0].key;
        const goalParams = goalTerm.terms.slice(1).map(t => t.key.replace(/"/g, ''));

        // For now, we will keep the simple planner for the simple benchmarks.
        // A more advanced planner would be needed for more complex tasks.
        if (this.tools[goalAction]) {
            return {
                goal: goalString,
                steps: [{
                    tool: goalAction,
                    parameters: goalParams,
                }],
            };
        }

        // A more advanced planner would search for a sequence of tools.
        // This is a placeholder for that logic.
        console.warn('Advanced planning not implemented. Falling back to simple planner.');
        return null;
    }
}

export default Agent;
