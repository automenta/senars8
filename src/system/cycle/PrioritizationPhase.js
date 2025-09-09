const BasePhase = require('./BasePhase');

class PrioritizationPhase extends BasePhase {
    constructor() {
        super('Prioritization');
    }

    execute(cycle, context) {
        const { currentTime, driveEmbeddings } = context;
        cycle.memory.getAllTasks().forEach(task => {
            task.state.priority = cycle.priorityManager.calculatePriority(task, currentTime, driveEmbeddings);
        });
    }
}

module.exports = PrioritizationPhase;
