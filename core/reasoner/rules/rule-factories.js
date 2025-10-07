import Task from '../../core/Task.js';
import {isBelief} from '../../utils/task-utils.js';
import {parseTerm, validateTermKey} from '../../../coreagent/parser/parse-utils.js';
import Term from '../../core/Term.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('rule-factories');

const prepareTasks = (tasks, arity) => {
    if (tasks.length !== arity) return null;

    // More efficient approach: avoid creating intermediate arrays when possible
    const parsedTasks = new Array(arity);
    for (let i = 0; i < arity; i++) {
        parsedTasks[i] = parseTerm(tasks[i].termKey);
        if (!parsedTasks[i]) return null;
    }
    return parsedTasks;
};

const processActionResult = (result) => {
    if (!result?.newTermKey || !result.newTruthValue || !validateTermKey(result.newTermKey)) {
        return null;
    }
    const newParsedTerm = parseTerm(result.newTermKey);
    return newParsedTerm ? new Task(newParsedTerm, '.', result.newTruthValue) : null;
}

const createRule = (spec) => {
    const {name, arity, operands, condition, action} = spec;

    if (!name || !arity || !operands || !condition || !action) {
        throw new Error('Rule spec is missing required fields.');
    }

    const executeAndWrap = (fn, context, defaultVal) =>
        (...tasks) => errorHandler.executeSync(() => {
            const parsedTasks = prepareTasks(tasks, arity);
            return parsedTasks ? fn(parsedTasks, tasks) : defaultVal;
        }, context, defaultVal);


    return {
        name,
        arity,
        operands,
        description: spec.description || `Rule for ${name}`,
        condition: executeAndWrap(
            (parsedTasks) => condition(...parsedTasks),
            `condition-check-${name}`,
            false
        ),
        action: executeAndWrap(
            (parsedTasks, tasks) => {
                const result = action(...parsedTasks, ...tasks);
                return processActionResult(result);
            },
            `action-${name}`,
            null
        ),
    };
};

const createBinaryRule = (name, condition, termBuilder, truthValueFunction) => createRule({
    name,
    arity: 2,
    operands: [isBelief, isBelief],
    condition,
    action: (p1, p2, t1, t2) => ({
        newTermKey: termBuilder(p1, p2),
        newTruthValue: truthValueFunction(t1.state.truthValue, t2.state.truthValue),
    }),
});

const createUnaryRule = (name, condition, termBuilder, truthValueFunction) => createRule({
    name,
    arity: 1,
    operands: [isBelief],
    condition,
    action: (p1, t1) => ({
        newTermKey: termBuilder(p1),
        newTruthValue: truthValueFunction(t1.state.truthValue),
    }),
});

const createBinaryInheritanceRule = (name, termBuilder, truthValueFunction) => createBinaryRule(
    name,
    (p1, p2) => p1?.type === 'Inheritance' && p2?.type === 'Inheritance' &&
        Term.termKey(p1.predicate) === Term.termKey(p2.predicate) &&
        Term.termKey(p1.subject) !== Term.termKey(p2.subject),
    termBuilder,
    truthValueFunction
);

const createTransitiveInheritanceRule = (name, termBuilder, truthValueFunction) => createBinaryRule(
    name,
    (p1, p2) => p1?.type === 'Inheritance' && p2?.type === 'Inheritance' &&
        Term.termKey(p1.predicate) === Term.termKey(p2.subject),
    termBuilder,
    truthValueFunction
);

const createUnaryInheritanceRule = (name, termBuilder, truthValueFunction) => createUnaryRule(
    name,
    p1 => p1?.type === 'Inheritance',
    termBuilder,
    truthValueFunction
);

const createModusPonensRule = (name, termBuilder, truthValueFunction) => createBinaryRule(
    name,
    (p1, p2) => p1?.type === 'Implication' && p2?.type === 'Atomic' &&
        Term.termKey(p1.subject) === Term.termKey(p2),
    termBuilder,
    truthValueFunction
);

export {
    createRule,
    createUnaryRule,
    createBinaryRule,
    createBinaryInheritanceRule,
    createTransitiveInheritanceRule,
    createUnaryInheritanceRule,
    createModusPonensRule,
};
