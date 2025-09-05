const Perception = require('./Perception');
const Task = require('../core/Task');
const {
    createTemporalTask
} = require('../utils/temporal-reasoning');
const {
    parseTerm
} = require('../parser/NewParser');

class PerceptionEnhanced extends Perception {
    constructor(memory, lm) {
        super(memory, lm);
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
        const advancedPatterns = await this.detectAdvancedPatterns(eventStream);
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

    async detectAdvancedPatterns(eventStream) {
        if (eventStream.length <= 5) return [];
        const temporalPatterns = this.detectComplexTemporalPatterns(eventStream);
        const causalPatterns = await this.detectCausalPatterns(eventStream);
        const hierarchicalPatterns = this.detectHierarchicalPatterns(eventStream);
        return [...temporalPatterns, ...causalPatterns, ...hierarchicalPatterns];
    }

    detectComplexTemporalPatterns(eventStream) {
        const eventGroups = eventStream.reduce((groups, event) => {
            const type = event.type || 'unknown';
            const timeBucket = Math.floor((event.timestamp || Date.now()) / 10000);
            const key = `${type}_${timeBucket}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
            return groups;
        }, {});

        return Object.entries(eventGroups)
            .filter(([, events]) => events.length > 5)
            .map(([key, events]) => ({
                type: 'temporal_burst',
                id: key,
                confidence: Math.min(1.0, events.length / 10),
                events
            }));
    }

    async detectCausalPatterns(eventStream) {
        const eventTypes = [...new Set(eventStream.map(e => e.type || 'unknown'))];
        const patterns = [];
        for (const type1 of eventTypes) {
            for (const type2 of eventTypes) {
                if (type1 === type2) continue;
                const events1 = eventStream.filter(e => (e.type || 'unknown') === type1);
                const events2 = eventStream.filter(e => (e.type || 'unknown') === type2);
                if (events1.length === 0) continue;

                const causalCount = events1.reduce((count, e1) =>
                    count + events2.filter(e2 => {
                        const timeDiff = (e2.timestamp || Date.now()) - (e1.timestamp || Date.now());
                        return timeDiff > 0 && timeDiff < 5000;
                    }).length, 0);

                const causalStrength = causalCount / events1.length;
                if (causalStrength > 0.5) {
                    patterns.push({
                        type: 'causal_relationship',
                        id: `${type1}_causes_${type2}`,
                        confidence: causalStrength,
                        relationship: {
                            cause: type1,
                            effect: type2
                        }
                    });
                }
            }
        }
        return patterns;
    }

    detectHierarchicalPatterns(eventStream) {
        const clusters = eventStream.reduce((cls, event) => {
            const key = event.category || event.type || 'unknown';
            if (!cls[key]) cls[key] = [];
            cls[key].push(event);
            return cls;
        }, {});

        return Object.entries(clusters)
            .filter(([, events]) => events.length > 3)
            .map(([category, events]) => ({
                type: 'hierarchical_cluster',
                id: category,
                confidence: Math.min(1.0, events.length / 10),
                category,
                count: events.length
            }));
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
}

module.exports = PerceptionEnhanced;