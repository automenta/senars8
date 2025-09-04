const Task = require('../core/Task');
const {createTemporalTask} = require('../utils/temporal-reasoning');
const {parseTerm} = require('../parser/NewParser');

class Perception {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
    }

    async processEvents(events = []) {
        const newTasks = [];

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
                return await this.createGenericTask(event);
        }
    }

    async createObservationTask(event) {
        const termKey = event.content || `observed_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.confidence || 1.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createUserInputTask(event) {
        const termKey = event.content || `user_input_${Date.now()}`;
        const punctuation = '?';
        const truthValue = {
            frequency: 1.0,
            confidence: 0.8
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createSensorDataTask(event) {
        const termKey = event.sensorType
            ? `(${event.sensorType}_reading_${event.value})`
            : `sensor_data_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: 1.0,
            confidence: event.accuracy || 0.95
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createTemporalEventTask(event) {
        const termKey = event.content || `temporal_event_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.confidence || 1.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return createTemporalTask(
            termKey,
            punctuation,
            truthValue,
            event.occurrenceTime || Date.now(),
            event.endTime || null
        );
    }

    async createCommunicationTask(event) {
        const termKey = event.content
            ? `(communication_${event.sender}_to_${event.recipient}_${event.content})`
            : `communication_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.confidence || 1.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createActionFeedbackTask(event) {
        const termKey = event.action
            ? `(action_feedback_${event.action}_${event.result})`
            : `action_feedback_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.success ? 1.0 : 0.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createGoalAchievementTask(event) {
        const termKey = event.goal
            ? `(goal_achieved_${event.goal})`
            : `goal_achieved_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: 1.0,
            confidence: event.confidence || 0.95
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createEnvironmentalChangeTask(event) {
        const termKey = event.description
            ? `(environmental_change_${event.description})`
            : `environmental_change_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.magnitude || 1.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return createTemporalTask(
            termKey,
            punctuation,
            truthValue,
            event.time || Date.now(),
            event.endTime || null
        );
    }

    async createSocialInteractionTask(event) {
        const termKey = event.interactionType
            ? `(social_interaction_${event.interactionType}_${event.participants.join('_')})`
            : `social_interaction_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.emotionalIntensity || 0.5,
            confidence: event.confidence || 0.8
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createLearningExperienceTask(event) {
        const termKey = event.topic
            ? `(learning_experience_${event.topic})`
            : `learning_experience_${Date.now()}`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.effectiveness || 0.7,
            confidence: event.confidence || 0.85
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createGenericTask(event) {
        const termKey = event.description || `event_${Date.now()}`;
        const punctuation = event.punctuation || '.';
        const truthValue = {
            frequency: event.frequency || 1.0,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async processNaturalLanguage(text) {
        const tasks = [];

        try {
            if (text.includes('goal') || text.includes('want') || text.includes('need')) {
                const goalTask = new Task(
                    parseTerm(`goal_${text.substring(0, 30)}`),
                    '!',
                    {frequency: 1.0, confidence: 0.8}
                );
                tasks.push(goalTask);
            }

            if (text.includes('question') || text.includes('?')) {
                const questionTask = new Task(
                    parseTerm(`question_${text.substring(0, 30)}`),
                    '?',
                    {frequency: 1.0, confidence: 0.9}
                );
                tasks.push(questionTask);
            }

            if (text.includes('fact') || text.includes('is') || text.includes('are')) {
                const beliefTask = new Task(
                    parseTerm(`fact_${text.substring(0, 30)}`),
                    '.',
                    {frequency: 0.9, confidence: 0.8}
                );
                tasks.push(beliefTask);
            }

            for (const task of tasks) {
                if (!this.memory.getTerm(task.termKey)) {
                    const term = await this.lm.bootstrapTerm(task.termKey);
                    this.memory.addTerm(term);
                }
            }

            return tasks;
        } catch (error) {
            console.error('Error processing natural language:', error);
            return await this.processNaturalLanguageSimple(text);
        }
    }

    async processNaturalLanguageSimple(text) {
        const tasks = [];

        if (text.includes('goal') || text.includes('want') || text.includes('need')) {
            const goalTask = new Task(
                parseTerm(`nl_goal_${text.substring(0, 20)}`),
                '!',
                {frequency: 1.0, confidence: 0.8}
            );
            tasks.push(goalTask);
        }

        if (text.includes('question') || text.includes('?')) {
            const questionTask = new Task(
                parseTerm(`nl_question_${text.substring(0, 20)}`),
                '?',
                {frequency: 1.0, confidence: 0.9}
            );
            tasks.push(questionTask);
        }

        if (text.includes('fact') || text.includes('is') || text.includes('are')) {
            const beliefTask = new Task(
                parseTerm(`nl_fact_${text.substring(0, 20)}`),
                '.',
                {frequency: 0.9, confidence: 0.8}
            );
            tasks.push(beliefTask);
        }

        for (const task of tasks) {
            if (!this.memory.getTerm(task.termKey)) {
                const term = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(term);
            }
        }

        return tasks;
    }

    async processSensorStream(sensorReadings) {
        const tasks = [];

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

    async processEventSequence(events) {
        const tasks = [];

        if (events.length > 2) {
            const intervals = [];
            for (let i = 1; i < events.length; i++) {
                intervals.push(events[i].timestamp - events[i - 1].timestamp);
            }

            const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev / avgInterval < 0.2) {
                const patternTask = new Task(
                    parseTerm(`regular_pattern_detected`),
                    '.',
                    {
                        frequency: 0.9,
                        confidence: 1.0 - (stdDev / avgInterval)
                    }
                );
                tasks.push(patternTask);
            }
        }

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