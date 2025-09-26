import readline from 'readline';
import { debug } from '../../core/utils/logger.js';

class TuiView {
    constructor(agent, renderer) {
        this.agent = agent;
        this.renderer = renderer;
        this.rl = null;
        this.isRunning = false;
        this.updateInterval = null;
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

        // Set up periodic updates (every 1 second)
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
                this.render();
            }
        }, 1000);

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

    handleUserInput(input) {
        const command = input.toLowerCase();

        switch (command) {
            case 's':
            case 'stop':
                if (this.system) {
                    this.system.stop();
                    console.log('System stopped');
                }
                break;
            case 'r':
            case 'run':
                if (this.system) {
                    this.system.start(10); // Run 10 cycles
                    console.log('System running for 10 cycles');
                }
                break;
            case 'q':
            case 'quit':
            case 'exit':
                console.log('Exiting...');
                process.exit(0);
                break;
            case 't':
            case 'task':
                console.log('Enter a new task:');
                this.rl.question('> ', (taskInput) => {
                    if (taskInput && this.system) {
                        // For now, just log the task, in a real implementation we would create a proper task
                        console.log(`Task entered: ${taskInput}`);
                    }
                });
                break;
            case 'a':
            case 'add':
                console.log('Enter a new belief:');
                this.rl.question('> ', (beliefInput) => {
                    if (beliefInput && this.system) {
                        // For now, just log the belief, in a real implementation we would create a proper belief
                        console.log(`Belief entered: ${beliefInput}`);
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
        console.log('  s/stop   - Stop the system');
        console.log('  r/run    - Run the system for 10 cycles');
        console.log('  t/task   - Add a new task');
        console.log('  a/add    - Add a new belief');
        console.log('  h/help   - Show this help message');
        console.log('  q/quit   - Quit the application');
        console.log('');
    }
}

export { TuiView };