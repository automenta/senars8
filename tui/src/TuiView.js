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
    
    _initializeServices() {
        // Initialize system state with agent service
        // Listen for state updates from the agent service
        this.agentService.on(MESSAGE_TYPES.AGENT_STATE_UPDATE, (state) => {
            this.systemState = {
                ...this.systemState,
                ...state
            };
        });

        // Listen for system stats
        this.agentService.on(MESSAGE_TYPES.SYSTEM_STATS, (stats) => {
            this.systemState = {
                ...this.systemState,
                ...stats,
                isRunning: stats.isRunning || this.systemState.isRunning
            };
        });

        // Listen for status changes
        this.agentService.on(MESSAGE_TYPES.STATUS, (status) => {
            this.systemState.isRunning = status === 'connected';
        });

        // Listen for task additions (these come as separate events)
        this.agentService.on('add_belief', (belief) => {
            console.log(`Received belief: ${JSON.stringify(belief)}`);
        });

        this.agentService.on('add_goal', (goal) => {
            console.log(`Received goal: ${JSON.stringify(goal)}`);
        });

        this.agentService.on('add_question', (question) => {
            console.log(`Received question: ${JSON.stringify(question)}`);
        });

        this.agentService.on('task_added', (task) => {
            console.log(`Task added: ${JSON.stringify(task)}`);
        });
    }

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

    showHelp() {
        console.log('\nAvailable commands:');
        console.log('  s/stop        - Stop the agent');
        console.log('  r/run         - Start the agent');
        console.log('  t/task        - Add a new task');
        console.log('  a/add         - Add a new belief');
        console.log('  b/beliefs     - List current beliefs');
        console.log('  g/goals       - List current goals');
        console.log('  l/tasks       - List current tasks');
        console.log('  c/clear       - Clear the screen');
        console.log('  h/help        - Show this help message');
        console.log('  q/quit/exit   - Quit the application');
        console.log('  <narsese>     - Enter Narsese directly');
        console.log('');
    }

    listBeliefs() {\n        // Since we can't get detailed beliefs via WebSocket directly,\n        // we'll display the count from system state\n        const beliefsCount = this.agentService.getBeliefsCount() || this.systemState.beliefsCount || 0;\n        console.log(`\\nBeliefs: ${beliefsCount}`);\n        if (beliefsCount > 0) {\n            console.log('(Detailed beliefs list not available via WebSocket. For detailed list, use search feature.)');\n        }\n        console.log('');\n    }\n\n    listGoals() {\n        const goalsCount = this.agentService.getGoalsCount() || this.systemState.goalsCount || 0;\n        console.log(`\\nGoals: ${goalsCount}`);\n        if (goalsCount > 0) {\n            console.log('(Detailed goals list not available via WebSocket. For detailed list, use search feature.)');\n        }\n        console.log('');\n    }\n\n    listTasks() {\n        // Get the combined count or use the cycle count as an indicator\n        const totalTasks = (this.systemState.beliefsCount || 0) + \n                          (this.systemState.goalsCount || 0) + \n                          (this.systemState.questionsCount || 0);\n        \n        console.log(`\\nTasks: ${totalTasks}`);\n        console.log('(Detailed tasks list not available via WebSocket. For detailed list, use search feature.)');\n        console.log('');\n    }

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
            
            let taskType = 'Judgment';
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
}

export {TuiView};