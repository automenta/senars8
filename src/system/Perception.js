import TaskFactory from '../core/TaskFactory.js';
import PatternDetector from '../reasoner/PatternDetector.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

// Create a module-specific error handler
const errorHandler = createModuleErrorHandler('Perception');

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
            this.perceptionHistory.push({modality: modalityName, input, timestamp: Date.now(), tasks: tasks.length});
            return tasks;
        } catch (error) {
            return errorHandler.handleWithDefault(error, 'processSensoryInput', []);
        }
    }

    async process(events) {
        try {
            const patternTasks = await this.patternDetector.detectPatterns(events);
            const eventTasks = await Promise.all(
                events.map(event => this.taskFactory.convertEventToTask(event))
            );
            return [...patternTasks, ...eventTasks].filter(Boolean);
        } catch (error) {
            return errorHandler.handleWithDefault(error, 'process', []);
        }
    }

    async processEventStream(eventStream) {
        const advancedPatterns = this.patternDetector.detectAdvancedPatterns(eventStream);
        const patternTasks = await Promise.all(advancedPatterns.map(p =>
            this.taskFactory.convertEventToTask({
                type: 'observation',
                content: `pattern_${p.type}_${p.id}`,
                confidence: p.confidence
            })
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

    getSensoryModalities() {
        return Array.from(this.sensoryModalities.keys());
    }
}

export default Perception;
