import readline from 'readline';
import logger from '../../common/services/Logger.js';
import {MESSAGE_TYPES} from '../../common/constants/communication.js';

class TuiView {
    constructor(agentService, renderer, config = null) {
        this.agentService = agentService;
        this.renderer = renderer;
        this.config = config;
        this.rl = null;
        this.isRunning = false;
        this.updateInterval = null;
        this.lastRenderTime = 0;
        this.minRenderInterval = 100; // Minimum time between renders in ms
        this.systemState = {
            isRunning: false,
            cycleCount: 0,
            beliefsCount: 0,
            goalsCount: 0,
            questionsCount: 0,
            memoryUsage: 0
        };

        // Use default update interval if config not provided
        this.updateIntervalMs = config ? config.getUpdateInterval() : 1000;

        // Use shared logger instead of individual logger functions
        this.logger = logger.createNamespace('TuiView');

        // Track active input prompts to prevent conflicts
        this.awaitingInput = false;
        this.inputCallback = null;

        // Initialize shared services
        this._initializeServices();
    }

    _initializeServices() {\n        // Initialize system state with agent service\n        // Listen for state updates from the agent service\n        this.agentService.on(MESSAGE_TYPES.AGENT_STATE_UPDATE, (state) => {\n            this.systemState = {\n                ...this.systemState,\n                ...state\n            };\n            // Trigger a re-render when state updates\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        // Listen for system stats\n        this.agentService.on(MESSAGE_TYPES.SYSTEM_STATS, (stats) => {\n            this.systemState = {\n                ...this.systemState,\n                ...stats,\n                isRunning: stats.isRunning || this.systemState.isRunning\n            };\n            // Trigger a re-render when stats update\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        // Listen for status changes\n        this.agentService.on(MESSAGE_TYPES.STATUS, (status) => {\n            this.systemState.isRunning = status === 'connected';\n            // Log connection status changes\n            this.logger.info(`Connection status: ${status}`);\n            // Trigger a re-render when status changes\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        // Listen for task additions (these come as separate events)\n        this.agentService.on('add_belief', (belief) => {\n            this.logger.info(`New belief received: ${JSON.stringify(belief)}`);\n            // Trigger a re-render when new beliefs arrive\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        this.agentService.on('add_goal', (goal) => {\n            this.logger.info(`New goal received: ${JSON.stringify(goal)}`);\n            // Trigger a re-render when new goals arrive\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        this.agentService.on('add_question', (question) => {\n            this.logger.info(`New question received: ${JSON.stringify(question)}`);\n            // Trigger a re-render when new questions arrive\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        this.agentService.on('task_added', (task) => {\n            this.logger.info(`New task received: ${JSON.stringify(task)}`);\n            // Trigger a re-render when new tasks arrive\n            if (this.isRunning && !this.awaitingInput) {\n                this.render();\n            }\n        });\n\n        // Listen for general messages that might affect the display\n        this.agentService.on('message', (message) => {\n            if (message.type && message.type.includes('search_results')) {\n                // Display search results to the user\n                if (message.payload && Array.isArray(message.payload.results)) {\n                    console.log(`\\nSearch Results: Found ${message.payload.results.length} items matching \"${message.payload.query || 'query'}\"`);\n                    message.payload.results.slice(0, 5).forEach((result, i) => {\n                        console.log(`  ${i + 1}. ${result.termKey || result.id || result.content || JSON.stringify(result)}`);\n                    });\n                    if (message.payload.results.length > 5) {\n                        console.log(`  ... and ${message.payload.results.length - 5} more results`);\n                    }\n                    console.log('');\n                }\n            }\n        });\n    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;

        // Create readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Set up event listeners for user input
        this.rl.on('line', (input) => {
            this.handleUserInput(input.trim());
        });

        // Handle Ctrl+C gracefully
        this.rl.on('SIGINT', () => {
            console.log('\nReceived SIGINT, stopping...');
            this.stop();
            process.exit(0);
        });

        // Initial render
        this.render();

        // Set up periodic updates using configured interval
        this.updateInterval = setInterval(() => {
            if (this.isRunning && !this.awaitingInput) {
                this.render();
            }
        }, this.updateIntervalMs);

        // Request initial system stats to populate state
        this.agentService.getSystemStats();

        this.logger.debug('TUI View started');
    }

    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }

        this.logger.debug('TUI View stopped');
    }

    render() {
        // Prevent too frequent rendering
        const now = Date.now();
        if (now - this.lastRenderTime < this.minRenderInterval) {
            return;
        }

        if (!this.isRunning) return;

        try {
            // Get system state for rendering
            const systemState = this.getSystemState();
            this.renderer.render(systemState);
            this.lastRenderTime = now;
        } catch (error) {
            this.renderer.renderError(error);
        }
    }

    getSystemState() {
        // Create a simplified system state representation for the UI
        // Access system state from the agent service
        return {
            isRunning: this.agentService.isAgentRunning() || this.systemState.isRunning,
            cycleCount: this.systemState.cycleCount || 0,
            memory: {
                beliefs: [],
                goals: [],
                questions: [],
                tasks: []
            },
            // Add additional system information
            systemInfo: {
                beliefsCount: this.agentService.getBeliefsCount() || this.systemState.beliefsCount || 0,
                goalsCount: this.agentService.getGoalsCount() || this.systemState.goalsCount || 0,
                questionsCount: this.agentService.getQuestionsCount() || this.systemState.questionsCount || 0,
                cycleCount: this.agentService.getCycleCount() || this.systemState.cycleCount || 0,
                memoryUsage: this.systemState.memoryUsage || 0,
                version: 'unknown' // Version is typically not sent via WebSocket
            }
        };
    }

    /**
     * Efficiently get all memory state at once to reduce repeated agent calls
     * @returns {Object} - Memory state with tasks, beliefs, goals, questions
     */
    _getMemoryState() {
        // Return empty arrays as we can't get detailed memory state directly via WebSocket
        // Instead, we rely on updates from WebSocket messages
        return {
            tasks: [],
            beliefs: [],
            goals: [],
            questions: []
        };
    }

    async handleUserInput(input) {
        // If we're waiting for input from a previous command, handle it
        if (this.awaitingInput && this.inputCallback) {
            const callback = this.inputCallback;
            this.inputCallback = null;
            this.awaitingInput = false;
            await callback(input);
            return;
        }

        const command = input.toLowerCase();

        switch (command) {
            case 's':
            case 'search':
                await this.promptForInput('Enter search query:', this.performSearch.bind(this));
                break;
            case 'x':
            case 'stop':
                this.agentService.stopAgent();
                console.log('Agent stopped');
                this.logger.info('Agent stopped via TUI command');
                break;
            case 'r':
            case 'run':
                this.agentService.startAgent();
                console.log('Agent started');
                this.logger.info('Agent started via TUI command');
                break;
            case 'q':
            case 'quit':
            case 'exit':
                console.log('Exiting...');
                this.stop(); // Stop TUI components before exiting
                process.exit(0);
                break;
            case 't':
            case 'task':
                await this.promptForInput('Enter a new task:', this.addTask.bind(this));
                break;
            case 'a':
            case 'add':
                await this.promptForInput('Enter a new belief:', this.addBelief.bind(this));
                break;
            case 'b':
            case 'beliefs':
                this.listBeliefs();
                break;
            case 'g':
            case 'goals':
                this.listGoals();
                break;
            case 'l':
            case 'tasks':
                this.listTasks();
                break;
            case 'c':
            case 'clear':
                console.clear();
                break;
            case 'h':
            case 'help':
                this.showHelp();
                break;
            case '':
                // Empty input, just re-render
                this.render();
                break;
            default:
                // Try to interpret as Narsese input
                await this.interpretNarsese(input);
        }
    }

    async promptForInput(prompt, callback) {
        if (this.awaitingInput) {
            console.log('Already awaiting input, please complete previous command first.');
            return;
        }

        this.awaitingInput = true;
        this.inputCallback = callback;
        console.log(prompt);
        // The actual input will be handled in handleUserInput when the user responds
    }

    showHelp() {\n        console.log('\\nAvailable commands:');\n        console.log('  x/stop        - Stop the agent');\n        console.log('  r/run         - Start the agent');\n        console.log('  s/search      - Search beliefs/goals/questions');\n        console.log('  t/task        - Add a new task');\n        console.log('  a/add         - Add a new belief');\n        console.log('  b/beliefs     - List current beliefs');\n        console.log('  g/goals       - List current goals');\n        console.log('  l/tasks       - List current tasks');\n        console.log('  c/clear       - Clear the screen');\n        console.log('  h/help        - Show this help message');\n        console.log('  q/quit/exit   - Quit the application');\n        console.log('  <narsese>     - Enter Narsese directly');\n        console.log('');\n    }

    listBeliefs() {
        // Since we can't get detailed beliefs via WebSocket directly,
        // we'll display the count from system state
        const beliefsCount = this.agentService.getBeliefsCount() || this.systemState.beliefsCount || 0;
        console.log(`\nBeliefs: ${beliefsCount}`);
        if (beliefsCount > 0) {
            console.log('(Detailed beliefs list not available via WebSocket. For detailed list, use search feature.)');
        }
        console.log('');
    }

    listGoals() {
        const goalsCount = this.agentService.getGoalsCount() || this.systemState.goalsCount || 0;
        console.log(`\nGoals: ${goalsCount}`);
        if (goalsCount > 0) {
            console.log('(Detailed goals list not available via WebSocket. For detailed list, use search feature.)');
        }
        console.log('');
    }

    listTasks() {
        // Get the combined count or use the cycle count as an indicator
        const totalTasks = (this.systemState.beliefsCount || 0) +
                          (this.systemState.goalsCount || 0) +
                          (this.systemState.questionsCount || 0);
        
        console.log(`\nTasks: ${totalTasks}`);
        console.log('(Detailed tasks list not available via WebSocket. For detailed list, use search feature.)');
        console.log('');
    }

    async addTask(content) {
        try {
            // Use the agent service to add the task via WebSocket
            const taskData = {
                content: content,
                type: 'task'
            };

            this.agentService.addTask(taskData);

            console.log(`✓ Task added successfully: ${content}`);
            this.logger.info(`TUI Task added: ${content}`);
            // State will be updated via WebSocket messages automatically
        } catch (error) {
            this.logger.error('Error adding task:', error);
            console.log(`✗ Error adding task: ${error.message}`);
        }
    }

    async addBelief(content) {
        try {
            // Use the agent service to send Narsese via WebSocket
            // Beliefs typically end with '.'
            const narsese = content.endsWith('.') ? content : content + '.';
            this.agentService.sendNarsese(narsese);

            console.log(`✓ Belief added successfully: ${narsese}`);
            this.logger.info(`TUI Belief added: ${narsese}`);
            // State will be updated via WebSocket messages automatically
        } catch (error) {
            this.logger.error('Error adding belief:', error);
            console.log(`✗ Error adding belief: ${error.message}`);
        }
    }

    async interpretNarsese(input) {
        try {
            // Use the agent service to send Narsese via WebSocket
            this.agentService.sendNarsese(input);

            let taskType = 'Belief';
            if (input.endsWith('?')) {
                taskType = 'Question';
            } else if (input.endsWith('!')) {
                taskType = 'Goal';
            } else if (input.endsWith('.')) {
                taskType = 'Belief';
            }

            console.log(`✓ ${taskType} added successfully: ${input}`);
            this.logger.info(`TUI Narsese added: ${input}`);
            // State will be updated via WebSocket messages automatically
        } catch (error) {
            this.logger.error('Error interpreting Narsese:', error);
            console.log(`✗ Error interpreting Narsese: ${error.message}`);
        }
    }

    async performSearch(query) {
        try {
            // Use the agent service to search
            this.agentService.search(query);
            console.log(`Searching for: ${query}`);
            this.logger.info(`TUI Search initiated: ${query}`);
        } catch (error) {
            this.logger.error('Error performing search:', error);
            console.log(`✗ Error performing search: ${error.message}`);
        }
    }
}

export { TuiView };