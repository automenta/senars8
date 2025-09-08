const {v4: uuidv4} = require('uuid');
const {parseTerm} = require('../parser/narseseParser');

const DEFAULT_TRUTH_VALUE = {frequency: 1.0, confidence: 0.9};

class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        if (!term?.key || !['.', '!', '?'].includes(punctuation)) {
            throw new Error('Invalid Task arguments');
        }

        this.id = uuidv4();
        this.term = term.type ? term : parseTerm(term.key);
        this.termKey = term.key;
        this.punctuation = punctuation;

        this.state = {
            priority: 0,
            truthValue: { ...DEFAULT_TRUTH_VALUE, ...truthValue },
            stamp: {
                creationTime: BigInt(Date.now()),
                lastAccessed: BigInt(Date.now()),
                ...stamp
            },
        };
    }

    touch() {
        this.state.stamp.lastAccessed = BigInt(Date.now());
    }
}

module.exports = Task;
