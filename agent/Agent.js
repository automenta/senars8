import {createSystem} from '../core/index.js';
import {parseTerm} from '../core/parser/parse-utils.js';
import Task from '../core/core/Task.js';
import MCP from './MCP.js';
import {parseTermToAction} from './utils/index.js';
import {agentHandler} from './utils/errorHandler.js';
import logger from '../core/utils/logger.js';

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
        return agentHandler.execute(async () => {
            this.system = await createSystem(this.config);
            this.isInitialized = true;

            // Set up event listeners for real-time UI updates
            if (this.system.eventBus) {
                ['task', 'belief', 'goal', 'question'].forEach(eventType => {
                    this.system.eventBus.on(`add_${eventType}`, task =>
                        this.mcp.log({
                            type: `${eventType}_added`,
                            content: task,
                            timestamp: new Date().toISOString()
                        })
                    );
                });
            }
        }, 'initialize');
    }

    addTool(tool) {
        agentHandler.requireInitialized(this);
        agentHandler.validate(tool?.name && typeof tool.handler === 'function',
            'Tool must have name and handler function');

        this.tools[tool.name] = tool;
        this.system.actionExecutor.registerActionHandler(tool.name, tool.handler);
    }

    async decideNextAction(goalString) {
        agentHandler.requireInitialized(this);

        const plan = await this.createPlan(goalString);
        return plan?.steps?.length ? this._parseTermToAction(plan.steps[0]) : null;
    }

    async executeAction(action) {
        const tool = this.tools[action.tool];
        agentHandler.validate(tool, `Tool not found: ${action.tool}`);

        const params = this._buildToolParameters(tool, action.parameters);
        return tool.handler(params);
    }

    _buildToolParameters(tool, actionParams) {
        const paramNames = Object.keys(tool.parameters?.properties || {});
        return Object.fromEntries(
            paramNames.map((paramName, i) => [paramName, actionParams[i]])
        );
    }

    _parseTermToAction(term) {
        return parseTermToAction(term, agentLogger);
    }

    async createPlan(goalString) {
        return agentHandler.execute(async () => {
            const goalTerm = parseTerm(goalString);
            if (!goalTerm) return null;

            const goalTask = new Task(goalTerm, '!');
            const plan = await this.system.reasoner.planner.createPlan(goalTask);

            return plan?.steps?.length ? plan : null;
        }, `createPlan: ${goalString}`);
    }

    start() {
        agentHandler.requireInitialized(this);
        this.system?.start?.();
    }

    stop() {
        agentHandler.requireInitialized(this);
        this.system?.stop?.();
    }

    async reset() {
        this.system?.stop?.();
        await this.initialize();
    }

    getAgentState() {
        if (!this.isInitialized || !this.system?.memory) {
            return {tasks: [], beliefs: [], goals: [], questions: []};
        }

        return agentHandler.runSync(() => {
            const {memory} = this.system;
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