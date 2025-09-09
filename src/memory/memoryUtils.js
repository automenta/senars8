const Term = require('../core/Term');
const Task = require('../core/Task');
const { parseTerm } = require('../parser/narseseParser');
const { info, error } = require('../utils/logger');
const { handleError } = require('../utils/error-handler');


function exportMemoryState(memory) {
    const terms = Array.from(memory.terms.entries()).map(([key, term]) => ({
        key: term.key,
        embedding: Array.from(term.embedding),
        complexity: term.complexity
    }));

    const tasks = memory.getAllTasks().map(task => ({
        id: task.id,
        termKey: task.termKey,
        punctuation: task.punctuation,
        state: {
            priority: task.state.priority,
            truthValue: { ...task.state.truthValue },
            stamp: {
                creationTime: Number(task.state.stamp.creationTime),
                lastAccessed: Number(task.state.stamp.lastAccessed),
                ...(task.state.stamp.occurrenceTime && { occurrenceTime: Number(task.state.stamp.occurrenceTime) }),
                ...(task.state.stamp.endTime && { endTime: Number(task.state.stamp.endTime) })
            }
        }
    }));

    return {
        terms,
        tasks,
        timestamp: Date.now()
    };
}

async function importMemoryState(memory, state) {
    try {
        memory.clear();

        for (const termData of state.terms) {
            const term = new Term(termData.key, termData.embedding, termData.complexity);
            memory.addTerm(term);
        }

        for (const taskData of state.tasks) {
            try {
                const term = memory.getTerm(taskData.termKey) || parseTerm(taskData.termKey);
                if (term) {
                    const task = new Task(term, taskData.punctuation, taskData.state.truthValue, {
                        creationTime: BigInt(taskData.state.stamp.creationTime),
                        lastAccessed: BigInt(taskData.state.stamp.lastAccessed),
                        ...(taskData.state.stamp.occurrenceTime && { occurrenceTime: BigInt(taskData.state.stamp.occurrenceTime) }),
                        ...(taskData.state.stamp.endTime && { endTime: BigInt(taskData.state.stamp.endTime) })
                    });
                    task.id = taskData.id;
                    memory.addTasks([task]);
                }
            } catch (err) {
                error(`Error importing task ${taskData.id}:`, err);
            }
        }

        info(`Successfully imported memory state with ${state.terms.length} terms and ${state.tasks.length} tasks`);
    } catch (err) {
        error('Error importing memory state:', err);
        throw handleError(err, 'Memory state import failed');
    }
}

module.exports = {
    exportMemoryState,
    importMemoryState,
};
