import Task from '../../core/Task.js';
import Term from '../../core/Term.js';
import {parseTerm} from '../../parser/parse-utils.js';

function createMetaTask(action, targetTermKey, confidence) {
    // Create proper conjunction term structure to avoid string concatenation issues
    // Determine if action and targetTermKey are already parsed structures or string keys
    let actionStructure, targetStructure;
    
    // If action is already a parsed structure, use it; otherwise create an atomic structure
    if (typeof action === 'object' && action?.type) {
        actionStructure = action;
    } else {
        actionStructure = { type: 'Atomic', key: action };
    }
    
    // If targetTermKey is already a parsed structure, use it; otherwise create an atomic structure
    if (typeof targetTermKey === 'object' && targetTermKey?.type) {
        targetStructure = targetTermKey;
    } else {
        targetStructure = { type: 'Atomic', key: targetTermKey };
    }
    
    // Create conjunction term structure
    const conjunctionTermStructure = {
        type: 'Conjunction',
        terms: [actionStructure, targetStructure]
    };
    
    // Generate the term key string from the structure
    const metaTermKey = Term.termKey(conjunctionTermStructure);
    
    // If term key generation failed, return null
    if (!metaTermKey || metaTermKey === '') {
        return null;
    }
    
    // Parse the generated term key to get the parsed structure for the Task
    const parsedMetaTerm = parseTerm(metaTermKey);
    if (!parsedMetaTerm) {
        return null;
    }
    
    return new Task(parsedMetaTerm, '!', {
        frequency: 1.0,
        confidence
    });
}

export {createMetaTask};
