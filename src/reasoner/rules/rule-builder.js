const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/NewParser');

function createRule(spec) {
    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        condition: (...tasks) => {
            const parsedTasks = tasks.map(t => parseTerm(t.termKey));
            return spec.condition(...parsedTasks);
        },
        action: (...tasks) => {
            const parsedTasks = tasks.map(t => parseTerm(t.termKey));
            const result = spec.action(...parsedTasks, ...tasks);
            if (!result) return null;

            const {newTermKey, newTruthValue} = result;
            return new Task(parseTerm(newTermKey), '.', newTruthValue);
        },
    };
}

module.exports = {createRule};
