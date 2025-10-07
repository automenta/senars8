/**
 * Agent class for CoreAgent system
 * Provides agent functionality using the coreagent architecture
 */

import {System} from '../coreagent/index.js';
import logger from '../coreagent/utils/logger.js';

const log = logger.create('Agent');

/**
 * Agent class that uses CoreAgent system
 */
export class Agent {
    constructor(config = {}) {
        this.config = config;
        this.system = new System(config);
        this.id = config.id || `agent_${Date.now()}`;
        this.status = 'created';
    }

    /**
     * Initialize the agent
     */
    async initialize() {
        log.info(`Initializing agent: ${this.id}`);

        await this.system.initialize();
        this.status = 'initialized';

        log.info(`Agent ${this.id} initialized successfully`);
        return this;
    }

    /**
     * Start the agent
     */
    async start() {
        if (this.status === 'created') {
            await this.initialize();
        }

        log.info(`Starting agent: ${this.id}`);

        await this.system.start();
        this.status = 'running';

        log.info(`Agent ${this.id} started successfully`);
        return this;
    }

    /**
     * Stop the agent
     */
    async stop() {
        log.info(`Stopping agent: ${this.id}`);

        await this.system.stop();
        this.status = 'stopped';

        log.info(`Agent ${this.id} stopped successfully`);
        return this;
    }

    /**
     * Process a task
     */
    async processTask(task) {
        if (this.status !== 'running') {
            throw new Error(`Agent ${this.id} is not running`);
        }

        log.debug(`Processing task for agent ${this.id}:`, task);

        // Use coreagent's reasoning system
        const result = await this.system.core.reasoning._processTask({
            task,
            beliefs: []
        });

        return result;
    }

    /**
     * Add a belief
     */
    async addBelief(content, priority = 0.5) {
        if (this.status !== 'running') {
            throw new Error(`Agent ${this.id} is not running`);
        }

        const {createBelief} = await import('../coreagent/utils.js');
        const belief = createBelief({
            content,
            priority
        });

        this.system.core.memory._addTask(belief);
        return belief;
    }

    /**
     * Add a goal
     */
    async addGoal(content, priority = 0.8) {
        if (this.status !== 'running') {
            throw new Error(`Agent ${this.id} is not running`);
        }

        const {createGoal} = await import('../coreagent/utils.js');
        const goal = createGoal({
            content,
            priority
        });

        this.system.core.memory._addTask(goal);
        return goal;
    }

    /**
     * Query the agent
     */
    async query(question) {
        if (this.status !== 'running') {
            throw new Error(`Agent ${this.id} is not running`);
        }

        log.debug(`Querying agent ${this.id}:`, question);

        // Use coreagent's reasoning system for queries
        const result = await this.system.core.reasoning._processTask({
            task: {type: 'question', content: question},
            beliefs: []
        });

        return result;
    }

    /**
     * Get agent status
     */
    getStatus() {
        return {
            id: this.id,
            status: this.status,
            config: this.config,
            systemStatus: this.system.getStatus()
        };
    }

    /**
     * Send message to agent
     */
    async sendMessage(message) {
        if (this.status !== 'running') {
            throw new Error(`Agent ${this.id} is not running`);
        }

        return await this.system.request('message:handle', message);
    }

    /**
     * Register event handler
     */
    on(event, handler) {
        return this.system.on(event, handler);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        return this.system.emit(event, data);
    }
}