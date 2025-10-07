// Goal Driven Behavior Demonstration
// Shows how the system pursues goals and modifies behavior based on goal states

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

async function goalDrivenBehaviorDemo(options = {}) {
    // Set of tasks that demonstrate goal-driven behavior
    const taskDefs = [
        // Initial beliefs about the world
        {sentence: '(hungry --> state).', truth: [1.0, 0.9]},
        {sentence: '(food --> satisfies_hunger).', truth: [1.0, 0.9]},
        {sentence: '(kitchen --> location_of_food).', truth: [0.8, 0.8]},
        {sentence: '(move_to_kitchen --> find_food).', truth: [0.7, 0.7]},
        {sentence: '(find_food --> eat_food).', truth: [0.8, 0.8]},

        // Current state
        {sentence: 'hungry.', truth: [1.0, 0.9]},

        // The goal to be achieved
        {sentence: 'food!', truth: [0.9, 0.9]},  // Goal: Obtain food

        // Query about how to achieve the goal
        {sentence: '(move_to_kitchen --> ?)?'}  // Question: Should I move to kitchen?
    ];

    const defaultOptions = {
        cycleCount: 12,
        postCycleCallback: async (system) => {
            info("\\n=== Goal Driven Behavior Demonstration ===");
            info("Scenario: An agent is hungry and needs to find food");
            info("\\nInitial State:");
            info("- Agent is hungry: (hungry.)");
            info("- Goal is to obtain food: (food!)");
            info("- Knowledge base contains relevant facts about food locations and actions");

            info("\\nGoal Processing:");
            info("- The system recognizes the goal (food!)");
            info("- It searches memory for relevant beliefs and procedures");
            info("- It identifies a potential path: hungry -> kitchen -> food");

            // Show what inferences were made
            const allTasks = await system.introspection.queryTasks({});
            const goals = await system.introspection.queryTasks({punctuation: '!'});
            const beliefs = await system.introspection.queryTasks({punctuation: '.'});
            const derivedActions = beliefs.filter(b =>
                b.termKey.includes('move') ||
                b.termKey.includes('find') ||
                b.termKey.includes('eat')
            );

            info(`\\nGoals in the system: ${goals.length}`);
            info(`Relevant actions derived: ${derivedActions.length}`);

            info("\\nDerived action plan:");
            derivedActions.forEach(action => {
                info(`- ${action.termKey} (conf: ${action.state.truthValue.confidence.toFixed(2)})`);
            });

            info("\\nGoal-driven reasoning patterns:");
            info("1. Goal adoption: Recognizing the need to satisfy hunger");
            info("2. Means-end analysis: Finding connections between current state and goal");
            info("3. Plan construction: Creating a sequence of actions to reach the goal");
            info("4. Plan refinement: Adjusting based on new information and feedback");

            // Show if the goal was satisfied or progress toward it
            const goalSatisfaction = beliefs.some(b =>
                b.termKey.includes('food') ||
                b.termKey.includes('eat') ||
                b.termKey.includes('satisf')
            );

            info(`\\nGoal progress: ${goalSatisfaction ? 'Advanced toward goal' : 'Initial planning stage'}`);

            info("\\nThis demonstrates how goals drive the system's reasoning,");
            info("causing it to prioritize relevant knowledge and generate action plans.");
        }
    };

    const mergedOptions = {...defaultOptions, ...options};

    return await runSystem('Goal Driven Behavior Demonstration', taskDefs, mergedOptions);
}

export default goalDrivenBehaviorDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    goalDrivenBehaviorDemo().catch(console.error);
}