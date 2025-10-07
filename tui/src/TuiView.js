/**
 * TUI View class that handles user interface commands and interactions
 * This class provides a command interface for TUI operations
 */
export class TuiView {
    constructor(apiService) {
        this.apiService = apiService;
        this.commandMap = {
            stats: this.handleStatsCommand.bind(this),
            memory: this.handleMemoryCommand.bind(this),
            reset: this.handleResetCommand.bind(this),
            pause: this.handlePauseCommand.bind(this),
            resume: this.handleResumeCommand.bind(this),
            beliefs: this.handleBeliefsCommand.bind(this),
            goals: this.handleGoalsCommand.bind(this),
            tasks: this.handleTasksCommand.bind(this)
        };
    }

    /**
     * Handle stats command - display statistics
     */
    handleStatsCommand() {
        const state = this.apiService.getAgentState();
        return {
            connectionStatus: state.connectionStatus,
            isRunning: state.isRunning,
            cycleCount: state.cycleCount,
            uptime: state.uptime,
            stats: state.stats
        };
    }

    /**
     * Handle memory command - display memory contents
     */
    handleMemoryCommand() {
        const state = this.apiService.getAgentState();
        return {
            beliefsCount: state.memory?.beliefs?.length || 0,
            goalsCount: state.memory?.goals?.length || 0,
            conceptsCount: state.memory?.concepts?.length || 0,
        };
    }

    /**
     * Handle beliefs command - display beliefs
     */
    handleBeliefsCommand() {
        const state = this.apiService.getAgentState();
        return state.memory?.beliefs || [];
    }

    /**
     * Handle goals command - display goals
     */
    handleGoalsCommand() {
        const state = this.apiService.getAgentState();
        return state.memory?.goals || [];
    }

    /**
     * Handle tasks command - display tasks
     */
    handleTasksCommand() {
        const state = this.apiService.getAgentState();
        return state.tasks || [];
    }

    /**
     * Handle reset command - reset the agent
     */
    handleResetCommand() {
        return this.apiService.sendAgentControl('reset');
    }

    /**
     * Handle pause command - pause the agent
     */
    handlePauseCommand() {
        return this.apiService.sendAgentControl('pause');
    }

    /**
     * Handle resume command - resume the agent
     */
    handleResumeCommand() {
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