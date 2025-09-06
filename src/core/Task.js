const {v4: uuidv4} = require('uuid');
const {parseTerm} = require('../parser/narseseParser');

const DEFAULT_TRUTH_VALUE = {frequency: 1.0, confidence: 0.9};

class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}, priority = 0) {
        if (!term?.key || !['.', '!', '?'].includes(punctuation)) {
            throw new Error('Invalid Task arguments');
        }

        this.id = uuidv4();
        // Ensure that `this.term` is always a parsed Narsese object with a `.type` property.
        // This handles cases where the task is created from a `Term` instance instead of a parsed object.
        this.term = term.type ? term : parseTerm(term.key);
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
