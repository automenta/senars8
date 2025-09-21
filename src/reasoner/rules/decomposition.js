import TruthValueManager from '../TruthValueManager.js';
import {createRule} from './rule-factories.js';
import { isBelief } from '../../utils/index.js';
import Term from '../../core/Term.js';

export default createRule({
    name: 'decomposition',
    arity: 2,
    operands: [
        task => isBelief(task),
        task => isBelief(task)
    ],
    condition: (parsed1, parsed2) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        Term.termKey(parsed1.subject) === Term.termKey(parsed2.predicate),
    action: (parsed1, parsed2, task1, task2) => {
        const newTermKey = Term.termKey({
            type: 'Inheritance',
            subject: parsed2.subject,
            predicate: parsed1.predicate
        });
        const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
        return {newTermKey, newTruthValue};
    }
});
