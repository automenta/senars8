/**
 * Agent Integration Service
 * Provides a high-level interface between the UI and the backend agent service
 */

import agentService from './agentService.js';
import log from '@common/utils/logger';

class AgentIntegrationService {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;

        // Maintain local state for UI performance
        this.localState = {
            beliefs: [],
            goals: [],
            questions: [],
            tasks: [],
            recentEvents: []
        };

        // Bind event handlers
        this._handleAgentEvent = this._handleAgentEvent.bind(this);
    }

    /**
     * Initialize the agent integration and setup event listeners
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            // Subscribe to relevant agent events
            agentService.on('agentStateUpdate', this._handleAgentEvent);
            agentService.on('knowledge_graph_update', this._handleAgentEvent);
            agentService.on('reasoning_trace', this._handleAgentEvent);
            agentService.on('task_update', this._handleAgentEvent);
            agentService.on('search_results', this._handleAgentEvent);

            this.isInitialized = true;
            log.info('Agent integration initialized successfully');
        })();

        return this.initializationPromise;
    }

    /**
     * Event handler for agent updates
     */
    _handleAgentEvent(payload, eventType) {
        try {
            switch (eventType) {
                case 'agentStateUpdate':
                    // Update local state when agent state changes
                    this.localState = {
                        ...this.localState,
                        ...payload
                    };
                    break;

                case 'knowledge_graph_update':
                    // Update knowledge graph data
                    this.localState.beliefs = payload.beliefs || this.localState.beliefs;
                    break;

                case 'reasoning_trace':
                    // Add to recent events
                    this.localState.recentEvents = [
                        {type: 'reasoning', data: payload, timestamp: Date.now()},
                        ...this.localState.recentEvents.slice(0, 49) // Keep only last 50 events
                    ];
                    break;

                case 'task_update':
                    // Update tasks
                    this.localState.tasks = payload.tasks || this.localState.tasks;
                    break;

                case 'search_results':
                    // Add search results to recent events
                    this.localState.recentEvents = [
                        {type: 'search', data: payload, timestamp: Date.now()},
                        ...this.localState.recentEvents.slice(0, 49)
                    ];
                    break;
            }
        } catch (error) {
            log.error('Error handling agent event:', error);
        }
    }

    /**
     * Process a NARS statement through the agent
     */
    async processNarsese(narsese) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Validate input
            if (!narsese || typeof narsese !== 'string' || narsese.trim().length === 0) {
                throw new Error('Narsese input is required and must be a non-empty string');
            }

            // Validate Narsese syntax using core parser
            const validation = this.validateNarseseSyntax(narsese);
            if (!validation.valid) {
                throw new Error(`Invalid Narsese syntax: ${validation.error}`);
            }

            // Send the narsese to the backend agent
            const result = agentService.sendNarsese(narsese);

            // Log successful processing
            log.debug(`Narsese sent to agent: ${narsese}`);

            return result;
        } catch (error) {
            log.error('Error processing narsese:', error);
            throw error;
        }
    }

    /**
     * Validate Narsese syntax using core parser
     */
    validateNarseseSyntax(narsese) {
        try {
            // This would integrate with the core parser
            // For now, we'll implement basic validation
            const trimmed = narsese.trim();
            if (!trimmed) return {valid: false, error: 'Empty statement'};

            // Check if it ends with a valid punctuation
            if (!trimmed.endsWith('.') && !trimmed.endsWith('!') && !trimmed.endsWith('?')) {
                return {valid: false, error: 'Must end with . (belief), ! (goal), or ? (question)'};
            }

            // Check for basic Narsese structure
            const hasTermStructure = /<[^<>]+-->/g.test(trimmed) ||
                /(&&|<->|==>)/g.test(trimmed) ||
                /\(.*\)/g.test(trimmed);

            if (hasTermStructure) {
                return {valid: true, error: null};
            } else {
                return {valid: false, error: 'Does not match Narsese syntax patterns'};
            }
        } catch (error) {
            return {valid: false, error: error.message};
        }
    }

    /**
     * Process natural language input through the agent
     */
    async processNaturalLanguage(text, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Validate input
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                throw new Error('Natural language input is required and must be a non-empty string');
            }

            // Send natural language to the backend agent
            const result = agentService.sendNaturalLanguage(text, options.intent);

            log.debug(`Natural language sent to agent: ${text}`);

            return result;
        } catch (error) {
            log.error('Error processing natural language:', error);
            throw error;
        }
    }

    /**
     * Get the current state from the agent
     */
    getAgentState() {
        if (!this.isInitialized) {
            throw new Error('Agent integration not initialized');
        }

        return agentService.getAgentState();
    }

    /**
     * Send a control command to the agent
     */
    sendAgentCommand(command, parameters = {}) {
        if (!this.isInitialized) {
            throw new Error('Agent integration not initialized');
        }

        try {
            // Validate command
            if (!command || typeof command !== 'string') {
                throw new Error('Command is required and must be a string');
            }

            const validCommands = ['start', 'stop', 'reset', 'pause', 'resume'];
            if (!validCommands.includes(command.toLowerCase())) {
                throw new Error(`Invalid command: ${command}. Valid commands are: ${validCommands.join(', ')}`);
            }

            return agentService.sendAgentControl(command);
        } catch (error) {
            log.error('Error executing agent command:', error);
            throw error;
        }
    }

    /**
     * Get agent statistics and information
     */
    getAgentInfo() {
        if (!this.isInitialized) {
            throw new Error('Agent integration not initialized');
        }

        return {
            isInitialized: true, // Agent service exists
            isActive: agentService.isAgentRunning(),
            beliefsCount: agentService.getBeliefsCount(),
            goalsCount: agentService.getGoalsCount(),
            questionsCount: agentService.getQuestionsCount(),
            cycleCount: agentService.getCycleCount(),
            timestamp: Date.now(),
            // Add more detailed statistics for UI
            memorySize: this.localState.beliefs.length + this.localState.goals.length,
            recentEventsCount: this.localState.recentEvents.length,
            tasksCount: this.localState.tasks.length
        };
    }

    /**
     * Search for beliefs, goals, or tasks
     */
    async search(query, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            if (!query || typeof query !== 'string' || query.trim().length === 0) {
                throw new Error('Search query is required');
            }

            return agentService.search(query, options);
        } catch (error) {
            log.error('Error performing search:', error);
            throw error;
        }
    }

    /**
     * Get all beliefs from the agent
     */
    async getBeliefs() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // This should eventually retrieve from the agent service
        // For now, return empty array; we'll populate from events
        return [...this.localState.beliefs];
    }

    /**
     * Get all goals from the agent
     */
    async getGoals() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return [...this.localState.goals];
    }

    /**
     * Get all questions from the agent
     */
    async getQuestions() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return [...this.localState.questions];
    }

    /**
     * Get all tasks from the agent
     */
    async getAllTasks() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return agentService.getTasks();
    }

    /**
     * Get recent tasks
     */
    async getRecentTasks(count = 10) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const allTasks = await this.getAllTasks();
        return allTasks.slice(0, count);
    }

    /**
     * Get reasoning trace from the agent
     */
    async getReasoningTrace(options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // This would make a specific request to get reasoning trace
        // For now, return recent events that may contain reasoning info
        return this.localState.recentEvents
            .filter(event => event.type === 'reasoning')
            .slice(0, options.limit || 10);
    }

    /**
     * Get knowledge graph data
     */
    async getKnowledgeGraphData() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return {
            nodes: this.localState.beliefs.map(belief => ({
                id: belief.id || belief.termKey,
                label: belief.term ? belief.term.toString() : belief.termKey,
                type: 'belief',
                priority: belief.priority
            })),
            edges: [] // Would need to compute relationships from beliefs
        };
    }

    /**
     * Add a new task to the agent
     */
    async addTask(taskData) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!taskData || typeof taskData !== 'object') {
            throw new Error('Task data must be an object');
        }

        return agentService.addTask(taskData);
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId, updates) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!taskId) {
            throw new Error('Task ID is required');
        }

        if (!updates || typeof updates !== 'object') {
            throw new Error('Updates must be an object');
        }

        return agentService.updateTask(taskId, updates);
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!taskId) {
            throw new Error('Task ID is required');
        }

        return agentService.deleteTask(taskId);
    }

    /**
     * Get recent events from the agent
     */
    getRecentEvents(count = 20) {
        return this.localState.recentEvents.slice(0, count);
    }

    /**
     * Get connection statistics
     */
    getConnectionStats() {
        if (!this.isInitialized) {
            throw new Error('Agent integration not initialized');
        }

        return agentService.getConnectionStats();
    }

    // Check if agent integration is initialized
    getInitializedStatus() {
        return this.isInitialized;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        if (this.isInitialized) {
            // Remove event listeners
            agentService.off('agentStateUpdate', this._handleAgentEvent);
            agentService.off('knowledge_graph_update', this._handleAgentEvent);
            agentService.off('reasoning_trace', this._handleAgentEvent);
            agentService.off('task_update', this._handleAgentEvent);
            agentService.off('search_results', this._handleAgentEvent);

            this.isInitialized = false;
            log.info('Agent integration disconnected');
        }
    }
}

// Export singleton instance
const agentIntegrationService = new AgentIntegrationService();
export default agentIntegrationService;