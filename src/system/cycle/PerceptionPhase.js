const BasePhase = require('./BasePhase');

class PerceptionPhase extends BasePhase {
    constructor() {
        super('Perception');
    }

    async execute(cycle) {
        await cycle.perception.processEvents();
    }
}

module.exports = PerceptionPhase;
