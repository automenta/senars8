import {Task} from '../index.js';
import {parseTerm} from '../parser/parse-utils.js';

class NLP {
    async parse(nl) {
        const tasks = [];
        const trimmed = nl.toLowerCase().trim();

        if (trimmed.endsWith('?')) {
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
                const predicate = parts[3].replace('.', '');
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
            const predicate = parts[3];
            return parseTerm(`(${subject} --> ${predicate})`);
        }
        return parseTerm(`(${question.replace(/ /g, '_')})`);
    }
}

export default NLP;
