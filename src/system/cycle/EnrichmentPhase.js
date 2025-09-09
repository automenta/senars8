const BasePhase = require('./BasePhase');
const { getNewTermKeys, bootstrapTerms } = require('../cycleUtils');

class EnrichmentPhase extends BasePhase {
    constructor() {
        super('Enrichment');
    }

    async execute(cycle, context) {
        const { derivedTasks, metaTasks } = context;

        // Standard enrichment based on new tasks
        const newTermKeys = getNewTermKeys([...derivedTasks, ...metaTasks], cycle.memory);
        await bootstrapTerms(newTermKeys, cycle.lm, cycle.memory, cycle.config);

        // Proactive enrichment
        const proactiveTasks = await this._proactiveEnrichment(cycle);

        return { proactiveTasks };
    }

    async _proactiveEnrichment(cycle) {
        const proactiveTasks = await cycle.lm.proactiveEnrichment(cycle.memory.getAllTasks());
        cycle.memory.addTasks(proactiveTasks);
        return proactiveTasks;
    }
}

module.exports = EnrichmentPhase;
