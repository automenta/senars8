const {v4: uuidv4} = require('uuid');

class Task {
    constructor(term, punctuation, truthValue = {
        frequency: 1.0,
        confidence: 0.9
    }, stamp = {creationTime: Date.now()}) {
        if (!term || typeof term.key !== 'string' || term.key.length === 0) {
            throw new Error('Task requires a valid term object with a non-empty key.');
        }
        if (!['.', '!', '?'].includes(punctuation)) {
            throw new Error('Task punctuation must be one of ".", "!", or "?".');
        }

        this.id = uuidv4();
        this.term = term;
        this.termKey = term.key;
        this.punctuation = punctuation;

        this.state = {
            priority: 0,
            truthValue: {
                frequency: truthValue.frequency,
                confidence: truthValue.confidence,
            },
            stamp: {
                creationTime: stamp.creationTime,
                occurrenceTime: stamp.occurrenceTime,
            },
        };
    }
}

module.exports = Task;
