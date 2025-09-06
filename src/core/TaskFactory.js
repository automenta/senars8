const Task = require('./Task');
const { createTemporalTask } = require('../utils/temporal-reasoning');
const { parseTerm } = require('../parser/narseseParser');

class TaskFactory {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
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
        const termKey = event.sensorType ?
            `(sensor_type_${event.sensorType}_value_${event.value})` :
            `sensor_data_${Date.now()}`;
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
        const termKey = event.content ?
            `(communication_${event.sender}_to_${event.recipient}_${event.content})` :
            `communication_${Date.now()}`;
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
        const termKey = event.action ?
            `(action_feedback_${event.action}_${event.result})` :
            `action_feedback_${Date.now()}`;
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
        const termKey = event.goal ?
            `(goal_achieved_${event.goal})` :
            `goal_achieved_${Date.now()}`;
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

    async createSocialInteractionTask(event) {
        const participants = event.participants || [];
        const interactionType = event.interactionType || 'unknown';
        const emotionalTone = event.emotionalTone || 'neutral';
        const relationshipContext = event.relationshipContext || 'acquaintance';

        const termKey = `(social_interaction_${interactionType}_${participants.join('_')}_${emotionalTone})`;
        const punctuation = '.';
        const truthValue = {
            frequency: event.emotionalIntensity || 0.5,
            confidence: event.confidence || 0.8
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        const emotionalTask = new Task(
            parseTerm(`(emotional_context_${emotionalTone}_${participants.join('_')})`),
            '.',
            { frequency: event.emotionalIntensity || 0.5, confidence: 0.7 }
        );

        const relationshipTask = new Task(
            parseTerm(`(relationship_${relationshipContext}_${participants.join('_')})`),
            '.',
            { frequency: 0.8, confidence: 0.9 }
        );

        if (!this.memory.getTerm(emotionalTask.termKey)) {
            const term = await this.lm.bootstrapTerm(emotionalTask.termKey);
            this.memory.addTerm(term);
        }

        if (!this.memory.getTerm(relationshipTask.termKey)) {
            const term = await this.lm.bootstrapTerm(relationshipTask.termKey);
            this.memory.addTerm(term);
        }

        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    async createEnvironmentalChangeTask(event) {
        const description = event.description || 'change';
        const location = event.location || 'unknown_location';
        const magnitude = event.magnitude || 1.0;
        const duration = event.duration || 0;

        const termKey = `(environmental_change_${description}_${location})`;
        const punctuation = '.';
        const truthValue = {
            frequency: magnitude,
            confidence: event.confidence || 0.9
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        const spatialTask = new Task(
            parseTerm(`(spatial_context_${location})`),
            '.',
            { frequency: 0.9, confidence: 0.95 }
        );

        if (duration > 0) {
            const temporalTask = createTemporalTask(
                `(temporal_duration_${duration}_ms)`,
                '.',
                { frequency: 1.0, confidence: 0.9 },
                event.time || Date.now(),
                (event.time || Date.now()) + duration
            );

            if (!this.memory.getTerm(temporalTask.termKey)) {
                const term = await this.lm.bootstrapTerm(temporalTask.termKey);
                this.memory.addTerm(term);
            }
        }

        if (!this.memory.getTerm(spatialTask.termKey)) {
            const term = await this.lm.bootstrapTerm(spatialTask.termKey);
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

    async createLearningExperienceTask(event) {
        const topic = event.topic || 'unknown_topic';
        const method = event.method || 'unknown_method';
        const effectiveness = event.effectiveness || 0.7;
        const retention = event.retention || 0.5;

        const termKey = `(learning_experience_${topic}_${method})`;
        const punctuation = '.';
        const truthValue = {
            frequency: effectiveness,
            confidence: event.confidence || 0.85
        };

        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }

        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            throw new Error(`Failed to parse term: ${termKey}`);
        }

        const retentionTermKey = `(knowledge_retention_${topic}_${retention})`;
        const retentionParsedTerm = parseTerm(retentionTermKey);
        if (retentionParsedTerm) {
            const retentionTask = new Task(
                retentionParsedTerm,
                '.',
                { frequency: retention, confidence: 0.8 }
            );

            if (!this.memory.getTerm(retentionTask.termKey)) {
                const term = await this.lm.bootstrapTerm(retentionTask.termKey);
                this.memory.addTerm(term);
            }
        }

        return new Task(parsedTerm, punctuation, truthValue);
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
}

module.exports = TaskFactory;
