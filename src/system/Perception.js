const Task = require('../core/Task');
const {createTemporalTask} = require('../utils/temporal-reasoning');

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
            case 'temporal_event':
                return await this.createTemporalEventTask(event);
            case 'communication':
                return await this.createCommunicationTask(event);
            case 'action_feedback':
                return await this.createActionFeedbackTask(event);
            case 'goal_achievement':
                return await this.createGoalAchievementTask(event);
            case 'environmental_change':
                return await this.createEnvironmentalChangeTask(event);
            case 'social_interaction':
                return await this.createSocialInteractionTask(event);
            case 'learning_experience':
                return await this.createLearningExperienceTask(event);
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
     * Creates a temporal event task.
     * @param {object} event - The temporal event.
     * @returns {Task} The created task.
     */
    async createTemporalEventTask(event) {
        const termKey = event.content || `temporal_event_${Date.now()}`;
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

        // Create a temporal task with occurrence time
        return createTemporalTask(
            termKey,
            punctuation,
            truthValue,
            event.occurrenceTime || Date.now(),
            event.endTime || null
        );
    }

    /**
     * Creates a communication task.
     * @param {object} event - The communication event.
     * @returns {Task} The created task.
     */
    async createCommunicationTask(event) {
        const termKey = event.content
            ? `(communication_${event.sender}_to_${event.recipient}_${event.content})`
            : `communication_${Date.now()}`;
        const punctuation = '.'; // Communication is typically a belief
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
     * Creates an action feedback task.
     * @param {object} event - The action feedback event.
     * @returns {Task} The created task.
     */
    async createActionFeedbackTask(event) {
        const termKey = event.action
            ? `(action_feedback_${event.action}_${event.result})`
            : `action_feedback_${Date.now()}`;
        const punctuation = '.'; // Feedback is typically a belief
        const truthValue = {
            frequency: event.success ? 1.0 : 0.0,
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
     * Creates a goal achievement task.
     * @param {object} event - The goal achievement event.
     * @returns {Task} The created task.
     */
    async createGoalAchievementTask(event) {
        const termKey = event.goal
            ? `(goal_achieved_${event.goal})`
            : `goal_achieved_${Date.now()}`;
        const punctuation = '.'; // Achievement is a belief
        const truthValue = {
            frequency: 1.0,
            confidence: event.confidence || 0.95
        };

        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(termKey, punctuation, truthValue);
    }

    /**
     * Creates an environmental change task.
     * @param {object} event - The environmental change event.
     * @returns {Task} The created task.
     */
    async createEnvironmentalChangeTask(event) {
        const termKey = event.description
            ? `(environmental_change_${event.description})`
            : `environmental_change_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.magnitude || 1.0,
            confidence: event.confidence || 0.9
        };

        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        // Environmental changes often have temporal aspects
        return createTemporalTask(
            termKey,
            punctuation,
            truthValue,
            event.time || Date.now(),
            event.endTime || null
        );
    }

    /**
     * Creates a social interaction task.
     * @param {object} event - The social interaction event.
     * @returns {Task} The created task.
     */
    async createSocialInteractionTask(event) {
        const termKey = event.interactionType
            ? `(social_interaction_${event.interactionType}_${event.participants.join('_')})`
            : `social_interaction_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.emotionalIntensity || 0.5,
            confidence: event.confidence || 0.8
        };

        // Bootstrap the term if it doesn't exist
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(termKey, punctuation, truthValue);
    }

    /**
     * Creates a learning experience task.
     * @param {object} event - The learning experience event.
     * @returns {Task} The created task.
     */
    async createLearningExperienceTask(event) {
        const termKey = event.topic
            ? `(learning_experience_${event.topic})`
            : `learning_experience_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.effectiveness || 0.7,
            confidence: event.confidence || 0.85
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

    /**
     * Processes natural language input and converts it to tasks.
     * @param {string} text - The natural language text.
     * @returns {Array} Array of tasks derived from the text.
     */
    async processNaturalLanguage(text) {
        // Use the LM to parse and understand the text
        const tasks = [];

        try {
            // In a more advanced implementation, we would use the LM to:
            // 1. Parse the text into structured meaning
            // 2. Extract entities, relationships, and intents
            // 3. Generate appropriate tasks based on the analysis

            // For now, we'll use a combination of simple parsing and LM capabilities
            if (text.includes('goal') || text.includes('want') || text.includes('need')) {
                // Use LM to generate a more detailed goal representation
                // const explanation = await this.lm.explain(text, "What is the main goal expressed in this text?");
                const goalTask = new Task(
                    `goal_${text.substring(0, 30)}`,
                    '!',
                    {frequency: 1.0, confidence: 0.8}
                );
                tasks.push(goalTask);
            }

            if (text.includes('question') || text.includes('?')) {
                const questionTask = new Task(
                    `question_${text.substring(0, 30)}`,
                    '?',
                    {frequency: 1.0, confidence: 0.9}
                );
                tasks.push(questionTask);
            }

            if (text.includes('fact') || text.includes('is') || text.includes('are')) {
                // Use LM to extract factual statements
                // const explanation = await this.lm.explain(text, "What factual information is contained in this text?");
                const beliefTask = new Task(
                    `fact_${text.substring(0, 30)}`,
                    '.',
                    {frequency: 0.9, confidence: 0.8}
                );
                tasks.push(beliefTask);
            }

            // Bootstrap terms for all tasks
            for (const task of tasks) {
                if (!this.memory.getTerm(task.termKey)) {
                    const term = await this.lm.bootstrapTerm(task.termKey);
                    this.memory.addTerm(term);
                }
            }

            return tasks;
        } catch (error) {
            console.error('Error processing natural language:', error);
            // Fall back to simple keyword-based parsing
            return await this.processNaturalLanguageSimple(text);
        }
    }

    /**
     * Simple keyword-based natural language processing (fallback).
     * @param {string} text - The natural language text.
     * @returns {Array} Array of tasks derived from the text.
     */
    async processNaturalLanguageSimple(text) {
        const tasks = [];

        // Simple keyword-based parsing for demonstration
        if (text.includes('goal') || text.includes('want') || text.includes('need')) {
            const goalTask = new Task(
                `nl_goal_${text.substring(0, 20)}`,
                '!',
                {frequency: 1.0, confidence: 0.8}
            );
            tasks.push(goalTask);
        }

        if (text.includes('question') || text.includes('?')) {
            const questionTask = new Task(
                `nl_question_${text.substring(0, 20)}`,
                '?',
                {frequency: 1.0, confidence: 0.9}
            );
            tasks.push(questionTask);
        }

        if (text.includes('fact') || text.includes('is') || text.includes('are')) {
            const beliefTask = new Task(
                `nl_fact_${text.substring(0, 20)}`,
                '.',
                {frequency: 0.9, confidence: 0.8}
            );
            tasks.push(beliefTask);
        }

        // Bootstrap terms for all tasks
        for (const task of tasks) {
            if (!this.memory.getTerm(task.termKey)) {
                const term = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(term);
            }
        }

        return tasks;
    }

    /**
     * Processes a stream of sensor data.
     * @param {Array} sensorReadings - Array of sensor readings.
     * @returns {Array} Array of tasks derived from the sensor data.
     */
    async processSensorStream(sensorReadings) {
        const tasks = [];

        // Process each sensor reading
        for (const reading of sensorReadings) {
            const sensorTask = await this.createSensorDataTask({
                sensorType: reading.type,
                value: reading.value,
                accuracy: reading.accuracy,
                time: reading.timestamp
            });
            tasks.push(sensorTask);
        }

        return tasks;
    }

    /**
     * Processes a sequence of events to detect patterns.
     * @param {Array} events - Array of events.
     * @returns {Array} Array of pattern detection tasks.
     */
    async processEventSequence(events) {
        const tasks = [];

        // Look for temporal patterns in the event sequence
        if (events.length > 2) {
            // Simple pattern detection: check if events happen at regular intervals
            const intervals = [];
            for (let i = 1; i < events.length; i++) {
                intervals.push(events[i].timestamp - events[i - 1].timestamp);
            }

            // Calculate average interval
            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

            // Check variance
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            // If low variance, it's a regular pattern
            if (stdDev / avgInterval < 0.2) {
                const patternTask = new Task(
                    `regular_pattern_detected`,
                    '.',
                    {
                        frequency: 0.9,
                        confidence: 1.0 - (stdDev / avgInterval)
                    }
                );
                tasks.push(patternTask);
            }
        }

        // Bootstrap terms for all tasks
        for (const task of tasks) {
            if (!this.memory.getTerm(task.termKey)) {
                const term = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(term);
            }
        }

        return tasks;
    }
}

module.exports = Perception;