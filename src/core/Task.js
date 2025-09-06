const {v4: uuidv4} = require('uuid');

const DEFAULT_TRUTH_VALUE = {frequency: 1.0, confidence: 0.9};

class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}, priority = 0) {
        if (!term?.key || !['.', '!', '?'].includes(punctuation)) {
            throw new Error('Invalid Task arguments');
        }

        this.id = uuidv4();
        this.term = term;
        this.termKey = term.key;
        this.punctuation = punctuation;

        this.state = {
            priority,
            truthValue: {...DEFAULT_TRUTH_VALUE, ...truthValue},
            stamp: {creationTime: Date.now(), ...stamp},
        };
    }
}

module.exports = Task;
