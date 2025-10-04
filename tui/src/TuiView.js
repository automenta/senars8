import {TuiRenderer} from './TuiRenderer.js';

/**
 * TUI View class that handles user interface commands and interactions
 */
export class TuiView {
    constructor(apiService, renderer) {
        this.apiService = apiService;
        this.renderer = renderer;
        this.commandMap = {
            stats: this.handleStatsCommand.bind(this),
            memory: this.handleMemoryCommand.bind(this),
            reset: this.handleResetCommand.bind(this),
            pause: this.handlePauseCommand.bind(this),
            resume: this.handleResumeCommand.bind(this)
        };
    }

    /**
     * Handle stats command - display statistics
     */
    handleStatsCommand() {
        console.log('Handling stats command');
        // In a real implementation, this would retrieve and display statistics
        return this.apiService.getAgentState();
    }

    /**
     * Handle memory command - display memory contents
     */
    handleMemoryCommand() {
        console.log('Handling memory command');
        // In a real implementation, this would retrieve and display memory
        return this.apiService.getAgentState().memory;
    }

    /**
     * Handle reset command - reset the agent
     */
    handleResetCommand() {
        console.log('Handling reset command');
        return this.apiService.sendAgentControl('reset');
    }

    /**
     * Handle pause command - pause the agent
     */
    handlePauseCommand() {
        console.log('Handling pause command');
        return this.apiService.sendAgentControl('pause');
    }

    /**
     * Handle resume command - resume the agent
     */
    handleResumeCommand() {
        console.log('Handling resume command');
        return this.apiService.sendAgentControl('resume');
    }

    /**
     * Execute a command by name
     * @param {string} commandName - Name of the command to execute
     * @param {Array} args - Arguments for the command
     */
    executeCommand(commandName, args = []) {
        const command = this.commandMap[commandName];
        if (command) {
            return command(...args);
        } else {
            throw new Error(`Unknown command: ${commandName}`);
        }
    }
}