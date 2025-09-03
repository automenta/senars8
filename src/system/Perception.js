const Task = require('../core/Task');

/**
 * Perception Interface
 * Handles ingestion of new information from the environment.
 */
class Perception {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
    }
    
    /**
     * Processes external events and converts them to tasks.
     * @param {Array} events - Array of events from the environment.
     * @returns {Array} Array of tasks derived from the events.
     */
    async processEvents(events = []) {
        const newTasks = [];
        
        // Process each event
        for (const event of events) {
            try {
                const task = await this.convertEventToTask(event);
                if (task) {
                    newTasks.push(task);
                }
            } catch (error) {
                console.error('Error processing event:', error);
            }
        }
        
        return newTasks;
    }
    
    /**
     * Converts an event to a task.
     * @param {object} event - The event to convert.
     * @returns {Task|null} The created task or null.
     */
    async convertEventToTask(event) {
        if (!event || !event.type) {
            return null;
        }
        
        switch (event.type) {
            case 'observation':
                return await this.createObservationTask(event);
            case 'user_input':
                return await this.createUserInputTask(event);
            case 'sensor_data':
                return await this.createSensorDataTask(event);
            default:
                // Try to create a generic task
                return await this.createGenericTask(event);
        }
    }
    
    /**
     * Creates an observation task.
     * @param {object} event - The observation event.
     * @returns {Task} The created task.
     */
    async createObservationTask(event) {
        const termKey = event.content || `observed_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.confidence || 1.0,
            confidence: event.confidence || 0.9
        };
        
        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }
        
        return new Task(termKey, punctuation, truthValue);
    }
    
    /**
     * Creates a user input task.
     * @param {object} event - The user input event.
     * @returns {Task} The created task.
     */
    async createUserInputTask(event) {
        const termKey = event.content || `user_input_${Date.now()}`;
        const punctuation = '?'; // Questions by default
        const truthValue = {
            frequency: 1.0,
            confidence: 0.8
        };
        
        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }
        
        return new Task(termKey, punctuation, truthValue);
    }
    
    /**
     * Creates a sensor data task.
     * @param {object} event - The sensor data event.
     * @returns {Task} The created task.
     */
    async createSensorDataTask(event) {
        const termKey = event.sensorType 
            ? `(${event.sensorType}_reading_${event.value})` 
            : `sensor_data_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: 1.0,
            confidence: event.accuracy || 0.95
        };
        
        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }
        
        return new Task(termKey, punctuation, truthValue);
    }
    
    /**
     * Creates a generic task from an event.
     * @param {object} event - The event.
     * @returns {Task} The created task.
     */
    async createGenericTask(event) {
        const termKey = event.description || `event_${Date.now()}`;
        const punctuation = event.punctuation || '.';
        const truthValue = {
            frequency: event.frequency || 1.0,
            confidence: event.confidence || 0.9
        };
        
        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }
        
        return new Task(termKey, punctuation, truthValue);
    }
}

module.exports = Perception;