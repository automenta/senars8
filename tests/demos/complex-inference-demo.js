// Complex Inference with Multiple Derivations
// Demonstrates the system's ability to make multiple inferences from limited input

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

async function complexInferenceDemo(options = {}) {
    // Set of tasks that demonstrate complex inference with multiple derivations
    const taskDefs = [
        // Base facts
        {sentence: '(student --> person).', truth: [1.0, 0.9]},      // Students are people
        {sentence: '(person --> mortal).', truth: [1.0, 0.9]},       // People are mortal
        {sentence: '(student --> learner).', truth: [1.0, 0.8]},     // Students are learners
        {sentence: '(learner --> knowledgeable).', truth: [0.7, 0.7]}, // Learners become knowledgeable
        {sentence: '(person --> agent).', truth: [1.0, 0.95]},       // People are agents
        {sentence: '(agent --> goal_directed).', truth: [0.9, 0.8]}, // Agents have goals
        {sentence: 'john_student.', truth: [1.0, 0.9]},              // John is a student
        // Queries to trigger various inferences
        {sentence: '(mortal --> ?)?'},                                // Is john mortal?
        {sentence: '(knowledgeable --> ?)?'},                         // Is john knowledgeable?
        {sentence: '(goal_directed --> ?)?'}                          // Is john goal-directed?
    ];

    const defaultOptions = {
        cycleCount: 15,
        postCycleCallback: async (system) => {
            info("\\n=== Complex Inference with Multiple Derivations ===");
            info("Initial Knowledge:");
            info("1. (student --> person) - Students are people");
            info("2. (person --> mortal) - People are mortal");
            info("3. (student --> learner) - Students are learners");
            info("4. (learner --> knowledgeable) - Learners become knowledgeable");
            info("5. (person --> agent) - People are agents");
            info("6. (agent --> goal_directed) - Agents have goals");
            info("7. john_student - John is a student");

            info("\\nMultiple Inference Paths:");
            info("Path 1: john_student -> student -> person -> mortal");
            info("Path 2: john_student -> student -> learner -> knowledgeable");
            info("Path 3: john_student -> student -> person -> agent -> goal_directed");

            // Show what's in the memory
            const allTasks = await system.introspection.queryTasks({});
            const derivedBeliefs = allTasks.filter(t => t.termKey.includes('john') && t.punctuation === '.');

            info(`\\nTotal tasks in system: ${allTasks.length}`);
            info(`Derived beliefs about John: ${derivedBeliefs.length}`);

            info("\\nDerived conclusions about John:");
            derivedBeliefs.forEach(b => {
                if (b.termKey !== 'john_student') {
                    info(`- ${b.termKey} (confidence: ${b.state.truthValue.confidence.toFixed(2)}, frequency: ${b.state.truthValue.frequency.toFixed(2)})`);
                }
            });

            // Show different types of inferences
            const backwardChains = allTasks.filter(t =>
                t.termKey.includes('mortal') ||
                t.termKey.includes('knowledgeable') ||
                t.termKey.includes('goal_directed')
            );

            info(`\\nBackward chain inferences: ${backwardChains.length}`);

            info("\\nInference Rules Applied:");
            info("- Deduction: (A --> B), A |= B");
            info("- Induction: (A --> C), (B --> C) |= (A --> B) or (B --> A)");
            info("- Abduction: (A --> C), (B --> C) |= (A --> B) with different meaning");
            info("- Comparison: (A --> C), (B --> C) |= (A <-> B)");
        }
    };

    const mergedOptions = {...defaultOptions, ...options};

    return await runSystem('Complex Inference with Multiple Derivations', taskDefs, mergedOptions);
}

export default complexInferenceDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    complexInferenceDemo().catch(console.error);
}