const Perception = require('./Perception');
const Task = require('../core/Task');
const {createTemporalTask} = require('../utils/temporal-reasoning');
const {parseTerm} = require('../parser/NewParser');

/**
 * Enhanced Perception System
 * Extends the basic perception capabilities with more sophisticated interfaces
 */
class PerceptionEnhanced extends Perception {
    constructor(memory, lm) {
        super(memory, lm);
        this.sensoryModalities = new Map(); // Track different sensory modalities
        this.attentionFocus = null; // Track current attention focus
        this.contextStack = []; // Track contextual information
        this.perceptionHistory = []; // Track perception events
    }

    /**
     * Registers a new sensory modality
     * @param {string} modalityName - Name of the sensory modality
     * @param {function} processor - Function to process input from this modality
     */
    registerSensoryModality(modalityName, processor) {
        this.sensoryModalities.set(modalityName, processor);
    }

    /**
     * Processes input from a specific sensory modality
     * @param {string} modalityName - Name of the sensory modality
     * @param {any} input - Input data from the modality
     * @returns {Promise<Task[]>} Array of tasks derived from the input
     */
    async processSensoryInput(modalityName, input) {
        const processor = this.sensoryModalities.get(modalityName);
        if (!processor) {
            throw new Error(`Unknown sensory modality: ${modalityName}`);
        }

        try {
            const tasks = await processor(input);
            this.perceptionHistory.push({
                modality: modalityName,
                input: input,
                timestamp: Date.now(),
                tasks: tasks.length
            });
            return tasks;
        } catch (error) {
            console.error(`Error processing ${modalityName} input:`, error);
            return [];
        }
    }

    /**
     * Sets the current attention focus
     * @param {string} focus - The current attention focus
     */
    setAttentionFocus(focus) {
        this.attentionFocus = focus;
    }

    /**
     * Pushes contextual information onto the context stack
     * @param {object} context - Contextual information
     */
    pushContext(context) {
        this.contextStack.push(context);
    }

    /**
     * Pops contextual information from the context stack
     * @returns {object} The popped context
     */
    popContext() {
        return this.contextStack.pop();
    }

    /**
     * Processes multimodal input with attention and context awareness
     * @param {object} multimodalInput - Object containing different types of input
     * @returns {Promise<Task[]>} Array of tasks derived from the multimodal input
     */
    async processMultimodalInputWithContext(multimodalInput) {
        const tasks = [];

        // Process with attention focus if available
        if (this.attentionFocus) {
            const focusTask = new Task(
                parseTerm(`(attention_focus_${this.attentionFocus})`),
                '.',
                {frequency: 1.0, confidence: 0.9}
            );
            if (!this.memory.getTerm(focusTask.termKey)) {
                const term = await this.lm.bootstrapTerm(focusTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(focusTask);
        }

        // Process with context if available
        if (this.contextStack.length > 0) {
            const currentContext = this.contextStack[this.contextStack.length - 1];
            const contextTask = new Task(
                parseTerm(`(context_${JSON.stringify(currentContext).replace(/"/g, '')})`),
                '.',
                {frequency: 0.8, confidence: 0.7}
            );
            if (!this.memory.getTerm(contextTask.termKey)) {
                const term = await this.lm.bootstrapTerm(contextTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(contextTask);
        }

        // Process the multimodal input
        const multimodalTasks = await this.processMultimodalInput(multimodalInput);
        tasks.push(...multimodalTasks);

        // Add to perception history
        this.perceptionHistory.push({
            type: 'multimodal_with_context',
            input: multimodalInput,
            timestamp: Date.now(),
            tasks: tasks.length
        });

        return tasks;
    }

    /**
     * Processes a stream of events with advanced pattern detection
     * @param {Array} eventStream - Array of events over time
     * @returns {Promise<Task[]>} Array of tasks representing detected patterns
     */
    async processEventStreamAdvanced(eventStream) {
        const tasks = [];

        // Detect advanced patterns
        const advancedPatterns = await this.detectAdvancedPatterns(eventStream);
        for (const pattern of advancedPatterns) {
            const patternTask = new Task(
                parseTerm(`advanced_pattern_${pattern.type}_${pattern.id}`),
                '.',
                {frequency: pattern.confidence, confidence: 0.8}
            );
            if (!this.memory.getTerm(patternTask.termKey)) {
                const term = await this.lm.bootstrapTerm(patternTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(patternTask);
        }

        // Process with existing event stream processor
        const streamTasks = await this.processEventStream(eventStream);
        tasks.push(...streamTasks);

        return tasks;
    }

    /**
     * Detects advanced patterns in an event stream
     * @param {Array} eventStream - Array of events
     * @returns {Promise<Array>} Array of detected advanced patterns
     */
    async detectAdvancedPatterns(eventStream) {
        const patterns = [];

        if (eventStream.length > 5) {
            // Detect complex temporal patterns
            const temporalPatterns = this.detectComplexTemporalPatterns(eventStream);
            patterns.push(...temporalPatterns);

            // Detect causal relationships
            const causalPatterns = await this.detectCausalPatterns(eventStream);
            patterns.push(...causalPatterns);

            // Detect hierarchical patterns
            const hierarchicalPatterns = this.detectHierarchicalPatterns(eventStream);
            patterns.push(...hierarchicalPatterns);
        }

        return patterns;
    }

    /**
     * Detects complex temporal patterns in an event stream
     * @param {Array} eventStream - Array of events
     * @returns {Array} Array of detected temporal patterns
     */
    detectComplexTemporalPatterns(eventStream) {
        const patterns = [];

        // Group events by type and time
        const eventGroups = {};
        for (const event of eventStream) {
            const type = event.type || 'unknown';
            const timeBucket = Math.floor((event.timestamp || Date.now()) / 10000); // 10-second buckets
            const key = `${type}_${timeBucket}`;

            if (!eventGroups[key]) {
                eventGroups[key] = [];
            }
            eventGroups[key].push(event);
        }

        // Detect burst patterns (many events of the same type in a short time)
        for (const [key, events] of Object.entries(eventGroups)) {
            if (events.length > 5) {
                patterns.push({
                    type: 'temporal_burst',
                    id: key,
                    confidence: Math.min(1.0, events.length / 10),
                    events: events
                });
            }
        }

        return patterns;
    }

    /**
     * Detects causal relationships in an event stream
     * @param {Array} eventStream - Array of events
     * @returns {Promise<Array>} Array of detected causal patterns
     */
    async detectCausalPatterns(eventStream) {
        const patterns = [];

        // Simple Granger causality test approximation
        const eventTypes = [...new Set(eventStream.map(e => e.type || 'unknown'))];

        for (let i = 0; i < eventTypes.length; i++) {
            for (let j = 0; j < eventTypes.length; j++) {
                if (i !== j) {
                    const type1 = eventTypes[i];
                    const type2 = eventTypes[j];

                    // Count occurrences of type1 followed by type2 within a time window
                    let causalCount = 0;
                    const events1 = eventStream.filter(e => (e.type || 'unknown') === type1);
                    const events2 = eventStream.filter(e => (e.type || 'unknown') === type2);

                    for (const event1 of events1) {
                        for (const event2 of events2) {
                            const timeDiff = (event2.timestamp || Date.now()) - (event1.timestamp || Date.now());
                            if (timeDiff > 0 && timeDiff < 5000) { // Within 5 seconds
                                causalCount++;
                            }
                        }
                    }

                    // Calculate causal strength
                    if (causalCount > 2 && events1.length > 0) {
                        const causalStrength = causalCount / events1.length;
                        if (causalStrength > 0.5) {
                            patterns.push({
                                type: 'causal_relationship',
                                id: `${type1}_causes_${type2}`,
                                confidence: causalStrength,
                                relationship: {cause: type1, effect: type2}
                            });
                        }
                    }
                }
            }
        }

        return patterns;
    }

    /**
     * Detects hierarchical patterns in an event stream
     * @param {Array} eventStream - Array of events
     * @returns {Array} Array of detected hierarchical patterns
     */
    detectHierarchicalPatterns(eventStream) {
        const patterns = [];

        // Group events by similarity (simple clustering)
        const clusters = {};
        for (const event of eventStream) {
            const key = event.category || event.type || 'unknown';
            if (!clusters[key]) {
                clusters[key] = [];
            }
            clusters[key].push(event);
        }

        // Create hierarchical pattern for each cluster with sufficient events
        for (const [category, events] of Object.entries(clusters)) {
            if (events.length > 3) {
                patterns.push({
                    type: 'hierarchical_cluster',
                    id: category,
                    confidence: Math.min(1.0, events.length / 10),
                    category: category,
                    count: events.length
                });
            }
        }

        return patterns;
    }

    /**
     * Processes symbolic input (e.g., logical expressions, rules)
     * @param {string} symbolicInput - Symbolic representation of knowledge
     * @returns {Promise<Task[]>} Array of tasks derived from the symbolic input
     */
    async processSymbolicInput(symbolicInput) {
        const tasks = [];

        try {
            // Parse the symbolic input
            const parsed = parseTerm(symbolicInput);
            if (parsed) {
                // Create a task based on the parsed term
                const task = new Task(
                    parsed,
                    '.', // Default to belief
                    {frequency: 0.9, confidence: 0.8}
                );

                if (!this.memory.getTerm(task.termKey)) {
                    const term = await this.lm.bootstrapTerm(task.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(task);
            }

            // Add to perception history
            this.perceptionHistory.push({
                type: 'symbolic',
                input: symbolicInput,
                timestamp: Date.now(),
                tasks: tasks.length
            });
        } catch (error) {
            console.error('Error processing symbolic input:', error);
        }

        return tasks;
    }

    /**
     * Processes analogical input by mapping it to existing knowledge
     * @param {object} analogy - Analogical representation
     * @returns {Promise<Task[]>} Array of tasks derived from the analogy
     */
    async processAnalogicalInput(analogy) {
        const tasks = [];

        try {
            // Create tasks representing the analogy
            const analogyTask = new Task(
                parseTerm(`(analogy_${analogy.source}_${analogy.target})`),
                '.',
                {frequency: 0.7, confidence: 0.6}
            );

            if (!this.memory.getTerm(analogyTask.termKey)) {
                const term = await this.lm.bootstrapTerm(analogyTask.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(analogyTask);

            // If mapping is provided, create tasks for the mapping
            if (analogy.mapping) {
                const mappingTask = new Task(
                    parseTerm(`(analogy_mapping_${JSON.stringify(analogy.mapping).replace(/"/g, '')})`),
                    '.',
                    {frequency: 0.8, confidence: 0.7}
                );

                if (!this.memory.getTerm(mappingTask.termKey)) {
                    const term = await this.lm.bootstrapTerm(mappingTask.termKey);
                    this.memory.addTerm(term);
                }
                tasks.push(mappingTask);
            }

            // Add to perception history
            this.perceptionHistory.push({
                type: 'analogical',
                input: analogy,
                timestamp: Date.now(),
                tasks: tasks.length
            });
        } catch (error) {
            console.error('Error processing analogical input:', error);
        }

        return tasks;
    }

    /**
     * Processes uncertain or probabilistic input
     * @param {object} uncertainInput - Input with uncertainty information
     * @returns {Promise<Task[]>} Array of tasks derived from the uncertain input
     */
    async processUncertainInput(uncertainInput) {
        const tasks = [];

        try {
            // Create a task with the provided uncertainty
            const task = new Task(
                parseTerm(uncertainInput.term || `uncertain_event_${Date.now()}`),
                uncertainInput.punctuation || '.',
                {
                    frequency: uncertainInput.frequency || 0.5,
                    confidence: uncertainInput.confidence || 0.5
                }
            );

            if (!this.memory.getTerm(task.termKey)) {
                const term = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(term);
            }
            tasks.push(task);

            // If there are multiple possible interpretations, create tasks for each
            if (uncertainInput.alternatives && Array.isArray(uncertainInput.alternatives)) {
                for (const alternative of uncertainInput.alternatives) {
                    const altTask = new Task(
                        parseTerm(alternative.term || `alternative_${Date.now()}`),
                        alternative.punctuation || '.',
                        {
                            frequency: alternative.frequency || 0.3,
                            confidence: alternative.confidence || 0.3
                        }
                    );

                    if (!this.memory.getTerm(altTask.termKey)) {
                        const term = await this.lm.bootstrapTerm(altTask.termKey);
                        this.memory.addTerm(term);
                    }
                    tasks.push(altTask);
                }
            }

            // Add to perception history
            this.perceptionHistory.push({
                type: 'uncertain',
                input: uncertainInput,
                timestamp: Date.now(),
                tasks: tasks.length
            });
        } catch (error) {
            console.error('Error processing uncertain input:', error);
        }

        return tasks;
    }

    /**
     * Gets the perception history
     * @returns {Array} Perception history
     */
    getPerceptionHistory() {
        return this.perceptionHistory;
    }

    /**
     * Clears the perception history
     */
    clearPerceptionHistory() {
        this.perceptionHistory = [];
    }
}

module.exports = PerceptionEnhanced;