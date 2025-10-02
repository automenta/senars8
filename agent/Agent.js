import {agentErrorHandler as errorHandler, createSystem} from '../core/index.js';
import {parseTerm} from '../core/parser/parse-utils.js';
import Task from '../core/core/Task.js';
import logger from '../core/utils/logger.js';
import MCP from './MCP.js';
import {parseTermToAction} from './utils/index.js';

const agentLogger = logger.create('Agent');

class Agent {
    constructor(config = {}) {
        this.system = null;
        this.config = config;
        this.isInitialized = false;
        this.mcp = new MCP(this);
        this.tools = {};
    }

    async initialize() {
        if (this.isInitialized) return;
        return errorHandler.execute(async () => {
            this.system = await createSystem(this.config);
            this.isInitialized = true;

            // Set up event listeners for real-time UI updates
            if (this.system.eventBus) {
                const eventTypes = ['task', 'belief', 'goal', 'question'];
                for (const eventType of eventTypes) {
                    this.system.eventBus.on(`add_${eventType}`, (task) => {
                        this.mcp.log({
                            type: `${eventType}_added`,
                            content: task,
                            timestamp: new Date().toISOString()
                        });
                    });
                }
            }

            agentLogger.debug('Agent initialized successfully.');
        }, 'initialize');
    }

    addTool(tool) {
        if (!this.isInitialized) throw new Error('Agent must be initialized before adding tools.');
        if (!tool || !tool.name || typeof tool.handler !== 'function') {
            throw new Error('Tool must be an object with a name and a handler function.');
        }
        this.tools[tool.name] = tool;
        this.system.actionExecutor.registerActionHandler(tool.name, tool.handler);
        agentLogger.debug(`Tool registered: ${tool.name}`);
    }

    async decideNextAction(goalString) {
        if (!this.isInitialized) throw new Error('Agent not initialized.');
        agentLogger.debug('Deciding next action for goal:', goalString);

        const plan = await this.createPlan(goalString);
        if (!plan?.steps.length) {
            agentLogger.debug('No actionable plan found.');
            return null;
        }

        const action = this._parseTermToAction(plan.steps[0]);
        agentLogger.debug('Next action determined:', action);
        return action;
    }

    async executeAction(action) {
        const tool = this.tools[action.tool];
        if (!tool) throw new Error(`Tool not found: ${action.tool}`);

        const params = this._buildToolParameters(tool, action.parameters);
        return tool.handler(params);
    }

    _buildToolParameters(tool, actionParams) {
        const toolParamsDef = tool.parameters;
        const paramNames = Object.keys(toolParamsDef?.properties || {});
        return Object.fromEntries(
            paramNames.map((paramName, i) => [paramName, actionParams[i]])
        );
    }

    _parseTermToAction(term) {
        return parseTermToAction(term, agentLogger);
    }

    async createPlan(goalString) {
        return errorHandler.execute(async () => {
            const goalTerm = parseTerm(goalString);
            if (!goalTerm) {
                agentLogger.warn(`Could not parse goal string: ${goalString}`);
                return null;
            }

            const goalTask = new Task(goalTerm, '!');
            const plan = await this.system.reasoner.planner.createPlan(goalTask);

            if (!plan || plan.steps.length === 0) {
                agentLogger.warn(`No plan could be created for goal: ${goalString}`);
                return null;
            }
            return plan;
        }, `createPlan for goal: ${goalString}`, null);
    }

    start() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before starting.');
        }
        this.system?.start?.();
        if (!this.system?.start) {
            agentLogger.debug('System does not have a start method.');
        }
    }

    stop() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before stopping.');
        }

        // Then stop the main system
        this.system?.stop?.();
        if (!this.system?.stop) {
            agentLogger.debug('System does not have a stop method.');
        }
    }

    async reset() {
        this.system?.stop?.();
        await this.initialize();
    }

    /**
     * Get the current state of the agent's memory for UI integration.
     * This provides a single, efficient entry point for accessing agent state.
     * @returns {Object} An object containing tasks, beliefs, goals, and questions.
     */
    getAgentState() {
        if (!this.isInitialized || !this.system?.memory) {
            agentLogger.debug('Cannot access agent state: Agent not initialized or no system memory.');
            return {tasks: [], beliefs: [], goals: [], questions: []};
        }

        return errorHandler.runSync(() => {
            const memory = this.system.memory;
            return {
                tasks: memory.getAllTasks?.() || [],
                beliefs: memory.getBeliefs?.() || [],
                goals: memory.getGoals?.() || [],
                questions: memory.getQuestions?.() || [],
            };
        }, 'getAgentState', {defaultValue: {tasks: [], beliefs: [], goals: [], questions: []}});
    }
}

export default Agent;