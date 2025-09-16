import Task from './Task.js';
import {createTemporalTask} from '../reasoner/temporal/utils.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import {safeAsync} from '../utils/errorHandler.js';

class TaskFactory {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
        this.eventHandlers = this._initializeEventHandlers();
    }

    async _ensureTermExists(termKey) {
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
        }
    }

    async _createTask(termKey, punctuation, truthValue, stamp) {
        await this._ensureTermExists(termKey);
        const term = parseTerm(termKey);
        return term ? new Task(term, punctuation, truthValue, stamp) : null;
    }

    _initializeEventHandlers() {
        return {
            observation: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.content || `observed_${Date.now()}`, '.', {
                        frequency: e.confidence || 1.0,
                        confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                    });
                }, 'Error processing observation event', null);
            },
            user_input: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.content || `user_input_${Date.now()}`, '?', {
                        frequency: 1.0,
                        confidence: 0.8
                    });
                }, 'Error processing user_input event', null);
            },
            sensor_data: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.sensorType ? `(sensor_type_${e.sensorType}_value_${e.value})` : `sensor_data_${Date.now()}`, '.', {
                        frequency: 1.0,
                        confidence: e.accuracy || 0.95
                    });
                }, 'Error processing sensor_data event', null);
            },
            temporal_event: async e => {
                return await safeAsync(async () => {
                    return await this._createTemporalEventTask(e);
                }, 'Error processing temporal_event', null);
            },
            communication: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.content ? `(communication_${e.sender}_to_${e.recipient}_${e.content})` : `communication_${Date.now()}`, '.', {
                        frequency: e.confidence || 1.0,
                        confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                    });
                }, 'Error processing communication event', null);
            },
            action_feedback: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.action ? `(action_feedback_${e.action}_${e.result})` : `action_feedback_${Date.now()}`, '.', {
                        frequency: e.success ? 1.0 : 0.0,
                        confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                    });
                }, 'Error processing action_feedback event', null);
            },
            goal_achievement: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.goal ? `(goal_achieved_${e.goal})` : `goal_achieved_${Date.now()}`, '.', {
                        frequency: 1.0,
                        confidence: e.confidence || 0.95
                    });
                }, 'Error processing goal_achievement event', null);
            },
            social_interaction: async e => {
                return await safeAsync(async () => {
                    return await this._createSocialInteractionTask(e);
                }, 'Error processing social_interaction event', null);
            },
            environmental_change: async e => {
                return await safeAsync(async () => {
                    return await this._createEnvironmentalChangeTask(e);
                }, 'Error processing environmental_change event', null);
            },
            learning_experience: async e => {
                return await safeAsync(async () => {
                    return await this._createLearningExperienceTask(e);
                }, 'Error processing learning_experience event', null);
            },
            default: async e => {
                return await safeAsync(async () => {
                    return await this._createTask(e.description || `event_${Date.now()}`, e.punctuation || '.', {
                        frequency: e.frequency || 1.0,
                        confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                    });
                }, 'Error processing default event', null);
            }
        };
    }

    async convertEventToTask(event) {
        if (!event || !event.type) {
            return null;
        }
        const handler = this.eventHandlers[event.type] || this.eventHandlers.default;
        return await safeAsync(async () => {
            return await handler(event);
        }, 'Error converting event to task', null);
    }

    async _createTemporalEventTask(event) {
        const termKey = event.content || `temporal_event_${Date.now()}`;
        await this._ensureTermExists(termKey);
        return createTemporalTask(
            termKey,
            '.',
            {frequency: event.confidence || 1.0, confidence: event.confidence || 0.9},
            event.occurrenceTime || Date.now(),
            event.endTime
        );
    }

    async _createSocialInteractionTask(event) {
        const {participants = [], interactionType = 'unknown', emotionalTone = 'neutral'} = event;
        const termKey = `(social_interaction_${interactionType}_${participants.join('_')}_${emotionalTone})`;
        await this._ensureTermExists(termKey);
        // Additional related tasks could be created here too
        return this._createTask(termKey, '.', {
            frequency: event.emotionalIntensity || 0.5,
            confidence: event.confidence || 0.8
        });
    }

    async _createEnvironmentalChangeTask(event) {
        const {description = 'change', location = 'unknown_location'} = event;
        const termKey = `(environmental_change_${description}_${location})`;
        await this._ensureTermExists(termKey);
        // Additional related tasks could be created here too
        return this._createTask(termKey, '.', {frequency: event.magnitude || 1.0, confidence: event.confidence || 0.9});
    }

    async _createLearningExperienceTask(event) {
        const {topic = 'unknown_topic', method = 'unknown_method'} = event;
        const termKey = `(learning_experience_${topic}_${method})`;
        await this._ensureTermExists(termKey);
        // Additional related tasks could be created here too
        return this._createTask(termKey, '.', {
            frequency: event.effectiveness || 0.7,
            confidence: event.confidence || 0.85
        });
    }
}

export default TaskFactory;
