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

    /**
     * Processes social interactions with emotional and relational context.
     * @param {object} event - Social interaction event.
     * @returns {Promise<Task>} Task representing the social interaction.
     */
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

        // Create additional tasks for emotional and relational context
        const emotionalTask = new Task(
            parseTerm(`(emotional_context_${emotionalTone}_${participants.join('_')})`),
            '.',
            {frequency: event.emotionalIntensity || 0.5, confidence: 0.7}
        );

        const relationshipTask = new Task(
            parseTerm(`(relationship_${relationshipContext}_${participants.join('_')})`),
            '.',
            {frequency: 0.8, confidence: 0.9}
        );

        if (!this.memory.getTerm(emotionalTask.termKey)) {
            const term = await this.lm.bootstrapTerm(emotionalTask.termKey);
            this.memory.addTerm(term);
        }

        if (!this.memory.getTerm(relationshipTask.termKey)) {
            const term = await this.lm.bootstrapTerm(relationshipTask.termKey);
            this.memory.addTerm(term);
        }

        // Return the main task, but the others will be added to memory
        return new Task(parseTerm(termKey), punctuation, truthValue);
    }

    /**
     * Processes complex environmental changes with spatial and temporal context.
     * @param {object} event - Environmental change event.
     * @returns {Promise<Task>} Task representing the environmental change.
     */
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

        // Create additional tasks for spatial and temporal context
        const spatialTask = new Task(
            parseTerm(`(spatial_context_${location})`),
            '.',
            {frequency: 0.9, confidence: 0.95}
        );

        if (duration > 0) {
            const temporalTask = createTemporalTask(
                `(temporal_duration_${duration}_ms)`,
                '.',
                {frequency: 1.0, confidence: 0.9},
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

    /**
     * Processes learning experiences with effectiveness and retention context.
     * @param {object} event - Learning experience event.
     * @returns {Promise<Task>} Task representing the learning experience.
     */
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

        // Create additional tasks for retention context
        const retentionTermKey = `(knowledge_retention_${topic}_${retention})`;
        const retentionParsedTerm = parseTerm(retentionTermKey);
        if (retentionParsedTerm) {
            const retentionTask = new Task(
                retentionParsedTerm,
                '.',
                {frequency: retention, confidence: 0.8}
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

    /**
     * Processes multimodal input combining text, sensor data, and temporal information.
     * @param {object} multimodalInput - Object containing different types of input.
     * @returns {Promise<Task[]>} Array of tasks derived from the multimodal input.
     */
    async processMultimodalInput(multimodalInput) {
        const tasks = [];

        // Process text input if present
        if (multimodalInput.text) {
            const textTasks = await this.processNaturalLanguage(multimodalInput.text);
            tasks.push(...textTasks);
        }

        // Process sensor data if present
        if (multimodalInput.sensorData) {
            const sensorTasks = await this.processSensorStream(multimodalInput.sensorData);
            tasks.push(...sensorTasks);
        }

        // Process temporal events if present
        if (multimodalInput.temporalEvents) {
            for (const event of multimodalInput.temporalEvents) {
                const task = await this.createTemporalEventTask(event);
                if (task) tasks.push(task);
            }
        }

        // Process contextual information
        if (multimodalInput.context) {
            const termKey = `(context_${multimodalInput.context})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const contextTask = new Task(
                    parsedTerm,
                    '.',
                    {frequency: 0.8, confidence: 0.7}
                );
                if (!this.memory.getTerm(contextTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(contextTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(contextTask);
            }
        }

        // Process emotional content if present
        if (multimodalInput.emotion) {
            const termKey = `(emotional_state_${multimodalInput.emotion})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const emotionTask = new Task(
                    parsedTerm,
                    '.',
                    {frequency: 0.9, confidence: 0.8}
                );
                if (!this.memory.getTerm(emotionTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(emotionTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(emotionTask);
            }
        }

        // Process spatial information if present
        if (multimodalInput.spatial) {
            const termKey = `(spatial_context_${JSON.stringify(multimodalInput.spatial).replace(/"/g, '')})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const spatialTask = new Task(
                    parsedTerm,
                    '.',
                    {frequency: 0.85, confidence: 0.75}
                );
                if (!this.memory.getTerm(spatialTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(spatialTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(spatialTask);
            }
        }

        return tasks;
    }

    /**
     * Processes a stream of events to detect patterns and anomalies.
     * @param {Array} eventStream - Array of events over time.
     * @returns {Promise<Task[]>} Array of tasks representing detected patterns or anomalies.
     */
    async processEventStream(eventStream) {
        const tasks = [];

        // Detect patterns in the event stream
        const patternTasks = await this.processEventSequence(eventStream);
        tasks.push(...patternTasks);

        // Detect anomalies
        const anomalies = this.detectAnomalies(eventStream);
        for (const anomaly of anomalies) {
            const anomalyTask = new Task(
                parseTerm(`anomaly_detected_${anomaly.type}_${anomaly.timestamp}`),
                '.',
                {frequency: anomaly.severity, confidence: 0.8}
            );
            if (!this.memory.getTerm(anomalyTask.termKey)) {
                const term = await this.lm.bootstrapTerm(anomalyTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(anomalyTask);
        }

        // Detect trends
        const trends = this.detectTrends(eventStream);
        for (const trend of trends) {
            const trendTask = new Task(
                parseTerm(`trend_${trend.type}_${trend.direction}`),
                '.',
                {frequency: trend.strength, confidence: 0.7}
            );
            if (!this.memory.getTerm(trendTask.termKey)) {
                const term = await this.lm.bootstrapTerm(trendTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(trendTask);
        }

        // Detect periodic patterns
        const periodicPatterns = this.detectPeriodicPatterns(eventStream);
        for (const pattern of periodicPatterns) {
            const patternTask = new Task(
                parseTerm(`periodic_pattern_${pattern.type}_${pattern.period}`),
                '.',
                {frequency: pattern.regularity, confidence: 0.85}
            );
            if (!this.memory.getTerm(patternTask.termKey)) {
                const term = await this.lm.bootstrapTerm(patternTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(patternTask);
        }

        // Detect correlations between different event types
        const correlations = this.detectCorrelations(eventStream);
        for (const correlation of correlations) {
            const correlationTask = new Task(
                parseTerm(`correlation_${correlation.type1}_and_${correlation.type2}`),
                '.',
                {frequency: correlation.strength, confidence: 0.8}
            );
            if (!this.memory.getTerm(correlationTask.termKey)) {
                const term = await this.lm.bootstrapTerm(correlationTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(correlationTask);
        }

        return tasks;
    }

    /**
     * Detects periodic patterns in an event stream.
     * @param {Array} eventStream - Array of events.
     * @returns {Array} Array of detected periodic patterns.
     */
    detectPeriodicPatterns(eventStream) {
        const patterns = [];

        if (eventStream.length > 10) {
            // Group events by type
            const eventGroups = {};
            for (const event of eventStream) {
                const type = event.type || 'unknown';
                if (!eventGroups[type]) {
                    eventGroups[type] = [];
                }
                eventGroups[type].push(event);
            }

            // For each event type, check for periodicity
            for (const [type, events] of Object.entries(eventGroups)) {
                if (events.length > 3) {
                    // Calculate time intervals between consecutive events
                    const intervals = [];
                    for (let i = 1; i < events.length; i++) {
                        intervals.push(events[i].timestamp - events[i - 1].timestamp);
                    }

                    // Check for regular intervals (periodicity)
                    if (intervals.length > 2) {
                        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
                        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
                        const stdDev = Math.sqrt(variance);

                        // If standard deviation is small relative to average, it's periodic
                        if (stdDev / avgInterval < 0.3) {
                            patterns.push({
                                type: type,
                                period: avgInterval,
                                regularity: 1.0 - (stdDev / avgInterval)
                            });
                        }
                    }
                }
            }
        }

        return patterns;
    }

    /**
     * Detects correlations between different types of events.
     * @param {Array} eventStream - Array of events.
     * @returns {Array} Array of detected correlations.
     */
    detectCorrelations(eventStream) {
        const correlations = [];

        if (eventStream.length > 10) {
            // Group events by type
            const eventGroups = {};
            for (const event of eventStream) {
                const type = event.type || 'unknown';
                if (!eventGroups[type]) {
                    eventGroups[type] = [];
                }
                eventGroups[type].push(event);
            }

            // Get all event types
            const types = Object.keys(eventGroups);

            // Compare each pair of event types
            for (let i = 0; i < types.length; i++) {
                for (let j = i + 1; j < types.length; j++) {
                    const type1 = types[i];
                    const type2 = types[j];
                    const events1 = eventGroups[type1];
                    const events2 = eventGroups[type2];

                    // Calculate temporal correlation
                    let correlationStrength = 0;
                    let totalCount = 0;

                    for (const event1 of events1) {
                        // Count events of type2 that occur close in time to events of type1
                        for (const event2 of events2) {
                            const timeDiff = Math.abs(event1.timestamp - event2.timestamp);
                            if (timeDiff < 5000) { // Within 5 seconds
                                correlationStrength += 1.0 - (timeDiff / 5000);
                                totalCount++;
                            }
                        }
                    }

                    if (totalCount > 0) {
                        const normalizedStrength = correlationStrength / (events1.length * events2.length);
                        if (normalizedStrength > 0.3) {
                            correlations.push({
                                type1: type1,
                                type2: type2,
                                strength: normalizedStrength
                            });
                        }
                    }
                }
            }
        }

        return correlations;
    }

    /**
     * Detects anomalies in an event stream.
     * @param {Array} eventStream - Array of events.
     * @returns {Array} Array of detected anomalies.
     */
    detectAnomalies(eventStream) {
        const anomalies = [];

        // Simple anomaly detection based on statistical outliers
        if (eventStream.length > 10) {
            // Calculate mean and standard deviation of event values
            const values = eventStream.map(e => e.value || 0);
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);

            // Detect values that are more than 2 standard deviations from the mean
            for (let i = 0; i < eventStream.length; i++) {
                const event = eventStream[i];
                const value = event.value || 0;
                if (Math.abs(value - mean) > 2 * stdDev) {
                    anomalies.push({
                        type: 'statistical_outlier',
                        timestamp: event.timestamp || Date.now(),
                        severity: Math.min(1.0, Math.abs(value - mean) / (3 * stdDev))
                    });
                }
            }
        }

        return anomalies;
    }

    /**
     * Detects trends in an event stream.
     * @param {Array} eventStream - Array of events.
     * @returns {Array} Array of detected trends.
     */
    detectTrends(eventStream) {
        const trends = [];

        if (eventStream.length > 5) {
            // Simple trend detection using linear regression
            const values = eventStream.map(e => e.value || 0);
            const times = eventStream.map(e => e.timestamp || 0);

            // Calculate slope
            const n = values.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

            for (let i = 0; i < n; i++) {
                sumX += times[i];
                sumY += values[i];
                sumXY += times[i] * values[i];
                sumXX += times[i] * times[i];
            }

            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

            // Determine trend direction and strength
            if (Math.abs(slope) > 0.001) {
                const direction = slope > 0 ? 'increasing' : 'decreasing';
                const strength = Math.min(1.0, Math.abs(slope) * 1000); // Normalize strength

                trends.push({
                    type: 'linear_trend',
                    direction: direction,
                    strength: strength
                });
            }
        }

        return trends;
    }

    /**
     * Processes feedback from the environment to adapt system behavior.
     * @param {object} feedback - Feedback information.
     * @returns {Promise<Task[]>} Array of tasks representing the feedback.
     */
    async processFeedback(feedback) {
        const tasks = [];

        // Create a task representing the feedback
        const feedbackTask = new Task(
            parseTerm(`feedback_${feedback.type || 'general'}_${Date.now()}`),
            '.',
            {
                frequency: feedback.effectiveness || 0.5,
                confidence: feedback.confidence || 0.8
            }
        );

        if (!this.memory.getTerm(feedbackTask.termKey)) {
            const term = await this.lm.bootstrapTerm(feedbackTask.termKey);
            this.memory.addTerm(term);
        }
        tasks.push(feedbackTask);

        // If the feedback is negative, create a goal to improve
        if (feedback.effectiveness < 0.5) {
            const improvementGoal = new Task(
                parseTerm(`improve_${feedback.domain || 'system'}_performance`),
                '!',
                {frequency: 1.0, confidence: 0.9}
            );

            if (!this.memory.getTerm(improvementGoal.termKey)) {
                const term = await this.lm.bootstrapTerm(improvementGoal.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(improvementGoal);
        }

        return tasks;
    }
}

module.exports = Perception;