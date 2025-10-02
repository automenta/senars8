import PatternDetector from '../reasoner/PatternDetector.js';
import {perceptionErrorHandler as errorHandler} from '../utils/errorHandler.js';
import {SystemCommands} from './SystemCommands.js';
import {SystemEvents} from './SystemEvents.js';

class Perception {
    constructor(memory, taskFactory, eventBus, commandBus) {
        this.memory = memory;
        this.taskFactory = taskFactory;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.patternDetector = new PatternDetector();
        this.sensoryModalities = new Map();
        this.perceptionHistory = [];

        this.commandBus.handle(SystemCommands.PROCESS_RAW_INPUT, (payload) => this._handleProcessRawInput(payload));
    }

    registerSensoryModality(modalityName, processor) {
        this.sensoryModalities.set(modalityName, processor);
    }

    async _handleProcessRawInput({modality, input}) {
        const processor = this.sensoryModalities.get(modality);
        if (!processor) {
            throw new Error(`Unknown sensory modality: ${modality}`);
        }

        return await errorHandler.execute(async () => {
            const tasks = await processor(input);
            this.perceptionHistory.push({
                modality,
                input,
                timestamp: Date.now(),
                tasks: tasks.length,
            });

            if (tasks && tasks.length > 0) {
                await this.eventBus.emitAsync(SystemEvents.TASKS_ADD, tasks);
            }

            return tasks;
        }, `_handleProcessRawInput for modality ${modality}`, []);
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
