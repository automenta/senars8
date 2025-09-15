import System from '../system/System.js';
import { parseTerm } from '../parser/narseseParser.js';
import Task from '../core/Task.js';
import { handleError } from '../utils/error-handler.js';
import EventBus from '../system/EventBus.js';

/**
 * Agent class provides a high-level interface for controlling the SeNARS system.
 * It encapsulates system initialization, action registration, and goal management.
 */
class Agent {
    /**
     * @param {object} [config={}] - Optional configuration to override system defaults.
     */
    constructor(config = {}) {
        this.system = null;
        this.config = config;
        this.isInitialized = false;
    }

    /**
     * Initializes the agent and the underlying SeNARS system.
     * This method must be called before any other operations.
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            this.system = await System.create(this.config);
            this.isInitialized = true;
        } catch (error) {
            handleError(error, 'Failed to initialize agent');
        }
    }

    /**
     * Registers a new action handler for the agent to use.
     * @param {string} actionPattern - The name or regex pattern for the action.
     * @param {Function} handler - The async function to execute for the action.
     */
    addAction(actionPattern, handler) {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }
        this.system.actionExecutor.registerActionHandler(actionPattern, handler);
    }

    /**
     * Gives the agent a goal to achieve.
     * @param {string} goalString - The Narsese string representing the goal.
     * @param {number} [timeout=10000] - Timeout in milliseconds. Increased for model loading.
     * @returns {Promise<object>} A promise that resolves with the action result or rejects on failure/timeout.
     */
    async achieve(goalString, timeout = 10000) {
        if (!this.isInitialized) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }

        return new Promise(async (resolve, reject) => {
            const goalTerm = parseTerm(goalString);
            if (!goalTerm || !goalTerm.terms || goalTerm.terms.length === 0) {
                return reject(new Error(`Invalid goal string: ${goalString}`));
            }
            const actionName = goalTerm.terms[0].key;

            let isDone = false;
            let timeoutId;

            const listener = (actionRecord) => {
                if (actionRecord.action.name === actionName) {
                    if (isDone) return;
                    isDone = true;
                    clearTimeout(timeoutId);
                    EventBus.off('ActionExecuted', listener);
                    if (actionRecord.status === 'completed') {
                        resolve(actionRecord.result);
                    } else {
                        reject(new Error(actionRecord.error));
                    }
                }
            };

            EventBus.on('ActionExecuted', listener);

            timeoutId = setTimeout(() => {
                if (isDone) return;
                isDone = true;
                EventBus.off('ActionExecuted', listener);
                reject(new Error(`Goal achievement timed out for: ${goalString}`));
            }, timeout);

            const goalTask = new Task(goalTerm, '!', { frequency: 1.0, confidence: 0.9 });
            await this.system.addTasks([goalTask]);

            // Run cycles until the goal is achieved or timeout
            (async () => {
                while (!isDone) {
                    await this.system.runCycle();
                    await new Promise(r => setTimeout(r, 10));
                }
            })().catch(err => {
                if (!isDone) {
                    isDone = true;
                    clearTimeout(timeoutId);
                    EventBus.off('ActionExecuted', listener);
                    reject(err);
                }
            });
        });
    }
}

export default Agent;
