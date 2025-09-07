const Task = require('../core/Task');
const { parseTerm } = require('../parser/narseseParser');
const TaskFactory = require('../core/TaskFactory');
const PatternDetector = require('../reasoner/PatternDetector');
const EventBus = require('./EventBus');

class Perception {
    constructor(memory, lm) {
        this.memory = memory;
        this.lm = lm;
        this.taskFactory = new TaskFactory(memory, lm);
        this.patternDetector = new PatternDetector();
        this.sensoryModalities = new Map();
        this.perceptionHistory = [];
    }

    registerSensoryModality(modalityName, processor) {
        this.sensoryModalities.set(modalityName, processor);
    }

    async processSensoryInput(modalityName, input) {
        const processor = this.sensoryModalities.get(modalityName);
        if (!processor) {
            throw new Error(`Unknown sensory modality: ${modalityName}`);
        }
        try {
            const tasks = await processor(input);
            this.perceptionHistory.push({ modality: modalityName, input, timestamp: Date.now(), tasks: tasks.length });
            return tasks;
        } catch (error) {
            // Error handling can be improved, e.g., by emitting an error event
            return [];
        }
    }

    async processEvents(events = []) {
        const taskPromises = events.map(event =>
            this.taskFactory.convertEventToTask(event).catch(() => null)
        );
        const newTasks = (await Promise.all(taskPromises)).filter(Boolean);

        if (newTasks.length > 0) {
            EventBus.emit('NewTasksCreated', newTasks);
        }
    }

    async processEventStream(eventStream) {
        const advancedPatterns = this.patternDetector.detectAdvancedPatterns(eventStream);
        const patternTasks = await Promise.all(advancedPatterns.map(p =>
            this.taskFactory.convertEventToTask({ type: 'observation', content: `pattern_${p.type}_${p.id}`, confidence: p.confidence })
        ));

        const eventTasks = await Promise.all(eventStream.map(e => this.taskFactory.convertEventToTask(e)));

        return [...patternTasks, ...eventTasks].filter(Boolean);
    }

    getPerceptionHistory() {
        return this.perceptionHistory;
    }

    clearPerceptionHistory() {
        this.perceptionHistory = [];
    }
}

module.exports = Perception;