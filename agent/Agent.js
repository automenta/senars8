import {createCore} from '../core/index.js';
import MCP from './MCP.js';
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
            this.system = await createCore(this.config);
            this.isInitialized = true;

            // Set up event listeners for real-time UI updates
            ['task', 'belief', 'goal', 'question'].forEach(eventType => {
                this.system.on(`task:add`, task => {
                    if (task.type === eventType) {
                        this.mcp.log({
                            type: `${eventType}_added`,
                            content: task,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            });
        }, 'initialize');
    }

    addTool(tool) {
        agentHandler.requireInitialized(this);
        agentHandler.validate(tool?.name && typeof tool.handler === 'function',
            'Tool must have name and handler function');

        this.tools[tool.name] = tool;
        
        // CoreAgent system - store the handler for action execution
        if (!this.system.actionHandlers) this.system.actionHandlers = new Map();
        this.system.actionHandlers.set(tool.name, tool.handler);
    }

    async decideNextAction(goalString) {
        agentHandler.requireInitialized(this);

        const plan = await this.createPlan(goalString);
        return plan?.length > 0 ? plan[0] : null;
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

    async createPlan(goalString) {
        return agentHandler.execute(async () => {
            // Create a goal task for CoreAgent
            const goalTask = { 
                id: `goal_${Date.now()}`,
                content: goalString,
                type: 'goal',
                priority: 0.9
            };
            
            // Use CoreAgent's reasoning process
            const result = await this.system.request('reasoner:processTask', { 
                focusSet: [goalTask] 
            });
            
            return result ? [result] : [];
        }, `createPlan: ${goalString}`);
    }

    start() {
        agentHandler.requireInitialized(this);
        this.system.start();
    }

    stop() {
        agentHandler.requireInitialized(this);
        this.system.stop();
    }

    async reset() {
        this.system.stop();
        await this.initialize();
    }

    getAgentState() {
        if (!this.isInitialized || !this.system.memory) {
            return {tasks: [], beliefs: [], goals: [], questions: []};
        }

        return agentHandler.runSync(() => {
            const allTasks = Array.from(this.system.memory.tasks?.values?.() || []);
            return {
                tasks: allTasks,
                beliefs: allTasks.filter(t => t.type === 'belief'),
                goals: allTasks.filter(t => t.type === 'goal'),
                questions: allTasks.filter(t => t.type === 'question'),
            };
        }, 'getAgentState', {defaultValue: {tasks: [], beliefs: [], goals: [], questions: []}});
    }
}

export default Agent;