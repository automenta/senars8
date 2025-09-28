import readline from 'readline';
import logger from '../../common/services/Logger.js';

class TuiView {
    constructor(apiService, renderer, config = null) {
        this.apiService = apiService;
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
            tasks: [],
            beliefs: [],
            goals: [],
            questions: [],
            notifications: [],
            memoryUsage: 0,
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
        // Listen for state updates from the common ApiService
        this.apiService.on('state_update', (newState) => {
            this.systemState = { ...this.systemState, ...newState };
            // Trigger a re-render when state updates
            if (this.isRunning && !this.awaitingInput) {
                this.render();
            }
        });

        // Listen for specific messages like search results that need direct console output
        this.apiService.on('search_results', (payload) => {
            if (payload && Array.isArray(payload.results)) {
                console.log(`\nSearch Results: Found ${payload.results.length} items matching "${payload.query || ''}"`);
                payload.results.slice(0, 5).forEach((result, i) => {
                    console.log(`  ${i + 1}. ${result.termKey || result.id || result.content || JSON.stringify(result)}`);
                });
                if (payload.results.length > 5) {
                    console.log(`  ... and ${payload.results.length - 5} more results`);
                }
                console.log('');
            }
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

        // Initial state is requested by ApiService on connect.
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
        // Create a simplified system state representation from the cached state
        const state = this.apiService.getAgentState();
        return {
            isRunning: state.isRunning,
            cycleCount: state.cycleCount,
            memory: {
                beliefs: state.beliefs || [],
                goals: state.goals || [],
                questions: state.questions || [],
                tasks: state.tasks || [],
            },
            systemInfo: {
                beliefsCount: state.beliefs?.length || 0,
                goalsCount: state.goals?.length || 0,
                questionsCount: state.questions?.length || 0,
                cycleCount: state.cycleCount || 0,
                memoryUsage: state.memoryUsage || 0,
                version: 'unknown',
            },
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
                this.apiService.sendAgentControl('stop');
                console.log('Agent stop command sent.');
                this.logger.info('Agent stop command sent via TUI.');
                break;
            case 'r':
            case 'run':
                this.apiService.sendAgentControl('start');
                console.log('Agent start command sent.');
                this.logger.info('Agent start command sent via TUI.');
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
                await this.promptForInput('Enter a new task:', this.interpretNarsese.bind(this));
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
        console.log('  x/stop        - Stop the agent');
        console.log('  r/run         - Start the agent');
        console.log('  s/search      - Search beliefs/goals/questions');
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
        const { beliefs = [] } = this.apiService.getAgentState();
        console.log(`\nBeliefs (${beliefs.length}):`);
        if (beliefs.length > 0) {
            beliefs.slice(0, 10).forEach((belief, i) => console.log(`  ${i}. ${belief.termKey || belief.id}`));
            if (beliefs.length > 10) console.log(`  ... and ${beliefs.length - 10} more.`);
        } else {
            console.log('  No beliefs in memory.');
        }
        console.log('');
    }

    listGoals() {
        const { goals = [] } = this.apiService.getAgentState();
        console.log(`\nGoals (${goals.length}):`);
        if (goals.length > 0) {
            goals.slice(0, 10).forEach((goal, i) => console.log(`  ${i}. ${goal.termKey || goal.id}`));
            if (goals.length > 10) console.log(`  ... and ${goals.length - 10} more.`);
        } else {
            console.log('  No goals in memory.');
        }
        console.log('');
    }

    listTasks() {
        const { tasks = [] } = this.apiService.getAgentState();
        console.log(`\nTasks (${tasks.length}):`);
        if (tasks.length > 0) {
            tasks.slice(0, 10).forEach((task, i) => console.log(`  ${i}. ${task.termKey || task.id}`));
            if (tasks.length > 10) console.log(`  ... and ${tasks.length - 10} more.`);
        } else {
            console.log('  No tasks in memory.');
        }
        console.log('');
    }

    async addBelief(content) {
        try {
            // Beliefs typically end with '.'
            const narsese = content.endsWith('.') ? content : content + '.';
            await this.interpretNarsese(narsese);
        } catch (error) {
            this.logger.error('Error adding belief:', error);
            console.log(`✗ Error adding belief: ${error.message}`);
        }
    }

    async interpretNarsese(input) {
        try {
            await this.apiService.sendNarsese(input);

            let taskType = 'input';
            if (input.endsWith('?')) taskType = 'Question';
            else if (input.endsWith('!')) taskType = 'Goal';
            else if (input.endsWith('.')) taskType = 'Belief';

            console.log(`✓ ${taskType} sent successfully: ${input}`);
            this.logger.info(`TUI Narsese sent: ${input}`);
        } catch (error) {
            this.logger.error('Error interpreting Narsese:', error);
            console.log(`✗ Error interpreting Narsese: ${error.message}`);
        }
    }

    async performSearch(query) {
        try {
            await this.apiService.search(query);
            console.log(`Searching for: "${query}"...`);
            this.logger.info(`TUI Search initiated: ${query}`);
        } catch (error) {
            this.logger.error('Error performing search:', error);
            console.log(`✗ Error performing search: ${error.message}`);
        }
    }
}

export { TuiView };