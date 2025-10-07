import Task from '../../core/core/Task.js';
import {parseTerm} from '../parser/parse-utils.js';

class NLP {
    async parse(nl) {
        const tasks = [];
        // Remove trailing punctuation before processing
        const trimmed = nl.toLowerCase().replace(/[.!?]+$/, '').trim();

        if (nl.toLowerCase().endsWith('?')) {
            const term = this._parseQuestion(trimmed.slice(0, -1));
            if (term) {
                tasks.push(new Task(term, '?', {}));
            }
        } else if (trimmed.startsWith('find out') || trimmed.startsWith('what is')) {
            const term = this._parseQuestion(trimmed);
            if (term) {
                tasks.push(new Task(term, '?', {}));
            }
        } else {
            const parts = trimmed.split(' ');
            if (parts.length === 4 && parts[1] === 'is' && parts[2] === 'a') {
                const subject = parts[0];
                const predicate = parts[3];
                const term = parseTerm(`(${subject} --> ${predicate})`);
                if (term) {
                    tasks.push(new Task(term, '.', {}));
                }
            } else {
                const term = parseTerm(`(${trimmed.replace(/ /g, '_')})`);
                if (term) {
                    tasks.push(new Task(term, '!', {}));
                }
            }
        }

        return tasks;
    }

    _parseQuestion(question) {
        const parts = question.split(' ');
        if (parts.length === 4 && parts[1] === 'is' && parts[2] === 'a') {
            const subject = parts[0];
            const predicate = parts[3].replace(/[.!?]+$/, ''); // Remove trailing punctuation
            return parseTerm(`(${subject} --> ${predicate})`);
        }
        // Remove any trailing punctuation from the question before processing
        const cleanQuestion = question.replace(/[.!?]+$/, '').replace(/ /g, '_');
        return parseTerm(`(${cleanQuestion})`);
    }
}

export default NLP;
