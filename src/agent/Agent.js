import SystemFactory from '../system/SystemFactory.js';
import {parseTerm} from '../parser/narseseParser.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import MCP from './MCP.js';
import {debug, warn} from '../utils/logger.js';
import Task from '../core/Task.js';

const errorHandler = createModuleErrorHandler('Agent');

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
        await errorHandler.safeAsync(async () => {
            this.system = await SystemFactory.createSystem(this.config);
            this.isInitialized = true;
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
