const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const {cosineSimilarity} = require('../utils/math');
const {calculateTemporalPriority, determineTemporalRelationship, createTemporalRelationshipTask, inferTemporalImplications, createTemporalSequenceTask, detectTemporalPatterns} = require('../utils/temporal-reasoning');
const actionExecutor = require('./ActionExecutor');
const CONSTITUTION_TASKS = require('./Constitution');
const Perception = require('./Perception');
const MetaCognition = require('./MetaCognition');

class Cycle {
    constructor(memory, reasoner, lm) {
        if (!(memory instanceof Memory)) {
            throw new Error('Cycle requires a Memory instance.');
        }
        if (!(reasoner instanceof Reasoner)) {
            throw new Error('Cycle requires a Reasoner instance.');
        }
        if (!(lm instanceof LM)) {
            throw new Error('Cycle requires an LM instance.');
        }
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;
        this.perception = new Perception(memory, lm);
        this.metaCognition = new MetaCognition();

        // Pre-compute the embeddings for the constitutional drives for efficiency
        this.driveEmbeddings = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey)?.embedding)
            .filter(Boolean); // Filter out any terms that might not have been bootstrapped
        
        // Keep track of task derivations for meta-cognition
        this.taskDerivations = new Map();
    }

    calculatePriority(task, currentTime) {
        const term = this.memory.getTerm(task.termKey);
        if (!term || !term.embedding || term.embedding.length === 0) {
            return 0; // Cannot calculate priority without an embedding
        }

        // I (Importance): Relevance to constitutional drives
        let maxSimilarity = 0;
        for (const driveEmbedding of this.driveEmbeddings) {
            const similarity = cosineSimilarity(term.embedding, driveEmbedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
        // The Importance score is boosted slightly to give it more weight
        const I = (maxSimilarity + 0.1) / 1.1;

        // U (Urgency): Based on recency
        const timeSinceCreation = currentTime - task.state.stamp.creationTime;
        const U = 1 / (1 + timeSinceCreation / 10000); // Decays over 10s

        // T (Temporal): Based on occurrence time
        const T = calculateTemporalPriority(task, currentTime);

        // C (Confidence): From the task's truth value
        const C = task.state.truthValue.confidence;

        // E (Effort): Inverse of the term's complexity
        const E = 1 / term.complexity;

        // Final Priority Calculation
        return I * U * T * C * E;
    }

    async runOnce() {
        const currentTime = Date.now();

        // 1. Perception
        // In a real system, this would connect to sensors or input streams
        // For now, we'll add a placeholder for external events
        const newTasks = await this.perception.processEvents();
        this.memory.addTasks(newTasks);

        // 2. Prioritization
        for (const task of this.memory.getAllTasks()) {
            task.state.priority = this.calculatePriority(task, currentTime);
        }

        // 3. Inference
        const focusSet = this.memory.getHighestPriorityTasks(20);
        const derivedTasks = this.reasoner.performInference(focusSet, this.memory.terms);
        
        // Add temporal relationship inference
        const temporalTasks = this.inferTemporalRelationships(focusSet);
        derivedTasks.push(...temporalTasks);
        
        // Add temporal implication inference
        const temporalImplications = this.inferTemporalImplications(focusSet);
        derivedTasks.push(...temporalImplications);
        
        // Detect temporal patterns
        const temporalPatterns = this.detectTemporalPatterns(focusSet);
        derivedTasks.push(...temporalPatterns);
        
        // Generate hypotheses using the LM
        const hypotheses = await this.lm.generateHypotheses(focusSet);
        derivedTasks.push(...hypotheses);
        
        this.memory.addTasks(derivedTasks);

        // Track derivations for meta-cognition
        for (const derivedTask of derivedTasks) {
            this.taskDerivations.set(derivedTask.id, [...focusSet]);
        }

        // 4. Meta-Cognition
        const contradictions = this.metaCognition.findContradictions(derivedTasks);
        let metaTasks = [];
        if (contradictions.length > 0) {
            console.log(`Found ${contradictions.length} contradictions`);
            metaTasks = this.metaCognition.analyzeFailures(contradictions);
            this.memory.addTasks(metaTasks);
            
            // Give meta-cognition tasks high priority
            for (const metaTask of metaTasks) {
                metaTask.state.priority = 0.9; // High priority
            }
        }

        // 5. Semantic Enrichment & Action
        const tasksForEnrichment = [...derivedTasks, ...metaTasks];
        for (const task of tasksForEnrichment) {
            if (!this.memory.getTerm(task.termKey)) {
                const newTerm = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(newTerm);
            }
        }

        // Action System: Execute high-priority goals
        const actionableGoals = this.memory.getAllTasks()
            .filter(task => task.punctuation === '!' && task.state.priority > 0.5)
            .sort((a, b) => b.state.priority - a.state.priority);

        const executionResults = [];
        for (const goal of actionableGoals.slice(0, 3)) { // Execute top 3 goals
            try {
                const result = await actionExecutor.executeGoal(goal);
                executionResults.push(result);
                if (result.success) {
                    console.log(`✓ Executed goal: ${goal.termKey}`);
                } else {
                    console.log(`✗ Failed to execute goal: ${goal.termKey} (${result.error})`);
                }
            } catch (error) {
                console.log(`✗ Error executing goal: ${goal.termKey} (${error.message})`);
                executionResults.push({success: false, task: goal.termKey, error: error.message});
            }
        }

        return {
            derivedTasks: derivedTasks.length,
            contradictions: contradictions.length,
            metaTasks: metaTasks.length,
            executionResults
        };
    }
    
    /**
     * Infers temporal relationships between tasks.
     * @param {Task[]} focusSet - The set of tasks to analyze.
     * @returns {Task[]} Tasks representing temporal relationships.
     */
    inferTemporalRelationships(focusSet) {
        const temporalTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
        
        // Compare each pair of temporal tasks
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                
                const relationship = determineTemporalRelationship(task1, task2);
                if (relationship) {
                    const relationshipTask = createTemporalRelationshipTask(task1, task2, relationship);
                    temporalTasks.push(relationshipTask);
                }
            }
        }
        
        return temporalTasks;
    }
    
    /**
     * Infers temporal implications from task relationships.
     * @param {Task[]} focusSet - The set of tasks to analyze.
     * @returns {Task[]} Tasks representing temporal implications.
     */
    inferTemporalImplications(focusSet) {
        const implicationTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
        
        // Compare each pair of temporal tasks
        for (let i = 0; i < temporalFocusSet.length; i++) {
            for (let j = i + 1; j < temporalFocusSet.length; j++) {
                const task1 = temporalFocusSet[i];
                const task2 = temporalFocusSet[j];
                
                const implications = inferTemporalImplications(task1, task2);
                implicationTasks.push(...implications);
            }
        }
        
        return implicationTasks;
    }
    
    /**
     * Detects temporal patterns in the focus set.
     * @param {Task[]} focusSet - The set of tasks to analyze.
     * @returns {Task[]} Tasks representing detected temporal patterns.
     */
    detectTemporalPatterns(focusSet) {
        const patternTasks = [];
        const temporalFocusSet = focusSet.filter(task => task.state.stamp.occurrenceTime);
        
        // Detect patterns
        const patterns = detectTemporalPatterns(temporalFocusSet);
        
        // Convert patterns to tasks
        for (const pattern of patterns) {
            switch (pattern.type) {
                case 'periodic':
                    const periodicTask = new Task(
                        `(periodic_pattern, ${pattern.tasks[0].termKey})`,
                        '.',
                        {
                            frequency: 0.9,
                            confidence: pattern.confidence
                        }
                    );
                    patternTasks.push(periodicTask);
                    break;
                    
                case 'sequential':
                    const sequenceTask = createTemporalSequenceTask(pattern.sequence);
                    if (sequenceTask) {
                        patternTasks.push(sequenceTask);
                    }
                    break;
            }
        }
        
        return patternTasks;
    }
}

module.exports = Cycle;