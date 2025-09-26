import { debug, error as logError, warn, info } from '../../core/utils/logger.js';

/**
 * API module for the WebUI that handles all API endpoints
 */
class WebUIAPI {
    constructor(agent) {
        this.agent = agent;
    }

    /**
     * Get system status
     */
    getStatus() {
        const system = this.agent?.system;
        return {
            isRunning: system?.isRunning || false,
            cycleCount: system?.cycleCount || 0,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get all tasks
     */
    getTasks() {
        if (this.agent?.getAllTasks) {
            return this.agent.getAllTasks() || [];
        }
        return [];
    }

    /**
     * Get memory state
     */
    getMemoryState() {
        return {
            beliefs: this.getBeliefs(),
            goals: this.getGoals(),
            questions: this.getQuestions()
        };
    }

    /**
     * Get beliefs
     */
    getBeliefs() {
        if (this.agent?.getBeliefs) {
            return this.agent.getBeliefs() || [];
        }
        return [];
    }

    /**
     * Get goals
     */
    getGoals() {
        if (this.agent?.getGoals) {
            return this.agent.getGoals() || [];
        }
        return [];
    }

    /**
     * Get questions
     */
    getQuestions() {
        if (this.agent?.getQuestions) {
            return this.agent.getQuestions() || [];
        }
        return [];
    }

    /**
     * Add a new task
     */
    async addTask(content, type = 'task') {
        if (!content) {
            throw new Error('Content is required');
        }

        if (!this.agent) {
            throw new Error('Agent not available');
        }

        if (!this.agent.system) {
            throw new Error('Agent system not available');
        }

        // Parse the content into a term and create a task
        const { parseTerm, Task } = await import('../../core/index.js');
        const term = parseTerm(content);
        
        if (!term) {
            throw new Error(`Could not parse task content: ${content}`);
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

        // Create and add the task to the system
        const task = new Task(term, punctuation);
        await this.agent.system.addTasks([task]);
        
        info(`Task added via API: ${content} with punctuation: ${punctuation}`);
        
        return { success: true, message: 'Task added successfully', task: { content, type: punctuation } };
    }

    /**
     * Add a new belief
     */
    async addBelief(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        if (!this.agent) {
            throw new Error('Agent not available');
        }

        if (!this.agent.system) {
            throw new Error('Agent system not available');
        }

        // Parse the content into a term and create a belief
        const { parseTerm, Task } = await import('../../core/index.js');
        const term = parseTerm(content);
        
        if (!term) {
            throw new Error(`Could not parse belief content: ${content}`);
        }

        // Create a belief task with '.' punctuation
        const task = new Task(term, '.');
        await this.agent.system.addTasks([task]);
        
        info(`Belief added via API: ${content}`);
        
        return { success: true, message: 'Belief added successfully', belief: { content } };
    }

    /**
     * Add a new goal
     */
    async addGoal(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        if (!this.agent) {
            throw new Error('Agent not available');
        }

        if (!this.agent.system) {
            throw new Error('Agent system not available');
        }

        // Parse the content into a term and create a goal
        const { parseTerm, Task } = await import('../../core/index.js');
        const term = parseTerm(content);
        
        if (!term) {
            throw new Error(`Could not parse goal content: ${content}`);
        }

        // Create a goal task with '!' punctuation
        const task = new Task(term, '!');
        await this.agent.system.addTasks([task]);
        
        info(`Goal added via API: ${content}`);
        
        return { success: true, message: 'Goal added successfully', goal: { content } };
    }

    /**
     * Add a new question
     */
    async addQuestion(content) {
        if (!content) {
            throw new Error('Content is required');
        }

        if (!this.agent) {
            throw new Error('Agent not available');
        }

        if (!this.agent.system) {
            throw new Error('Agent system not available');
        }

        // Parse the content into a term and create a question
        const { parseTerm, Task } = await import('../../core/index.js');
        const term = parseTerm(content);
        
        if (!term) {
            throw new Error(`Could not parse question content: ${content}`);
        }

        // Create a question task with '?' punctuation
        const task = new Task(term, '?');
        await this.agent.system.addTasks([task]);
        
        info(`Question added via API: ${content}`);
        
        return { success: true, message: 'Question added successfully', question: { content } };
    }
}

export default WebUIAPI;