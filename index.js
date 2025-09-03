const Memory = require('./src/memory/Memory');
const Reasoner = require('./src/reasoner/Reasoner');
const LM = require('./src/lm/LM');
const Cycle = require('./src/system/Cycle');
const CONSTITUTION_TASKS = require('./src/system/Constitution');
const Term = require('./src/core/Term');

async function main() {
    console.log("SeNARS Cognitive System Initializing...");

    console.log("Initializing LM interface (using local offline model)...");
    const lm = new LM();

    const memory = new Memory();
    const reasoner = new Reasoner();

    console.log("Loading Constitution...");
    memory.addTasks(CONSTITUTION_TASKS);

    console.log("Bootstrapping initial terms from Constitution...");
    const termPromises = CONSTITUTION_TASKS.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const newTerms = (await Promise.all(termPromises)).filter(Boolean);
    newTerms.forEach(term => memory.addTerm(term));

    console.log(`Initial terms bootstrapped. Total terms in memory: ${memory.terms.size}`);

    const cycle = new Cycle(memory, reasoner, lm);

    const runCycles = async (count) => {
        for (let i = 0; i < count; i++) {
            console.log(`\n--- Starting Cycle ${i + 1} ---`);
            await cycle.runOnce();

            const topTask = memory.getHighestPriorityTasks(1)[0];
            console.log(`Cycle ${i + 1} complete. Total tasks in memory: ${memory.getAllTasks().length}`);
            if (topTask) {
                console.log(`Highest priority task: ${topTask.termKey} (Priority: ${topTask.state.priority.toPrecision(3)})`);
            } else {
                console.log("No tasks in memory.");
            }
        }
    };

    console.log("System initialized. Starting cognitive cycles.");
    await runCycles(5);
    console.log("\n--- Simulation Complete ---");
}

main().catch(error => {
    console.error("A critical error occurred:", error);
    process.exit(1);
});
