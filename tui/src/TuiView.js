import readline from 'readline';
import { debug, error as logError, warn, info } from '../../core/utils/logger.js';

class TuiView {
    constructor(agent, renderer, config = null) {
        this.agent = agent;
        this.renderer = renderer;
        this.config = config;
        this.rl = null;
        this.isRunning = false;
        this.updateInterval = null;
        
        // Use default update interval if config not provided
        this.updateIntervalMs = config ? config.getUpdateInterval() : 1000;
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

        // Initial render
        this.render();

        // Set up periodic updates using configured interval
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
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
        if (!this.isRunning) return;
        
        try {
            // Get system state for rendering
            const systemState = this.getSystemState();
            this.renderer.render(systemState);
        } catch (error) {
            this.renderer.renderError(error);
        }
    }

    getSystemState() {
        // Create a simplified system state representation for the UI
        // Access the agent's system properties if available
        const system = this.agent?.system;
        return {
            isRunning: system?.isRunning || false,
            cycleCount: system?.cycleCount || 0,
            memory: {
                tasks: this.getTasks(),
                beliefs: this.getBeliefs(),
                goals: this.getGoals(),
                questions: this.getQuestions()
            }
        };
    }

    getTasks() {
        // Access tasks from the agent's memory
        if (this.agent?.getAllTasks) {
            return this.agent.getAllTasks() || [];
        }
        return [];
    }

    getBeliefs() {
        // Access beliefs from the agent's memory
        if (this.agent?.getBeliefs) {
            return this.agent.getBeliefs() || [];
        }
        return [];
    }

    getGoals() {
        // Access goals from the agent's memory
        if (this.agent?.getGoals) {
            return this.agent.getGoals() || [];
        }
        return [];
    }

    getQuestions() {
        // Access questions from the agent's memory
        if (this.agent?.getQuestions) {
            return this.agent.getQuestions() || [];
        }
        return [];
    }

    async handleUserInput(input) {
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
                console.log('Enter a new task:');
                this.rl.question('> ', async (taskInput) => {
                    if (taskInput.trim()) {
                        await this.addTask(taskInput.trim());
                    } else {
                        console.log('Task content cannot be empty');
                    }
                });
                break;
            case 'a':
            case 'add':
                console.log('Enter a new belief:');
                this.rl.question('> ', async (beliefInput) => {
                    if (beliefInput.trim()) {
                        await this.addBelief(beliefInput.trim());
                    } else {
                        console.log('Belief content cannot be empty');
                    }
                });
                break;
            case 'help':
            case 'h':
                this.showHelp();
                break;
            default:
                console.log(`Unknown command: ${input}. Type 'help' for available commands.`);
        }
    }

    showHelp() {
        console.log('\nAvailable commands:');
        console.log('  s/stop   - Stop the agent');
        console.log('  r/run    - Start the agent');
        console.log('  t/task   - Add a new task');
        console.log('  a/add    - Add a new belief');
        console.log('  h/help   - Show this help message');
        console.log('  q/quit   - Quit the application');
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
            const { parseTerm, Task } = await import('../../core/index.js');
            const term = parseTerm(content);
            
            if (!term) {
                console.log(`Could not parse task content: ${content}`);
                warn(`TUI addTask: Could not parse content: ${content}`);
                return;
            }

            // Create a task with '?' punctuation (question type) by default
            const task = new Task(term, '?');
            
            // Add the task to the system
            await this.agent.system.addTasks([task]);
            
            console.log(`Task added successfully: ${content}`);
            info(`TUI Task added: ${content}`);
        } catch (error) {
            logError('Error adding task:', error);
            console.error('Error adding task:', error.message);
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
            const { parseTerm, Task } = await import('../../core/index.js');
            const term = parseTerm(content);
            
            if (!term) {
                console.log(`Could not parse belief content: ${content}`);
                warn(`TUI addBelief: Could not parse content: ${content}`);
                return;
            }

            // Create a belief task with '.' punctuation
            const task = new Task(term, '.');
            
            // Add the task to the system
            await this.agent.system.addTasks([task]);
            
            console.log(`Belief added successfully: ${content}`);
            info(`TUI Belief added: ${content}`);
        } catch (error) {
            logError('Error adding belief:', error);
            console.error('Error adding belief:', error.message);
        }
    }
}

export { TuiView };