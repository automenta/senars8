const BasePhase = require('./BasePhase');

class MetaCognitionPhase extends BasePhase {
    constructor() {
        super('MetaCognition');
    }

    execute(cycle, context) {
        const { allTasks } = context;
        const contradictions = cycle.metaCognition.findContradictions(allTasks);

        if (contradictions.length === 0) {
            return { contradictions, metaTasks: [] };
        }

        const metaTasks = this._resolveContradictions(cycle, contradictions);
        return { contradictions, metaTasks };
    }

    _resolveContradictions(cycle, contradictions) {
        const metaTasks = contradictions.flatMap(contradiction =>
            cycle.metaCognition.resolve(contradiction, 'auto')
        );

        if (metaTasks.length > 0) {
            metaTasks.forEach(metaTask => metaTask.state.priority = cycle.config.META_TASK_PRIORITY);
            cycle.memory.addTasks(metaTasks);
        }
        return metaTasks;
    }
}

module.exports = MetaCognitionPhase;
