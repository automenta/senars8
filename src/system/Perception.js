const Task = require('../core/Task');
const { parseTerm } = require('../parser/narseseParser');
const TaskFactory = require('../core/TaskFactory');
const PatternDetector = require('../reasoner/PatternDetector');

class Perception {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
        this.taskFactory = new TaskFactory(memory, lm);
        this.patternDetector = new PatternDetector();
        this.sensoryModalities = new Map();
        this.attentionFocus = null;
        this.contextStack = [];
        this.perceptionHistory = [];
    }

    registerSensoryModality(modalityName, processor) {
        this.sensoryModalities.set(modalityName, processor);
    }

    async processSensoryInput(modalityName, input) {
        const processor = this.sensoryModalities.get(modalityName);
        if (!processor) throw new Error(`Unknown sensory modality: ${modalityName}`);
        try {
            const tasks = await processor(input);
            this.perceptionHistory.push({
                modality: modalityName,
                input,
                timestamp: Date.now(),
                tasks: tasks.length
            });
            return tasks;
        } catch (error) {
            console.error(`Error processing ${modalityName} input:`, error);
            return [];
        }
    }

    setAttentionFocus(focus) {
        this.attentionFocus = focus;
    }

    pushContext(context) {
        this.contextStack.push(context);
    }

    popContext() {
        return this.contextStack.pop();
    }

    async processMultimodalInputWithContext(multimodalInput) {
        const tasks = [];
        if (this.attentionFocus) {
            const termKey = `(attention_focus_${this.attentionFocus})`;
            const term = this.memory.getTerm(termKey) || await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
            tasks.push(new Task(term, '.', {
                frequency: 1.0,
                confidence: 0.9
            }));
        }

        if (this.contextStack.length > 0) {
            const currentContext = this.contextStack[this.contextStack.length - 1];
            const termKey = `(context_${JSON.stringify(currentContext).replace(/"/g, '')})`;
            const term = this.memory.getTerm(termKey) || await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
            tasks.push(new Task(term, '.', {
                frequency: 0.8,
                confidence: 0.7
            }));
        }

        const multimodalTasks = await this.processMultimodalInput(multimodalInput);
        tasks.push(...multimodalTasks);

        this.perceptionHistory.push({
            type: 'multimodal_with_context',
            input: multimodalInput,
            timestamp: Date.now(),
            tasks: tasks.length
        });
        return tasks;
    }

    async processEventStreamAdvanced(eventStream) {
        const advancedPatterns = await this.patternDetector.detectAdvancedPatterns(eventStream);
        const patternTasks = await Promise.all(advancedPatterns.map(async pattern => {
            const termKey = `advanced_pattern_${pattern.type}_${pattern.id}`;
            const term = this.memory.getTerm(termKey) || await this.lm.bootstrapTerm(termKey);
            this.memory.addTerm(term);
            return new Task(term, '.', {
                frequency: pattern.confidence,
                confidence: 0.8
            });
        }));
        const streamTasks = await this.processEventStream(eventStream);
        return [...patternTasks, ...streamTasks];
    }

    async processSymbolicInput(symbolicInput) {
        try {
            const parsed = parseTerm(symbolicInput);
            if (!parsed) return [];
            const term = this.memory.getTerm(parsed.key) || await this.lm.bootstrapTerm(parsed.key);
            this.memory.addTerm(term);
            const task = new Task(term, '.', {
                frequency: 0.9,
                confidence: 0.8
            });
            this.perceptionHistory.push({
                type: 'symbolic',
                input: symbolicInput,
                timestamp: Date.now(),
                tasks: 1
            });
            return [task];
        } catch (error) {
            console.error('Error processing symbolic input:', error);
            return [];
        }
    }

    async processAnalogicalInput(analogy) {
        try {
            const analogyTermKey = `(analogy_${analogy.source}_${analogy.target})`;
            const analogyTerm = this.memory.getTerm(analogyTermKey) || await this.lm.bootstrapTerm(analogyTermKey);
            this.memory.addTerm(analogyTerm);
            const analogyTask = new Task(analogyTerm, '.', {
                frequency: 0.7,
                confidence: 0.6
            });

            const tasks = [analogyTask];

            if (analogy.mapping) {
                const mappingTermKey = `(analogy_mapping_${JSON.stringify(analogy.mapping).replace(/"/g, '')})`;
                const mappingTerm = this.memory.getTerm(mappingTermKey) || await this.lm.bootstrapTerm(mappingTermKey);
                this.memory.addTerm(mappingTerm);
                tasks.push(new Task(mappingTerm, '.', {
                    frequency: 0.8,
                    confidence: 0.7
                }));
            }

            this.perceptionHistory.push({
                type: 'analogical',
                input: analogy,
                timestamp: Date.now(),
                tasks: tasks.length
            });
            return tasks;
        } catch (error) {
            console.error('Error processing analogical input:', error);
            return [];
        }
    }

    async processUncertainInput(uncertainInput) {
        try {
            const mainTermKey = uncertainInput.term || `uncertain_event_${Date.now()}`;
            const mainTerm = this.memory.getTerm(mainTermKey) || await this.lm.bootstrapTerm(mainTermKey);
            this.memory.addTerm(mainTerm);
            const mainTask = new Task(mainTerm, uncertainInput.punctuation || '.', {
                frequency: uncertainInput.frequency || 0.5,
                confidence: uncertainInput.confidence || 0.5
            });

            const tasks = [mainTask];

            if (Array.isArray(uncertainInput.alternatives)) {
                for (const alt of uncertainInput.alternatives) {
                    const altTermKey = alt.term || `alternative_${Date.now()}`;
                    const altTerm = this.memory.getTerm(altTermKey) || await this.lm.bootstrapTerm(altTermKey);
                    this.memory.addTerm(altTerm);
                    tasks.push(new Task(altTerm, alt.punctuation || '.', {
                        frequency: alt.frequency || 0.3,
                        confidence: alt.confidence || 0.3
                    }));
                }
            }

            this.perceptionHistory.push({
                type: 'uncertain',
                input: uncertainInput,
                timestamp: Date.now(),
                tasks: tasks.length
            });
            return tasks;
        } catch (error) {
            console.error('Error processing uncertain input:', error);
            return [];
        }
    }

    getPerceptionHistory() {
        return this.perceptionHistory;
    }

    clearPerceptionHistory() {
        this.perceptionHistory = [];
    }

    async processEvents(events = []) {
        const newTasks = [];

        for (const event of events) {
            try {
                const task = await this.taskFactory.convertEventToTask(event);
                if (task) {
                    newTasks.push(task);
                }
            } catch (error) {
                console.error('Error processing event:', error);
            }
        }

        return newTasks;
    }

    async processNaturalLanguage(text) {
        const tasks = [];

        try {
            if (text.includes('goal') || text.includes('want') || text.includes('need')) {
                const goalTask = new Task(
                    parseTerm(`goal_${text.substring(0, 30)}`),
                    '!',
                    { frequency: 1.0, confidence: 0.8 }
                );
                tasks.push(goalTask);
            }

            if (text.includes('question') || text.includes('?')) {
                const questionTask = new Task(
                    parseTerm(`question_${text.substring(0, 30)}`),
                    '?',
                    { frequency: 1.0, confidence: 0.9 }
                );
                tasks.push(questionTask);
            }

            if (text.includes('fact') || text.includes('is') || text.includes('are')) {
                const beliefTask = new Task(
                    parseTerm(`fact_${text.substring(0, 30)}`),
                    '.',
                    { frequency: 0.9, confidence: 0.8 }
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
                { frequency: 1.0, confidence: 0.8 }
            );
            tasks.push(goalTask);
        }

        if (text.includes('question') || text.includes('?')) {
            const questionTask = new Task(
                parseTerm(`nl_question_${text.substring(0, 20)}`),
                '?',
                { frequency: 1.0, confidence: 0.9 }
            );
            tasks.push(questionTask);
        }

        if (text.includes('fact') || text.includes('is') || text.includes('are')) {
            const beliefTask = new Task(
                parseTerm(`nl_fact_${text.substring(0, 20)}`),
                '.',
                { frequency: 0.9, confidence: 0.8 }
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
            const sensorTask = await this.taskFactory.createSensorDataTask({
                sensorType: reading.type,
                value: reading.value,
                accuracy: reading.accuracy,
                time: reading.timestamp
            });
            tasks.push(sensorTask);
        }

        return tasks;
    }

    async processMultimodalInput(multimodalInput) {
        const tasks = [];

        if (multimodalInput.text) {
            const textTasks = await this.processNaturalLanguage(multimodalInput.text);
            tasks.push(...textTasks);
        }

        if (multimodalInput.sensorData) {
            const sensorTasks = await this.processSensorStream(multimodalInput.sensorData);
            tasks.push(...sensorTasks);
        }

        if (multimodalInput.temporalEvents) {
            for (const event of multimodalInput.temporalEvents) {
                const task = await this.taskFactory.createTemporalEventTask(event);
                if (task) tasks.push(task);
            }
        }

        if (multimodalInput.context) {
            const termKey = `(context_${multimodalInput.context})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const contextTask = new Task(
                    parsedTerm,
                    '.',
                    { frequency: 0.8, confidence: 0.7 }
                );
                if (!this.memory.getTerm(contextTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(contextTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(contextTask);
            }
        }

        if (multimodalInput.emotion) {
            const termKey = `(emotional_state_${multimodalInput.emotion})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const emotionTask = new Task(
                    parsedTerm,
                    '.',
                    { frequency: 0.9, confidence: 0.8 }
                );
                if (!this.memory.getTerm(emotionTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(emotionTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(emotionTask);
            }
        }

        if (multimodalInput.spatial) {
            const termKey = `(spatial_context_${JSON.stringify(multimodalInput.spatial).replace(/"/g, '')})`;
            const parsedTerm = parseTerm(termKey);
            if (parsedTerm) {
                const spatialTask = new Task(
                    parsedTerm,
                    '.',
                    { frequency: 0.85, confidence: 0.75 }
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

    async processEventStream(eventStream) {
        const tasks = [];

        const patternTasks = await this.patternDetector.processEventSequence(eventStream);
        tasks.push(...patternTasks);

        const anomalies = this.patternDetector.detectAnomalies(eventStream);
        for (const anomaly of anomalies) {
            const anomalyTask = new Task(
                parseTerm(`anomaly_detected_${anomaly.type}_${anomaly.timestamp}`),
                '.',
                { frequency: anomaly.severity, confidence: 0.8 }
            );
            if (!this.memory.getTerm(anomalyTask.termKey)) {
                const term = await this.lm.bootstrapTerm(anomalyTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(anomalyTask);
        }

        const trends = this.patternDetector.detectTrends(eventStream);
        for (const trend of trends) {
            const trendTask = new Task(
                parseTerm(`trend_${trend.type}_${trend.direction}`),
                '.',
                { frequency: trend.strength, confidence: 0.7 }
            );
            if (!this.memory.getTerm(trendTask.termKey)) {
                const term = await this.lm.bootstrapTerm(trendTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(trendTask);
        }

        const periodicPatterns = this.patternDetector.detectPeriodicPatterns(eventStream);
        for (const pattern of periodicPatterns) {
            const patternTask = new Task(
                parseTerm(`periodic_pattern_${pattern.type}_${pattern.period}`),
                '.',
                { frequency: pattern.regularity, confidence: 0.85 }
            );
            if (!this.memory.getTerm(patternTask.termKey)) {
                const term = await this.lm.bootstrapTerm(patternTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(patternTask);
        }

        const correlations = this.patternDetector.detectCorrelations(eventStream);
        for (const correlation of correlations) {
            const correlationTask = new Task(
                parseTerm(`correlation_${correlation.type1}_and_${correlation.type2}`),
                '.',
                { frequency: correlation.strength, confidence: 0.8 }
            );
            if (!this.memory.getTerm(correlationTask.termKey)) {
                const term = await this.lm.bootstrapTerm(correlationTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(correlationTask);
        }

        return tasks;
    }

    async processFeedback(feedback) {
        const tasks = [];

        const feedbackTask = new Task(
            parseTerm(`feedback_${feedback.type || 'general'}_${Date.now()}`),
            '.', {
                frequency: feedback.effectiveness || 0.5,
                confidence: feedback.confidence || 0.8
            }
        );

        if (!this.memory.getTerm(feedbackTask.termKey)) {
            const term = await this.lm.bootstrapTerm(feedbackTask.termKey);
            this.memory.addTerm(term);
        }
        tasks.push(feedbackTask);

        if (feedback.effectiveness < 0.5) {
            const improvementGoal = new Task(
                parseTerm(`improve_${feedback.domain || 'system'}_performance`),
                '!', {
                    frequency: 1.0,
                    confidence: 0.9
                }
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