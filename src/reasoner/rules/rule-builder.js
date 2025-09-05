const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/NewParser');

function createRule(spec) {
    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        condition: (...tasks) => {
            const parsedTasks = tasks.map(t => t.term);
            return spec.condition(...parsedTasks);
        },
        action: (...tasks) => {
            const parsedTasks = tasks.map(t => t.term);
            const result = spec.action(...parsedTasks, ...tasks);
            if (!result) return null;

            const {newTermKey, newTruthValue} = result;
            return new Task(parseTerm(newTermKey), '.', newTruthValue);
        },
    };
}

module.exports = {createRule};
