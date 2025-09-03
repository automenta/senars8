const { parse } = require('./NarseseParser');
const Task = require('../core/Task');

const ruleRegistry = [];

function registerRule(rule) {
    ruleRegistry.push(rule);
}

function performInference(focusSet, memory) {
    let derivedTasks = [];
    for (const rule of ruleRegistry) {
        const newTasks = rule(focusSet, memory);
        derivedTasks = derivedTasks.concat(newTasks);
    }
    return derivedTasks;
}

/**
 * Deduction (Modus Ponens)
 *
 * Given:
 *  - A belief: P.
 *  - An implication: (P ==> Q).
 * Derives:
 *  - A new belief: Q.
 */
function deduction(focusSet, memory) {
    const derived = [];
    const beliefs = focusSet.filter(t => t.punctuation === '.');
    const implications = focusSet.filter(t => t.punctuation === '.' && parse(t.termKey).type === 'implication');

    for (const imp of implications) {
        const parsedImp = parse(imp.termKey);
        const premiseKey = parsedImp.subject;

        const premiseTask = beliefs.find(b => b.termKey === premiseKey);

        if (premiseTask) {
            const conclusionKey = parsedImp.predicate;

            // Avoid re-deriving existing tasks for now
            if (memory.getAllTasks().some(t => t.termKey === conclusionKey)) {
                continue;
            }

            // Truth value calculation (simplified)
            const newConfidence = premiseTask.state.truthValue.confidence * imp.state.truthValue.confidence;
            const newTruth = { frequency: 1.0, confidence: newConfidence };

            const derivation = { rule: 'deduction', premises: [premiseTask.id, imp.id] };
            const newTask = new Task(conclusionKey, '.', newTruth, { creationTime: Date.now() }, derivation);
            derived.push(newTask);
        }
    }
    return derived;
}


/**
 * Contradiction Detection
 *
 * Given a newly derived task and the current memory,
 * this rule identifies if the new task directly contradicts an existing one.
 * e.g., deriving `A.` when `(--, A).` already exists with high confidence.
 */
function detectContradiction(focusSet, memory) {
    // This rule is special. It operates on the output of other rules.
    // For now, we will integrate its logic into the main cycle loop after inference.
    // This stub is a placeholder for a more advanced implementation.
    return [];
}


// Register the rules
registerRule(deduction);
registerRule(detectContradiction);

module.exports = {
    performInference,
    registerRule,
};
