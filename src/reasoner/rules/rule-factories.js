import Task from '../../core/Task.js';
import {isBelief} from '../../utils/task-utils.js';
import {parseTerm, validateTermKey} from '../../parser/parse-utils.js';
import Term from '../../core/Term.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('rule-factories');

function createRule(spec) {
    const {
        name,
        arity,
        operands,
        condition,
        action
    } = spec;

    if (!name || !arity || !operands || !condition || !action) {
        throw new Error('Rule spec is missing required fields.');
    }

    return {
        name,
        arity,
        operands,
        description: spec.description || `Rule for ${name}`,
        condition: (...tasks) => errorHandler.safeSync(() => {
            if (tasks.length !== arity) return false;
            const parsedTasks = tasks.map(t => parseTerm(t.termKey));
            if (parsedTasks.some(t => !t)) return false;
            return condition(...parsedTasks);
        }, `condition-check-${name}`, false),
        action: (...tasks) => errorHandler.safeSync(() => {
            if (tasks.length !== arity) return null;
            const parsedTasks = tasks.map(t => parseTerm(t.termKey));
            if (parsedTasks.some(t => !t)) return null;

            const result = action(...parsedTasks, ...tasks);
            if (!result?.newTermKey || !result.newTruthValue) return null;
            if (!validateTermKey(result.newTermKey)) return null;

            const parsedTerm = parseTerm(result.newTermKey);
            return parsedTerm ? new Task(parsedTerm, '.', result.newTruthValue) : null;
        }, `action-${name}`, null),
    };
}

function createBinaryRule(name, condition, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [isBelief, isBelief],
        condition,
        action: (p1, p2, t1, t2) => ({
            newTermKey: termBuilder(p1, p2),
            newTruthValue: truthValueFunction(t1.state.truthValue, t2.state.truthValue),
        }),
    });
}

function createUnaryRule(name, condition, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 1,
        operands: [isBelief],
        condition,
        action: (p1, t1) => ({
            newTermKey: termBuilder(p1),
            newTruthValue: truthValueFunction(t1.state.truthValue),
        }),
    });
}

function createBinaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (p1, p2) => p1?.type === 'Inheritance' && p2?.type === 'Inheritance' &&
            Term.termKey(p1.predicate) === Term.termKey(p2.predicate) &&
            Term.termKey(p1.subject) !== Term.termKey(p2.subject),
        termBuilder,
        truthValueFunction
    );
}

function createTransitiveInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (p1, p2) => p1?.type === 'Inheritance' && p2?.type === 'Inheritance' &&
            Term.termKey(p1.predicate) === Term.termKey(p2.subject),
        termBuilder,
        truthValueFunction
    );
}

function createUnaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createUnaryRule(name, p1 => p1?.type === 'Inheritance', termBuilder, truthValueFunction);
}

function createModusPonensRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (p1, p2) => p1?.type === 'Implication' && p2?.type === 'Atomic' &&
            Term.termKey(p1.subject) === Term.termKey(p2),
        termBuilder,
        truthValueFunction
    );
}

export {
    createRule,
    createUnaryRule,
    createBinaryRule,
    createBinaryInheritanceRule,
    createTransitiveInheritanceRule,
    createUnaryInheritanceRule,
    createModusPonensRule,
};
