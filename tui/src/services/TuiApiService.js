import SharedAPI from '../../../common/services/SharedAPI.js';
import {MESSAGE_TYPES} from '../../../common/constants/communication.js';
import logger from '../../../common/services/Logger.js';

/**
 * API module for the TUI that handles communication with the agent via WebSocket
 * Extends the SharedAPI to provide TUI-specific functionality while maintaining consistency
 */
class TuiApiService extends SharedAPI {
    constructor(agentService) {
        super(null); // Don't pass agent instance since we'll use WebSocket
        this.agentService = agentService;
        this.logger = logger.createNamespace('TuiApiService');

        // Store local state that we get from WebSocket updates
        this.localState = {
            isRunning: false,
            beliefs: [],
            goals: [],
            questions: [],
            tasks: []
        };
    }

    /**
     * Initialize the TUI API service with WebSocket event listeners
     */
    initialize() {
        // Listen for system state updates from agent service
        this.agentService.on(MESSAGE_TYPES.AGENT_STATE_UPDATE, (state) => {
            this.localState = {
                ...this.localState,
                ...state
            };
            this.logger.debug('Agent state updated via WebSocket:', state);
        });

        // Listen for system stats updates
        this.agentService.on(MESSAGE_TYPES.SYSTEM_STATS, (stats) => {
            this.localState = {
                ...this.localState,
                ...stats
            };
            this.logger.debug('System stats updated via WebSocket:', stats);
        });

        // Listen for task updates
        this.agentService.on('add_belief', (belief) => {
            this.localState.beliefs = [...this.localState.beliefs, belief];
            this.logger.debug('Belief added:', belief);
        });

        this.agentService.on('add_goal', (goal) => {
            this.localState.goals = [...this.localState.goals, goal];
            this.logger.debug('Goal added:', goal);
        });

        this.agentService.on('add_question', (question) => {
            this.localState.questions = [...this.localState.questions, question];
            this.logger.debug('Question added:', question);
        });

        this.agentService.on('task_added', (task) => {
            this.localState.tasks = [...this.localState.tasks, task];
            this.logger.debug('Task added:', task);
        });
    }

    /**
     * Get system status via WebSocket
     */
    async getStatus() {
        const response = await this._sendAndWaitForResponse('get_system_stats', {});
        return {
            isRunning: response?.isRunning || this.localState.isRunning || false,
            cycleCount: response?.cycleCount || this.localState.cycleCount || 0,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get all tasks via WebSocket
     */
    async getTasks() {
        const response = await this._sendAndWaitForResponse('get_tasks', {});
        return response?.tasks || this.localState.tasks || [];
    }

    /**
     * Get memory state via WebSocket
     */
    async getMemoryState() {
        const [tasks, beliefs, goals, questions] = await Promise.all([
            this.getTasks(),
            this.getBeliefs(),
            this.getGoals(),
            this.getQuestions()
        ]);

        return {
            beliefs,
            goals,
            questions,
            tasks
        };
    }

    /**
     * Get beliefs via WebSocket
     */
    async getBeliefs() {
        // In WebSocket-based approach, get from system stats or search
        const tasks = await this.getTasks();
        return tasks.filter(task => task.punctuation === '.');
    }

    /**
     * Get goals via WebSocket
     */
    async getGoals() {
        // In WebSocket-based approach, get from system stats or search
        const tasks = await this.getTasks();
        return tasks.filter(task => task.punctuation === '!');
    }

    /**
     * Get questions via WebSocket
     */
    async getQuestions() {
        // In WebSocket-based approach, get from system stats or search
        const tasks = await this.getTasks();
        return tasks.filter(task => task.punctuation === '?');
    }

    /**
     * Add a new task via WebSocket
     */
    async addTask(content, type = 'question') {
        if (!content) {
            throw new Error('Content is required');
        }

        // Determine punctuation based on task type
        let punctuation = '?'; // Default to question
        if (type) {
            if (type.toLowerCase().includes('belief') || type.toLowerCase() === 'b') {
                punctuation = '.';
            } else if (type.toLowerCase().includes('goal') || type.toLowerCase() === 'g') {
                punctuation = '!';
            } else if (type.toLowerCase().includes('question') || type.toLowerCase() === 'q') {
                punctuation = '?';
            }
        }

        // Send as narsese content with appropriate punctuation
        const narsese = content + punctuation;

        const response = await this._sendAndWaitForResponse('narsese', narsese);
        return response || {success: true, message: 'Task added successfully', task: {content, type: punctuation}};
    }

    /**
     * Add a new belief via WebSocket
     */
    async addBelief(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        // Ensure it ends with a period for belief
        const narsese = content.endsWith('.') ? content : content + '.';
        const response = await this._sendAndWaitForResponse('narsese', narsese);
        return response || {success: true, message: 'Belief added successfully', belief: {content}};
    }

    /**
     * Add a new goal via WebSocket
     */
    async addGoal(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        // Ensure it ends with an exclamation for goal
        const narsese = content.endsWith('!') ? content : content + '!';
        const response = await this._sendAndWaitForResponse('narsese', narsese);
        return response || {success: true, message: 'Goal added successfully', goal: {content}};
    }

    /**
     * Add a new question via WebSocket
     */
    async addQuestion(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        // Ensure it ends with a question mark
        const narsese = content.endsWith('?') ? content : content + '?';
        const response = await this._sendAndWaitForResponse('narsese', narsese);
        return response || {success: true, message: 'Question added successfully', question: {content}};
    }

    /**
     * Interpret Narsese content and add via WebSocket
     */
    async interpretNarsese(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        const response = await this._sendAndWaitForResponse('narsese', content);
        return response || {success: true, message: 'Narsese interpreted successfully', content};
    }

    /**
     * Send a message via WebSocket and wait for response
     * Note: This is a simplified implementation - in a real system, you'd want to handle
     * request-response mapping with unique IDs and timeouts
     */
    _sendAndWaitForResponse(type, payload, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const messageId = `${type}-${Date.now()}`;
            let resolved = false;

            // Set up response listener
            const responseHandler = (response) => {
                if (!resolved) {
                    resolved = true;
                    this.agentService.off(`${type}_response`, responseHandler);
                    clearTimeout(timer);
                    resolve(response);
                }
            };

            // Set up timeout
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    this.agentService.off(`${type}_response`, responseHandler);
                    reject(new Error(`Request ${type} timed out after ${timeout}ms`));
                }
            }, timeout);

            // Listen for response
            this.agentService.on(`${type}_response`, responseHandler);

            // Send the request
            this.agentService.sendMessage(type, payload);
        });
    }
}

export default TuiApiService;