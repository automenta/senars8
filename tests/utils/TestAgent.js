/**
 * Simplified test-friendly Agent for use in tests without heavy mocking
 */
import {Agent} from '../../agent/index.js';
import {createSystem} from '../../core/index.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';

export class TestAgent extends Agent {
    constructor(options = {}) {
        super();
        this.options = options;
    }

    async initialize() {
        // Create a simplified system for testing that doesn't require heavy mocking
        this.system = await createSystemForTest(this.options.config || {});
        
        // Initialize without file monitoring for tests
        this.isInitialized = true;
        return true;
    }
}

/**
 * Creates a simplified system for testing purposes
 * @param {Object} config - Configuration options 
 * @returns {Object} Simplified system object for testing
 */
export async function createSystemForTest(config = {}) {
    // Create a lightweight system structure without external dependencies
    const system = {
        eventBus: createMockEventBus(),
        commandBus: createMockCommandBus(),
        memory: createMockMemory(),
        reasoner: createMockReasoner(),
        cycle: createMockCycle(),
        config: {...SYSTEM_CONSTANTS, ...config}
    };

    // Add simple mock methods
    system.initialize = async () => {};
    system.start = async () => {};
    system.stop = async () => {};

    return system;
}

function createMockEventBus() {
    return {
        events: new Map(),
        on: (event, callback) => {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(callback);
        },
        off: (event, callback) => {
            if (this.events.has(event)) {
                const listeners = this.events.get(event);
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        },
        emit: (event, ...args) => {
            if (this.events.has(event)) {
                this.events.get(event).forEach(callback => {
                    try {
                        callback(...args);
                    } catch (e) {
                        console.error(`Error in event listener for ${event}:`, e);
                    }
                });
            }
        }
    };
}

function createMockCommandBus() {
    return {
        commands: new Map(),
        request: async (command, payload) => {
            if (this.commands.has(command)) {
                return this.commands.get(command)(payload);
            }
            // Default response for most commands
            return { success: true, result: null };
        },
        handle: (command, handler) => {
            this.commands.set(command, handler);
        }
    };
}

function createMockMemory() {
    return {
        tasks: [],
        terms: new Map(),
        addTask: async (task) => {
            this.tasks.push(task);
            return task;
        },
        getTasks: (punctuation) => {
            if (!punctuation) return [...this.tasks];
            return this.tasks.filter(t => t.punctuation === punctuation);
        },
        getBeliefs: () => this.getTasks('.'),
        getGoals: () => this.getTasks('!'),
        getQuestions: () => this.getTasks('?'),
        addTerm: async (term) => {
            this.terms.set(term.key, term);
            return term;
        },
        getTerm: (key) => this.terms.get(key),
        indexer: {
            implicationIndex: new Map(),
            beliefIndex: new Map()
        }
    };
}

function createMockReasoner() {
    return {
        processTask: async (task) => {
            // For testing, return empty inferences
            return [];
        },
        getInferences: () => [],
        performInference: (tasks) => {
            // Simple inference logic for testing
            return [];
        }
    };
}

function createMockCycle() {
    return {
        run: async () => {},
        step: async () => {},
        runOnce: async () => {}
    };
}