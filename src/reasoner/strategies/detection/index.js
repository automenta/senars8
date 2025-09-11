import analyzeDirectNegation from './direct-negation.js';
import analyzeInheritanceConflict from './inheritance-conflict.js';
import analyzeImplicationConflict from './implication-conflict.js';
import analyzeEquivalenceConflict from './equivalence-conflict.js';
import analyzeSetConflict from './set-conflict.js';
import analyzeIntensionalSetConflict from './intensional-set-conflict.js';
import analyzeConjunctionConflict from './conjunction-conflict.js';
import analyzeDisjunctionConflict from './disjunction-conflict.js';
import analyzeFrequencyConflict from './frequency-conflict.js';
import analyzeGoalConflict from './goal-conflict.js';

export const detectionStrategies = [
    analyzeDirectNegation,
    analyzeInheritanceConflict,
    analyzeImplicationConflict,
    analyzeEquivalenceConflict,
    analyzeSetConflict,
    analyzeIntensionalSetConflict,
    analyzeConjunctionConflict,
    analyzeDisjunctionConflict,
    analyzeFrequencyConflict,
    analyzeGoalConflict,
];
