import Task from '../../../core/Task.js';

function truthValueRevision(contradiction, context) {
    const { truthValueManager } = context;
    if (!truthValueManager) {
        throw new Error('TruthValueManager not provided in context');
    }
    const [task1, task2] = contradiction.tasks;
    const resolvedTruthValue = truthValueManager.resolveConflict(task1, task2);
    const resolutionTask = new Task(task1.term, '.', resolvedTruthValue);
    return [resolutionTask];
}

export default truthValueRevision;
