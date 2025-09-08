const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');

function createBinaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [
            (task) => isBelief(task),
            (task) => isBelief(task),
        ],
        condition: (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            buildTermKey(parsed1.predicate) === buildTermKey(parsed2.predicate) &&
            buildTermKey(parsed1.subject) !== buildTermKey(parsed2.subject),
        action: (parsed1, parsed2, task1, task2) => {
            const newTermKey = termBuilder(parsed1, parsed2);
            const newTruthValue = truthValueFunction(task1.state.truthValue, task2.state.truthValue);
            return {newTermKey, newTruthValue};
        },
    });
}

module.exports = {createBinaryInheritanceRule};
