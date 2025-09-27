import readline from 'readline';
import {debug, error as logError, info, warn} from '../../core/utils/logger.js';

class TuiView {
    constructor(agent, renderer, config = null) {
        this.agent = agent;
        this.renderer = renderer;
        this.config = config;
        this.rl = null;
        this.isRunning = false;
        this.updateInterval = null;
        this.lastRenderTime = 0;
        this.minRenderInterval = 100; // Minimum time between renders in ms

        // Use default update interval if config not provided
        this.updateIntervalMs = config ? config.getUpdateInterval() : 1000;
        
        // Track active input prompts to prevent conflicts
        this.awaitingInput = false;
        this.inputCallback = null;
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

        debug('TUI View started');
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

        debug('TUI View stopped');
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
        // Access the agent's system properties if available
        const system = this.agent?.system;
        
        // Get all memory items in a single call to reduce repeated calls to agent
        const memoryState = this._getMemoryState();
        
        return {
            isRunning: system?.isRunning || false,
            cycleCount: system?.cycleCount || 0,
            memory: memoryState,
            // Add additional system information
            systemInfo: {
                uptime: system?.getUptime ? system.getUptime() : null,
                version: system?.version || 'unknown'
            }
        };
    }

    /**
     * Efficiently get all memory state at once to reduce repeated agent calls
     * @returns {Object} - Memory state with tasks, beliefs, goals, questions
     */
    _getMemoryState() {
        if (!this.agent) {
            debug('TUI View: Agent not available for memory access');
            return { tasks: [], beliefs: [], goals: [], questions: [] };
        }

        // Use the agent's efficient method to get all task data
        try {
            return this.agent.getAllTaskData();
        } catch (error) {
            warn('Error getting memory state:', error.message);
            return { tasks: [], beliefs: [], goals: [], questions: [] };
        }
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
                if (this.agent) {
                    this.agent.stop();
                    console.log('Agent stopped');
                } else {
                    console.log('Agent not initialized');
                }
                break;
            case 'r':
            case 'run':
                if (this.agent) {
                    this.agent.start();
                    console.log('Agent started');
                } else {
                    console.log('Agent not initialized');
                }
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

    listBeliefs() {
        const beliefs = this.getBeliefs();
        if (beliefs.length === 0) {
            console.log('No beliefs in memory.');
            return;
        }
        
        console.log(`\nBeliefs (${beliefs.length}):`);
        beliefs.forEach((belief, index) => {
            console.log(`  ${index + 1}. ${belief.toString()}`);
        });
        console.log('');
    }

    listGoals() {
        const goals = this.getGoals();
        if (goals.length === 0) {
            console.log('No goals in memory.');
            return;
        }
        
        console.log(`\nGoals (${goals.length}):`);
        goals.forEach((goal, index) => {
            console.log(`  ${index + 1}. ${goal.toString()}`);
        });
        console.log('');
    }

    listTasks() {
        const tasks = this.getTasks();
        if (tasks.length === 0) {
            console.log('No tasks in memory.');
            return;
        }
        
        console.log(`\nTasks (${tasks.length}):`);
        tasks.forEach((task, index) => {
            console.log(`  ${index + 1}. ${task.toString()}`);
        });
        console.log('');
    }

    async addTask(content) {
        try {
            if (!this.agent?.system) {
                console.log('Agent system not available');
                warn('TUI addTask: Agent system not available');
                return;
            }

            // Parse the content into a term and create a task
            const {parseTerm, Task} = await import('../../core/index.js');
            const term = parseTerm(content);

            if (!term) {
                console.log(chalk.red(`Could not parse task content: ${content}`));
                warn(`TUI addTask: Could not parse content: ${content}`);
                return;
            }

            // Create a task with '?' punctuation (question type) by default
            const task = new Task(term, '?');

            // Add the task to the system
            await this.agent.system.addTasks([task]);

            console.log(chalk.green(`✓ Task added successfully: ${content}`));
            info(`TUI Task added: ${content}`);
            this.render(); // Re-render to show updated state
        } catch (error) {
            logError('Error adding task:', error);
            console.log(chalk.red(`✗ Error adding task: ${error.message}`));
        }
    }

    async addBelief(content) {
        try {
            if (!this.agent?.system) {
                console.log('Agent system not available');
                warn('TUI addBelief: Agent system not available');
                return;
            }

            // Parse the content into a term and create a belief
            const {parseTerm, Task} = await import('../../core/index.js');
            const term = parseTerm(content);

            if (!term) {
                console.log(chalk.red(`Could not parse belief content: ${content}`));
                warn(`TUI addBelief: Could not parse content: ${content}`);
                return;
            }

            // Create a belief task with '.' punctuation
            const task = new Task(term, '.');

            // Add the task to the system
            await this.agent.system.addTasks([task]);

            console.log(chalk.green(`✓ Belief added successfully: ${content}`));
            info(`TUI Belief added: ${content}`);
            this.render(); // Re-render to show updated state
        } catch (error) {
            logError('Error adding belief:', error);
            console.log(chalk.red(`✗ Error adding belief: ${error.message}`));
        }
    }
    
    async interpretNarsese(input) {
        try {
            if (!this.agent?.system) {
                console.log('Agent system not available');
                warn('TUI interpretNarsese: Agent system not available');
                return;
            }

            // Try to parse as Narsese
            const {parseTerm, Task} = await import('../../core/index.js');
            const term = parseTerm(input);

            if (!term) {
                console.log(chalk.yellow(`Unrecognized command or Narsese: ${input}. Type 'help' for available commands.`));
                return;
            }

            // Determine punctuation based on input or default to judgment
            let punctuation = '.';
            if (input.endsWith('?')) {
                punctuation = '?';
            } else if (input.endsWith('!')) {
                punctuation = '!';
            }

            // Create a task
            const task = new Task(term, punctuation);

            // Add the task to the system
            await this.agent.system.addTasks([task]);

            let taskType = 'Judgment';
            if (punctuation === '?') taskType = 'Question';
            else if (punctuation === '!') taskType = 'Goal';

            console.log(chalk.green(`✓ ${taskType} added successfully: ${input}`));
            info(`TUI Narsese added: ${input}`);
            this.render(); // Re-render to show updated state
        } catch (error) {
            logError('Error interpreting Narsese:', error);
            console.log(chalk.red(`✗ Error interpreting Narsese: ${error.message}`));
        }
    }
}

export {TuiView};