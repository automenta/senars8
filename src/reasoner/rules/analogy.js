import TruthValueManager from '../TruthValueManager.js';
import {createRule} from './rule-factories.js';
import Task from '../../core/Task.js';
import Term from '../../core/Term.js';

export default createRule({
    name: 'analogy',
    arity: 3,
    operands: [
        task => Task.isBelief(task),
        task => Task.isBelief(task),
        task => Task.isBelief(task)
    ],
    condition: (parsed1, parsed2, parsed3) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        parsed3?.type === 'Inheritance' &&
        Term.buildTermKey(parsed1.subject) === Term.buildTermKey(parsed3.subject) &&
        Term.buildTermKey(parsed2.subject) === Term.buildTermKey(parsed3.predicate),
    action: (parsed1, parsed2, parsed3, task1, task2, task3) => {
        const newTermKey = Term.buildTermKey({
            type: 'Inheritance',
            subject: parsed1.predicate,
            predicate: parsed2.predicate
        });
        const newTruthValue = TruthValueManager.analogize(
            task1.state.truthValue,
            task2.state.truthValue,
            task3.state.truthValue
        );
        return {newTermKey, newTruthValue};
    }
});
