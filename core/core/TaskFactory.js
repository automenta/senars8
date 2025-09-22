import Task from './Task.js';
import {createTemporalTask} from '../utils/temporal/index.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import {safeAsync} from '../utils/errorHandler.js';

class TaskFactory {
    constructor(memory, lm, eventBus) {
        this.memory = memory;
        this.lm = lm;
        this.eventBus = eventBus;
        this.eventHandlers = this._initializeEventHandlers();
    }

    async _ensureTermExists(termKey) {
        if (!this.memory.getTerm(termKey)) {
            const term = await this.lm.bootstrapTerm(termKey);
            this.eventBus.emit('term.add', term);
        }
    }

    async _createTask(termKey, punctuation, truthValue, stamp) {
        await this._ensureTermExists(termKey);
        const term = parseTerm(termKey);
        return term ? new Task(term, punctuation, truthValue, stamp) : null;
    }

    _createEventHandler(handler, errorMessage) {
        return e => safeAsync(() => handler(e), errorMessage, null);
    }

    _initializeEventHandlers() {
        const handlers = {
            observation: e => this._createTask(
                e.content || `observed_${Date.now()}`,
                '.', {
                    frequency: e.confidence || 1.0,
                    confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                }
            ),
            user_input: e => this._createTask(
                e.content || `user_input_${Date.now()}`,
                '?', {
                    frequency: 1.0,
                    confidence: 0.8
                }
            ),
            sensor_data: e => this._createTask(
                e.sensorType ? `(sensor_type_${e.sensorType}_value_${e.value})` : `sensor_data_${Date.now()}`,
                '.', {
                    frequency: 1.0,
                    confidence: e.accuracy || 0.95
                }
            ),
            temporal_event: e => this._createTemporalEventTask(e),
            communication: e => this._createTask(
                e.content ? `(communication_${e.sender}_to_${e.recipient}_${e.content})` : `communication_${Date.now()}`,
                '.', {
                    frequency: e.confidence || 1.0,
                    confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                }
            ),
            action_feedback: e => this._createTask(
                e.action ? `(action_feedback_${e.action}_${e.result})` : `action_feedback_${Date.now()}`,
                '.', {
                    frequency: e.success ? 1.0 : 0.0,
                    confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                }
            ),
            goal_achievement: e => this._createTask(
                e.goal ? `(goal_achieved_${e.goal})` : `goal_achieved_${Date.now()}`,
                '.', {
                    frequency: 1.0,
                    confidence: e.confidence || 0.95
                }
            ),
            social_interaction: e => this._createSocialInteractionTask(e),
            environmental_change: e => this._createEnvironmentalChangeTask(e),
            learning_experience: e => this._createLearningExperienceTask(e),
            default: e => this._createTask(
                e.description || `event_${Date.now()}`,
                e.punctuation || '.', {
                    frequency: e.frequency || 1.0,
                    confidence: e.confidence || config.DEFAULT_TRUTH_VALUE.confidence
                }
            )
        };

        return Object.fromEntries(
            Object.entries(handlers).map(([name, handler]) => [
                name,
                this._createEventHandler(handler, `Error processing ${name} event`)
            ])
        );
    }

    async convertEventToTask(event) {
        if (!event?.type) return null;
        const handler = this.eventHandlers[event.type] || this.eventHandlers.default;
        return handler(event);
    }

    async _createTemporalEventTask(event) {
        const termKey = event.content || `temporal_event_${Date.now()}`;
        await this._ensureTermExists(termKey);
        return createTemporalTask(
            termKey,
            '.', {
                frequency: event.confidence || 1.0,
                confidence: event.confidence || 0.9
            },
            event.occurrenceTime || Date.now(),
            event.endTime
        );
    }

    async _createSocialInteractionTask(event) {
        const {
            participants = [],
            interactionType = 'unknown',
            emotionalTone = 'neutral'
        } = event;
        const termKey = `(social_interaction_${interactionType}_${participants.join('_')}_${emotionalTone})`;
        return this._createTask(termKey, '.', {
            frequency: event.emotionalIntensity || 0.5,
            confidence: event.confidence || 0.8
        });
    }

    async _createEnvironmentalChangeTask(event) {
        const {
            description = 'change',
            location = 'unknown_location'
        } = event;
        const termKey = `(environmental_change_${description}_${location})`;
        return this._createTask(termKey, '.', {
            frequency: event.magnitude || 1.0,
            confidence: event.confidence || 0.9
        });
    }

    async _createLearningExperienceTask(event) {
        const {
            topic = 'unknown_topic',
            method = 'unknown_method'
        } = event;
        const termKey = `(learning_experience_${topic}_${method})`;
        return this._createTask(termKey, '.', {
            frequency: event.effectiveness || 0.7,
            confidence: event.confidence || 0.85
        });
    }
}

export default TaskFactory;
