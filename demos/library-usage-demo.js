import SystemFactory from '../src/system/SystemFactory.js';
import Task from '../src/core/Task.js';
import { parseTerm } from '../src/parser/narseseParser.js';
import { info } from '../src/utils/logger.js';

/**
 * Library Usage Demo
 * A simple demonstration of how to use the SeNARS system as a library.
 */
async function libraryUsageDemo() {
    info('--- Starting Library Usage Demo ---');

    // 1. Create a system instance using the factory
    // The factory handles the creation of all system components.
    const system = await SystemFactory.createSystem();
    info('System created and initialized.');

    // 2. Add knowledge to the system
    // We create a Task, which is a piece of knowledge with a truth value.
    const beliefTerm = parseTerm('<cat --> animal>');
    const belief = new Task(
        beliefTerm,
        '.', // '.' indicates a belief (judgment)
        { frequency: 1.0, confidence: 0.9 }
    );
    await system.addTasks([belief]);
    info('Belief "<cat --> animal>" added to the system.');

    // 3. Run the cognitive cycle
    // The cognitive cycle is the "heartbeat" of the system, where reasoning happens.
    info('Running 10 cognitive cycles...');
    for (let i = 0; i < 10; i++) {
        const result = await system.runCycle();
        info(`Cycle ${i + 1} completed. Derived ${result.derivedTasks.length} new tasks.`);
    }

    // 4. Stop the system
    system.stop();
    info('System stopped.');
    info('--- Library Usage Demo Completed ---');
}

libraryUsageDemo().catch(console.error);

export { libraryUsageDemo };
