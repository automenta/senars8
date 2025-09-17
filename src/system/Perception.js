import TaskFactory from '../core/TaskFactory.js';
import PatternDetector from '../reasoner/PatternDetector.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

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
        return await errorHandler.safeAsync(async () => {
            const tasks = await processor(input);
            this.perceptionHistory.push({
                modality: modalityName,
                input,
                timestamp: Date.now(),
                tasks: tasks.length
            });
            return tasks;
        }, `processSensoryInput for modality ${modalityName}`, []);
    }

    async process(events) {
        return await errorHandler.safeAsync(async () => {
            const patternTasks = this.patternDetector.detectPatterns(events);
            const eventTasks = events.map(event => this.taskFactory.convertEventToTask(event));
            const allTasks = await Promise.all([...patternTasks, ...eventTasks]);
            return allTasks.filter(Boolean);
        }, 'process', []);
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
