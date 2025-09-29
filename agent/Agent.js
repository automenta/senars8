import {agentErrorHandler as errorHandler, createSystem} from '../core/index.js';
import {parseTerm} from '../core/parser/parse-utils.js';
import Task from '../core/core/Task.js';
import logger from '../common/services/Logger.js';
import MCP from './MCP.js';
import FileMonitoringIntegration from './FileMonitoringIntegration.js';

const agentLogger = logger.createNamespace('Agent');

const termToActionParsers = Object.freeze({
    Atomic: (term) => ({tool: term.key, parameters: []}),
    SequentialConjunction: (term) => {
        const [nameTerm, ...paramTerms] = term.terms;
        return nameTerm ? {
            tool: nameTerm.key,
            parameters: paramTerms.map(t => t.key.replaceAll('"', ''))
        } : null;
    },
    Conjunction: (term) => termToActionParsers.SequentialConjunction(term),
});

class Agent {
    constructor(config = {}) {
        this.system = null;
        this.config = config;
        this.isInitialized = false;
        this.mcp = new MCP(this);
        this.tools = {};
        this.fileMonitoringIntegration = new FileMonitoringIntegration(this, config.fileMonitoring || {});
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

            // Initialize file monitoring integration
            await this.fileMonitoringIntegration.initialize();
            await this.fileMonitoringIntegration.start();

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
        if (!term) return null;

        const parser = termToActionParsers[term.type];
        if (parser) {
            return parser(term);
        }

        agentLogger.warn(`Cannot parse term of type '${term.type}' to an action:`, term);
        return null;
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
        
        // Stop file monitoring first
        this.fileMonitoringIntegration?.stop?.();
        
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

    // File monitoring agent methods
    async addMonitoringPatterns(patterns) {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before adding monitoring patterns.');
        }
        return this.fileMonitoringIntegration.addPatterns(patterns);
    }

    async removeMonitoringPatterns(patterns) {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before removing monitoring patterns.');
        }
        return this.fileMonitoringIntegration.removePatterns(patterns);
    }

    async processFilesNow(filePaths) {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before processing files.');
        }
        return this.fileMonitoringIntegration.processFilesNow(filePaths);
    }

    getFileMonitoringStatistics() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before getting statistics.');
        }
        return this.fileMonitoringIntegration.getStatistics();
    }

    updateFileMonitoringConfig(newConfig) {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before updating configuration.');
        }
        this.fileMonitoringIntegration.updateConfig(newConfig);
    }

    // Methods to access agent's memory and tasks for UI integration
    getBeliefs() {
        return this._getMemoryItems('getBeliefs');
    }

    getGoals() {
        return this._getMemoryItems('getGoals');
    }

    getQuestions() {
        return this._getMemoryItems('getQuestions');
    }

    getAllTasks() {
        return this._getMemoryItems('getAllTasks');
    }

    getRecentTasks(count = 10) {
        return this._getMemoryItems('getRecentTasks', count);
    }

    /**
     * Private helper method to reduce duplication in memory access methods
     * @param {string} methodName - The name of the memory method to call
     * @param {...any} params - Parameters to pass to the memory method
     * @returns {Array} - The result of the memory method call or empty array
     */
    _getMemoryItems(methodName, ...params) {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            agentLogger.debug(`Cannot access memory: ${!this.isInitialized ? 'Agent not initialized' : !this.system ? 'No system' : 'No memory'}`);
            return [];
        }

        const method = this.system.memory[methodName];
        if (typeof method !== 'function') {
            agentLogger.warn(`Memory method '${methodName}' does not exist`);
            return [];
        }

        try {
            return method.call(this.system.memory, ...params) || [];
        } catch (error) {
            agentLogger.warn(`Error calling memory method '${methodName}':`, error.message);
            return [];
        }
    }

    /**
     * Get all task data in one call for efficient access
     * @returns {Object} - Object containing tasks, beliefs, goals, and questions
     */
    getAllTaskData() {
        if (!this.isInitialized || !this.system || !this.system.memory) {
            agentLogger.debug('Cannot access memory: Agent not initialized or no system/memory');
            return {tasks: [], beliefs: [], goals: [], questions: []};
        }

        try {
            const memory = this.system.memory;
            return {
                tasks: memory.getAllTasks?.() || [],
                beliefs: memory.getBeliefs?.() || [],
                goals: memory.getGoals?.() || [],
                questions: memory.getQuestions?.() || []
            };
        } catch (error) {
            agentLogger.warn('Error getting all task data:', error.message);
            return {tasks: [], beliefs: [], goals: [], questions: []};
        }
    }
}

export default Agent;