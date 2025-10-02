import Memory from './Memory.js';
import MemoryIndexer from './MemoryIndexer.js';
import {consolidateMemory, getHighestPriorityTasksWithPQ} from './memoryUtils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';

// Export memory components
export {
    Memory,
    MemoryIndexer,
    consolidateMemory,
    getHighestPriorityTasksWithPQ,
    TimeBasedForgettingStrategy
};