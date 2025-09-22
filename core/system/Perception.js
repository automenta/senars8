import PatternDetector from '../reasoner/PatternDetector.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('Perception');

class Perception {
    constructor(memory, taskFactory, eventBus) {
        this.memory = memory;
        this.taskFactory = taskFactory;
        this.eventBus = eventBus;
        this.patternDetector = new PatternDetector();
        this.sensoryModalities = new Map();
        this.perceptionHistory = [];
    }

    registerSensoryModality(modalityName, processor) {
        this.sensoryModalities.set(modalityName, processor);
    }

    async processSensoryInput(modalityName, input) {
        const processor = this.sensoryModalities.get(modalityName);
        if (!processor) throw new Error(`Unknown sensory modality: ${modalityName}`);
        return await errorHandler.execute(async () => {
            const tasks = await processor(input);
            this.perceptionHistory.push({
                modality: modalityName,
                input,
                timestamp: Date.now(),
                tasks: tasks.length,
            });
            return tasks;
        }, `processSensoryInput for modality ${modalityName}`, []);
    }

    async process(events) {
        return await errorHandler.execute(async () => {
            const patternTasks = this.patternDetector.detectPatterns(events);
            const eventTasks = events.map(event => this.taskFactory.convertEventToTask(event));
            return (await Promise.all([...patternTasks, ...eventTasks])).filter(Boolean);
        }, 'process', []);
    }

    getPerceptionHistory() {
        return this.perceptionHistory;
    }

    clearPerceptionHistory() {
        this.perceptionHistory = [];
    }



    getSensoryModalities() {
        return [...this.sensoryModalities.keys()];
    }
}

export default Perception;
