const TruthValueManager = require('../TruthValueManager');
const {createModusPonensRule} = require('./rule-factories');
const Term = require('../../core/Term');

module.exports = createModusPonensRule(
    'modus-ponens',
    (parsed1, parsed2) => Term.buildTermKey(parsed1.predicate),
    TruthValueManager.deduce
);
