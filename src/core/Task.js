const {v4: uuidv4} = require('uuid');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');

const DEFAULT_TRUTH_VALUE = config.DEFAULT_TRUTH_VALUE;

class Task {
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        // Validate required parameters
        const isValidTerm = term?.key;
        const isValidPunctuation = ['.', '!', '?'].includes(punctuation);
        
        if (!isValidTerm || !isValidPunctuation) {
            throw new Error('Invalid Task arguments');
        }

        // Initialize core properties
        this.id = uuidv4();
        this.term = term.type ? term : parseTerm(term.key);
        this.termKey = term.key;
        this.punctuation = punctuation;

        // Initialize state with default values
        this.state = {
            priority: 0,
            truthValue: {...DEFAULT_TRUTH_VALUE, ...truthValue},
            stamp: {
                creationTime: BigInt(Date.now()),
                lastAccessed: BigInt(Date.now()),
                ...stamp
            },
        };
    }

    /**
     * Update the last accessed timestamp to current time
     */
    touch() {
        this.state.stamp.lastAccessed = BigInt(Date.now());
    }
}

module.exports = Task;
