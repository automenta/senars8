const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const {handleErrorWithDefault} = require('../../utils/error-handler');
const Term = require('../../core/Term');

function parseTaskTerm(task) {
    try {
        // If it's a Term object, get its parsed structure
        if (task.term && typeof task.term._getStructure === 'function') {
            const structure = task.term._getStructure();
            return structure && structure.type ? structure : null;
        }
        // Otherwise, use the term directly
        return task.term;
    } catch (error) {
        return null;
    }
}

function validateTermKey(termKey) {
    // Validate the generated term key before parsing
    if (!termKey || typeof termKey !== 'string' || termKey.length === 0) {
        return false;
    }

    // Additional validation to catch invalid term keys that would cause parsing errors
    return !(termKey.includes('( --> )') || termKey.includes('( ==> )') ||
        termKey.includes('( <-> )') || termKey.includes('( <=> )'));
}

function createRule(spec) {
    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        condition: (...tasks) => {
            try {
                // For each task, get the parsed structure of the term
                const parsedTasks = tasks.map(parseTaskTerm);

                // If any parsed task is null, don't proceed with the condition
                if (parsedTasks.some(task => task === null)) {
                    return false;
                }

                return spec.condition(...parsedTasks);
            } catch (error) {
                return false;
            }
        },
        action: (...tasks) => {
            try {
                // For each task, get the parsed structure of the term
                const parsedTasks = tasks.map(parseTaskTerm);

                // If any parsed task is null, don't proceed with the action
                if (parsedTasks.some(task => task === null)) {
                    return null;
                }

                const result = spec.action(...parsedTasks, ...tasks);
                if (!result) return null;

                const {newTermKey, newTruthValue} = result;

                // Validate the generated term key
                if (!validateTermKey(newTermKey)) {
                    return null;
                }

                let parsedTerm;
                try {
                    parsedTerm = parseTerm(newTermKey);
                } catch (error) {
                    return null;
                }

                if (!parsedTerm) {
                    return null;
                }

                return new Task(parsedTerm, '.', newTruthValue);
            } catch (error) {
                return null;
            }
        },
    };
}

function createBinaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [
            Task.isBelief,
            Task.isBelief,
        ],
        condition: (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.predicate) &&
            Term.buildTermKey(parsed1.subject) !== Term.buildTermKey(parsed2.subject),
        action: (parsed1, parsed2, task1, task2) => ({
            newTermKey: termBuilder(parsed1, parsed2),
            newTruthValue: truthValueFunction(task1.state.truthValue, task2.state.truthValue)
        }),
    });
}

function createTransitiveInheritanceRule(name, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [
            Task.isBelief,
            Task.isBelief,
        ],
        condition: (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.subject),
        action: (parsed1, parsed2, task1, task2) => ({
            newTermKey: termBuilder(parsed1, parsed2),
            newTruthValue: truthValueFunction(task1.state.truthValue, task2.state.truthValue)
        }),
    });
}

function createUnaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 1,
        operands: [
            Task.isBelief,
        ],
        condition: (parsed1) =>
            parsed1?.type === 'Inheritance',
        action: (parsed1, task1) => ({
            newTermKey: termBuilder(parsed1),
            newTruthValue: truthValueFunction(task1.state.truthValue)
        }),
    });
}

function createModusPonensRule(name, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [
            Task.isBelief,
            Task.isBelief,
        ],
        condition: (parsed1, parsed2) =>
            parsed1?.type === 'Implication' &&
            parsed2?.type === 'Atomic' &&
            Term.buildTermKey(parsed1.subject) === Term.buildTermKey(parsed2),
        action: (parsed1, parsed2, task1, task2) => ({
            newTermKey: termBuilder(parsed1, parsed2),
            newTruthValue: truthValueFunction(task1.state.truthValue, task2.state.truthValue)
        }),
    });
}

module.exports = {
    createRule,
    createBinaryInheritanceRule,
    createTransitiveInheritanceRule,
    createUnaryInheritanceRule,
    createModusPonensRule
};
