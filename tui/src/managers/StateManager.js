/**
 * Manages the application's state.
 */
export default class StateManager {
    constructor() {
        this.state = {
            isConnected: false,
            commandHistory: [],
            currentHistoryIndex: -1,
            agentData: null,
            log: [],
            tasks: [],
            focusedComponent: 'commandInput',
        };
    }

    /**
     * Get a value from the state.
     * @param {string} key - The state key to retrieve.
     * @returns {*} The value of the state key.
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set a value in the state.
     * @param {string} key - The state key to set.
     * @param {*} value - The value to set for the key.
     */
    set(key, value) {
        this.state[key] = value;
    }

    /**
     * Add a command to the history.
     * @param {string} command - The command to add.
     */
    addCommandToHistory(command) {
        if (command) {
            this.state.commandHistory.push(command);
            this.state.currentHistoryIndex = this.state.commandHistory.length;
        }
    }

    /**
     * Get the previous command from history.
     * @returns {string|null} The previous command or null if at the beginning.
     */
    getPreviousCommand() {
        if (this.state.commandHistory.length > 0 && this.state.currentHistoryIndex > 0) {
            this.state.currentHistoryIndex--;
            return this.state.commandHistory[this.state.currentHistoryIndex];
        }
        return null;
    }

    /**
     * Get the next command from history.
     * @returns {string|null} The next command or null if at the end.
     */
    getNextCommand() {
        if (this.state.commandHistory.length > 0 && this.state.currentHistoryIndex < this.state.commandHistory.length - 1) {
            this.state.currentHistoryIndex++;
            return this.state.commandHistory[this.state.currentHistoryIndex];
        } else {
            this.state.currentHistoryIndex = this.state.commandHistory.length;
            return '';
        }
    }

    /**
     * Add a log message.
     * @param {string} message - The log message to add.
     */
    addLog(message) {
        this.state.log.push(message);
    }

    /**
     * Set the tasks.
     * @param {Array} tasks - The array of tasks.
     */
    setTasks(tasks) {
        this.state.tasks = tasks;
    }
}