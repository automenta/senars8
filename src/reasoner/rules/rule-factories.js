const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const {handleErrorWithDefault} = require('../../utils/error-handler');
const TruthValueManager = require('../TruthValueManager');
const Term = require('../../core/Term');

function createRule(spec) {
    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        condition: (...tasks) => {
            try {
                // For each task, get the parsed structure of the term
                const parsedTasks = tasks.map(t => {
                    try {
                        // If it's a Term object, get its parsed structure
                        if (t.term && typeof t.term._getStructure === 'function') {
                            const structure = t.term._getStructure();
                            // Return the structure if it's valid, otherwise return null to fail the condition
                            return structure && structure.type ? structure : null;
                        }
                        // Otherwise, use the term directly
                        return t.term;
                    } catch (error) {
                        handleErrorWithDefault(error, `Error parsing term in rule ${spec.name}`, null);
                        return null;
                    }
                });
                
                // If any parsed task is null, don't proceed with the condition
                if (parsedTasks.some(task => task === null)) {
                    return false;
                }
                
                return spec.condition(...parsedTasks);
            } catch (error) {
                handleErrorWithDefault(error, `Error in condition of rule ${spec.name}`, false);
                return false;
            }
        },
        action: (...tasks) => {
            try {
                // For each task, get the parsed structure of the term
                const parsedTasks = tasks.map(t => {
                    try {
                        // If it's a Term object, get its parsed structure
                        if (t.term && typeof t.term._getStructure === 'function') {
                            const structure = t.term._getStructure();
                            // Return the structure if it's valid, otherwise return null to fail the action
                            return structure && structure.type ? structure : null;
                        }
                        // Otherwise, use the term directly
                        return t.term;
                    } catch (error) {
                        handleErrorWithDefault(error, `Error parsing term in action of rule ${spec.name}`, null);
                        return null;
                    }
                });
                
                // If any parsed task is null, don't proceed with the action
                if (parsedTasks.some(task => task === null)) {
                    return null;
                }
                
                const result = spec.action(...parsedTasks, ...tasks);
                if (!result) return null;

                const {newTermKey, newTruthValue} = result;

                // Validate the generated term key before parsing
                if (!newTermKey || typeof newTermKey !== 'string' || newTermKey.length === 0) {
                    return null;
                }
                
                // Additional validation to catch invalid term keys that would cause parsing errors
                if (newTermKey.includes('( --> )') || newTermKey.includes('( ==> )') || 
                    newTermKey.includes('( <-> )') || newTermKey.includes('( <=> )')) {
                    return null;
                }

                let parsedTerm;
                try {
                    parsedTerm = parseTerm(newTermKey);
                } catch (error) {
                    handleErrorWithDefault(error, `Error parsing generated term in rule ${spec.name}`, null);
                    return null;
                }

                if (!parsedTerm) {
                    return null;
                }

                return new Task(parsedTerm, '.', newTruthValue);
            } catch (error) {
                handleErrorWithDefault(error, `Error in action of rule ${spec.name}`, null);
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
            (task) => Task.isBelief(task),
            (task) => Task.isBelief(task),
        ],
        condition: (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.predicate) &&
            Term.buildTermKey(parsed1.subject) !== Term.buildTermKey(parsed2.subject),
        action: (parsed1, parsed2, task1, task2) => {
            const newTermKey = termBuilder(parsed1, parsed2);
            const newTruthValue = truthValueFunction(task1.state.truthValue, task2.state.truthValue);
            return {newTermKey, newTruthValue};
        },
    });
}

module.exports = {createRule, createBinaryInheritanceRule};
