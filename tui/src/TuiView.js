import readline from 'readline';
import logger from '../../core/utils/logger.js';

class TuiView {
    constructor(apiService, renderer) {
        this.apiService = apiService;
        this.renderer = renderer;
        this.rl = null;
        this.isRunning = false;
        this.updateInterval = null;
        this.lastRenderTime = 0;
        this.minRenderInterval = 100;
        this.updateIntervalMs = 1000;
        this.logger = logger.create('TuiView');
        this.awaitingInput = false;
        this.inputCallback = null;
        this.commandMap = this._initializeCommandMap();
        this._initializeServices();
    }

    _initializeCommandMap() {
        return {
            's': {handler: this._promptForSearch, description: 'Search beliefs/goals/questions'},
            'search': {handler: this._promptForSearch, description: 'Search beliefs/goals/questions'},
            'x': {handler: this._handleStop, description: 'Stop the agent'},
            'stop': {handler: this._handleStop, description: 'Stop the agent'},
            'r': {handler: this._handleRun, description: 'Start the agent'},
            'run': {handler: this._handleRun, description: 'Start the agent'},
            'q': {handler: this._handleQuit, description: 'Quit the application'},
            'quit': {handler: this._handleQuit, description: 'Quit the application'},
            'exit': {handler: this._handleQuit, description: 'Quit the application'},
            't': {handler: this._promptForTask, description: 'Add a new task'},
            'task': {handler: this._promptForTask, description: 'Add a new task'},
            'a': {handler: this._promptForBelief, description: 'Add a new belief'},
            'add': {handler: this._promptForBelief, description: 'Add a new belief'},
            'b': {handler: this._listBeliefs, description: 'List current beliefs'},
            'beliefs': {handler: this._listBeliefs, description: 'List current beliefs'},
            'g': {handler: this._listGoals, description: 'List current goals'},
            'goals': {handler: this._listGoals, description: 'List current goals'},
            'l': {handler: this._listTasks, description: 'List current tasks'},
            'tasks': {handler: this._listTasks, description: 'List current tasks'},
            'c': {handler: this._clearScreen, description: 'Clear the screen'},
            'clear': {handler: this._clearScreen, description: 'Clear the screen'},
            'h': {handler: this.showHelp, description: 'Show this help message'},
            'help': {handler: this.showHelp, description: 'Show this help message'},
            '': {handler: this.render, description: 'Re-render the view'},
        };
    }

    _initializeServices() {
        this.apiService.on('state_update', (newState) => {
            if (this.isRunning && !this.awaitingInput) {
                this.render();
            }
        });

        this.apiService.on('search_results', (payload) => {
            if (payload && Array.isArray(payload.results)) {
                this._listItems(`Search Results for "${payload.query || ''}"`, payload.results, (r) => r.termKey || r.id || r.content || JSON.stringify(r));
            }
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.rl = readline.createInterface({input: process.stdin, output: process.stdout});
        this.rl.on('line', (input) => this.handleUserInput(input.trim()));
        this.rl.on('SIGINT', () => this._handleQuit());
        this.render();
        this.updateInterval = setInterval(() => {
            if (this.isRunning && !this.awaitingInput) this.render();
        }, this.updateIntervalMs);
        this.logger.debug('TUI View started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = null;
        if (this.rl) this.rl.close();
        this.rl = null;
        this.logger.debug('TUI View stopped');
    }

    render() {
        const now = Date.now();
        if (now - this.lastRenderTime < this.minRenderInterval || !this.isRunning) return;
        try {
            this.renderer.render(this.apiService.getAgentState());
            this.lastRenderTime = now;
        } catch (error) {
            this.renderer.renderError(error);
        }
    }

    async handleUserInput(input) {
        if (this.awaitingInput && this.inputCallback) {
            const callback = this.inputCallback;
            this.inputCallback = null;
            this.awaitingInput = false;
            await callback(input);
            return;
        }

        const command = input.toLowerCase();
        const handler = this.commandMap[command]?.handler;

        if (handler) {
            await handler.call(this);
        } else {
            await this._interpretNarsese(input);
        }
    }

    async _promptForInput(prompt, callback) {
        if (this.awaitingInput) {
            console.log('Already awaiting input, please complete the previous command first.');
            return;
        }
        this.awaitingInput = true;
        this.inputCallback = callback;
        console.log(prompt);
    }

    _handleStop() {
        this.apiService.sendAgentControl('stop');
        console.log('Agent stop command sent.');
        this.logger.info('Agent stop command sent via TUI.');
    }

    _handleRun() {
        this.apiService.sendAgentControl('start');
        console.log('Agent start command sent.');
        this.logger.info('Agent start command sent via TUI.');
    }

    _handleQuit() {
        console.log('\nExiting...');
        this.stop();
        process.exit(0);
    }

    _clearScreen() {
        console.clear();
    }

    async _promptForSearch() {
        await this._promptForInput('Enter search query:', this._performSearch.bind(this));
    }

    async _promptForTask() {
        await this._promptForInput('Enter a new task:', this._interpretNarsese.bind(this));
    }

    async _promptForBelief() {
        await this._promptForInput('Enter a new belief:', this._addBelief.bind(this));
    }

    _listBeliefs() {
        this._listItems('Beliefs', this.apiService.getAgentState().beliefs || []);
    }

    _listGoals() {
        this._listItems('Goals', this.apiService.getAgentState().goals || []);
    }

    _listTasks() {
        this._listItems('Tasks', this.apiService.getAgentState().tasks || []);
    }

    _listItems(title, items, formatter = (item) => item.termKey || item.id) {
        console.log(`\n${title} (${items.length}):`);
        if (items.length > 0) {
            items.slice(0, 10).forEach((item, i) => console.log(`  ${i + 1}. ${formatter(item)}`));
            if (items.length > 10) console.log(`  ... and ${items.length - 10} more.`);
        } else {
            console.log(`  No ${title.toLowerCase()} found.`);
        }
        console.log('');
    }

    async _addBelief(content) {
        const narsese = content.endsWith('.') ? content : content + '.';
        await this._interpretNarsese(narsese);
    }

    async _interpretNarsese(input) {
        try {
            await this.apiService.sendNarsese(input);
            const taskType = input.endsWith('?') ? 'Question' : input.endsWith('!') ? 'Goal' : 'Belief';
            console.log(`✓ ${taskType} sent successfully: ${input}`);
            this.logger.info(`TUI Narsese sent: ${input}`);
        } catch (error) {
            this.logger.error('Error interpreting Narsese:', error);
            console.log(`✗ Error interpreting Narsese: ${error.message}`);
        }
    }

    async _performSearch(query) {
        try {
            await this.apiService.search(query);
            console.log(`Searching for: "${query}"...`);
            this.logger.info(`TUI Search initiated: ${query}`);
        } catch (error) {
            this.logger.error('Error performing search:', error);
            console.log(`✗ Error performing search: ${error.message}`);
        }
    }

    showHelp() {
        console.log('\nAvailable commands:');
        const displayedCommands = new Set();
        Object.entries(this.commandMap).forEach(([command, {description}]) => {
            if (description && !displayedCommands.has(description)) {
                console.log(`  ${command.padEnd(12)} - ${description}`);
                displayedCommands.add(description);
            }
        });
        console.log('  <narsese>     - Enter Narsese directly');
        console.log('');
    }
}

export {TuiView};