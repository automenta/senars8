import TruthValueManager from '../TruthValueManager.js';
import { createRule } from './rule-factories.js';
import Task from '../../core/Task.js';
import Term from '../../core/Term.js';

export default createRule({
    name: 'decomposition',
    arity: 2,
    operands: [
        task => Task.isBelief(task),
        task => Task.isBelief(task)
    ],
    condition: (parsed1, parsed2) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        Term.buildTermKey(parsed1.subject) === Term.buildTermKey(parsed2.predicate),
    action: (parsed1, parsed2, task1, task2) => {
        const newTermKey = Term.buildTermKey({
            type: 'Inheritance',
            subject: parsed2.subject,
            predicate: parsed1.predicate
        });
        const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
        return { newTermKey, newTruthValue };
    }
});
