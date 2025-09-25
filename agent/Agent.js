import {agentErrorHandler as errorHandler, createSystem, debug, parseTerm, Task, warn} from '@project/core';
import MCP from './MCP.js';

const termToActionParsers = {
    Atomic: (term) => ({tool: term.key, parameters: []}),
    SequentialConjunction: (term) => {
        const [nameTerm, ...paramTerms] = term.terms;
        return nameTerm ? {
            tool: nameTerm.key,
            parameters: paramTerms.map(t => t.key.replace(/"/g, ''))
        } : null;
    },
    Conjunction: (term) => termToActionParsers.SequentialConjunction(term),
};

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
                this.system.eventBus.on('add_task', (task) => {
                    this.mcp.log({type: 'task_added', content: task, timestamp: new Date().toISOString()});
                });
                
                this.system.eventBus.on('add_belief', (task) => {
                    this.mcp.log({type: 'belief_added', content: task, timestamp: new Date().toISOString()});
                });
                
                this.system.eventBus.on('add_goal', (task) => {
                    this.mcp.log({type: 'goal_added', content: task, timestamp: new Date().toISOString()});
                });
                
                this.system.eventBus.on('add_question', (task) => {
                    this.mcp.log({type: 'question_added', content: task, timestamp: new Date().toISOString()});
                });
            }
            
            debug('Agent initialized successfully.');
        }, 'initialize');
    }

    addTool(tool) {
        if (!this.isInitialized) throw new Error('Agent must be initialized before adding tools.');
        if (!tool || !tool.name || typeof tool.handler !== 'function') {
            throw new Error('Tool must be an object with a name and a handler function.');
        }
        this.tools[tool.name] = tool;
        this.system.actionExecutor.registerActionHandler(tool.name, tool.handler);
        debug(`Tool registered: ${tool.name}`);
    }

    async decideNextAction(goalString) {
        if (!this.isInitialized) throw new Error('Agent not initialized.');
        debug('Deciding next action for goal:', goalString);

        const plan = await this.createPlan(goalString);
        if (!plan?.steps.length) {
            debug('No actionable plan found.');
            return null;
        }

        const action = this._parseTermToAction(plan.steps[0]);
        debug('Next action determined:', action);
        return action;
    }

    async executeAction(action) {
        const tool = this.tools[action.tool];
        if (!tool) throw new Error(`Tool not found: ${action.tool}`);

        const {handler, parameters: toolParamsDef} = tool;
        const paramNames = Object.keys(toolParamsDef?.properties || {});
        const params = Object.fromEntries(
            paramNames.map((paramName, i) => [paramName, action.parameters[i]])
        );

        return handler(params);
    }

    _parseTermToAction(term) {
        if (!term) return null;

        const parser = termToActionParsers[term.type];
        if (parser) {
            return parser(term);
        }

        warn(`Cannot parse term of type '${term.type}' to an action:`, term);
        return null;
    }

    async createPlan(goalString) {
        return errorHandler.execute(async () => {
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

    start() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before starting.');
        }
        this.system?.start?.();
        if (!this.system?.start) {
            debug('System does not have a start method.');
        }
    }

    stop() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before stopping.');
        }
        this.system?.stop?.();
        if (!this.system?.stop) {
            debug('System does not have a stop method.');
        }
    }

    async reset() {
        this.system?.stop?.();
        await this.initialize();
    }

    // Methods to access agent's memory and tasks for UI integration
    getBeliefs() {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            return [];
        }
        return this.system.memory.getBeliefs() || [];
    }

    getGoals() {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            return [];
        }
        return this.system.memory.getGoals() || [];
    }

    getQuestions() {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            return [];
        }
        return this.system.memory.getQuestions() || [];
    }

    getAllTasks() {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            return [];
        }
        return this.system.memory.getAllTasks() || [];
    }

    getRecentTasks(count = 10) {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            return [];
        }
        return this.system.memory.getRecentTasks(count) || [];
    }
}

export default Agent;