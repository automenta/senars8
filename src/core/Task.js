const {v4: uuidv4} = require('uuid');

class Task {
    constructor(termKey, punctuation, truthValue = {
        frequency: 1.0,
        confidence: 0.9
    }, stamp = {creationTime: Date.now()}) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('Task termKey must be a non-empty string.');
        }
        if (!['.', '!', '?'].includes(punctuation)) {
            throw new Error('Task punctuation must be one of ".", "!", or "?".');
        }

        this.id = uuidv4();
        this.termKey = termKey;
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
