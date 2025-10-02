import logger from '@core/utils/logger.js';
import UiComponents from '@common/services/UiComponents.js';

class TuiView {
    constructor(apiService, renderer) {
        this.apiService = apiService;
        this.renderer = renderer;
        this.isRunning = false;
        this.commandMap = this._initializeCommandMap();
        this.logger = logger.create('TuiView');
        this._initializeServices();
    }

    _initializeCommandMap() {
        return {
            'stop': {handler: this._handleStop, description: 'Stop the agent'},
            'run': {handler: this._handleRun, description: 'Start the agent'},
            'quit': {handler: this._handleQuit, description: 'Quit the application'},
            'exit': {handler: this._handleQuit, description: 'Quit the application'},
            'clear': {handler: this._clearScreen, description: 'Clear the log panel'},
            'help': {handler: this.showHelp, description: 'Show this help message'},
            'beliefs': {handler: this._listBeliefs, description: 'List current beliefs'},
            'goals': {handler: this._listGoals, description: 'List current goals'},
            'tasks': {handler: this._listTasks, description: 'List current tasks'},
            'search': {handler: this._handleSearch, description: 'Search memory. Usage: search <query>'},
        };
    }

    _initializeServices() {
        this.apiService.on('search_results', (payload) => {
            const results = payload.results || [];
            const query = payload.query || '';
            let content = `Search Results for "${query}":\n`;
            content += results.map(r => `  - ${r.termKey || r.id}`).join('\n');
            this.renderer.log(content);
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.renderer.initialize();
        this._bindKeys();
        this.renderer.components.input.focus();
        this.logger.debug('TUI View started');
    }

    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        this.renderer.destroy();
        this.logger.debug('TUI View stopped');
    }

    render() {
        if (!this.isRunning) return;
        try {
            this.renderer.render(this.apiService.getAgentState());
        } catch (error) {
            this.renderer.showError(error);
        }
    }

    _bindKeys() {
        const {input, log} = this.renderer.components;
        input.key(['escape', 'C-c'], () => this._handleQuit());
        input.on('submit', (line) => this.handleUserInput(line));

        // Add scrolling to the log panel
        this.renderer.screen.key(['up', 'k'], () => {
            log.scroll(-1);
            this.renderer.screen.render();
        });
        this.renderer.screen.key(['down', 'j'], () => {
            log.scroll(1);
            this.renderer.screen.render();
        });
    }

    async handleUserInput(input) {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        const [command, ...args] = trimmedInput.split(/\s+/);
        const handler = this.commandMap[command.toLowerCase()]?.handler;

        if (handler) {
            await handler.call(this, args.join(' '));
        } else {
            await this._interpretNarsese(trimmedInput);
        }
        this.renderer.components.input.clearValue();
        this.renderer.components.input.focus();
        this.renderer.screen.render();
    }

    _handleStop() {
        this.apiService.sendAgentControl('stop');
        this.renderer.log('Agent stop command sent.');
    }

    _handleRun() {
        this.apiService.sendAgentControl('start');
        this.renderer.log('Agent start command sent.');
    }

    _handleQuit() {
        this.stop();
        process.exit(0);
    }

    _clearScreen() {
        this.renderer.components.log.setContent('');
    }

    _listBeliefs() {
        const beliefs = this.apiService.getAgentState().memory?.beliefs || [];
        const content = 'Beliefs:\n' + beliefs.map(b => `  - ${b.termKey || b.id}`).join('\n');
        this.renderer.log(content);
    }

    _listGoals() {
        const goals = this.apiService.getAgentState().memory?.goals || [];
        const content = 'Goals:\n' + goals.map(g => `  - ${g.termKey || g.id}`).join('\n');
        this.renderer.log(content);
    }

    _listTasks() {
        const tasks = this.apiService.getAgentState().tasks || [];
        const formatted = UiComponents.formatForTui(UiComponents.createTaskList(tasks));
        this.renderer.log(formatted);
    }

    async _handleSearch(query) {
        if (!query) {
            this.renderer.log('Usage: search <query>');
            return;
        }
        await this.apiService.search(query);
    }

    async _interpretNarsese(input) {
        try {
            await this.apiService.sendNarsese(input);
            const taskType = input.endsWith('?') ? 'Question' : input.endsWith('!') ? 'Goal' : 'Belief';
            this.renderer.log(`✓ ${taskType} sent: ${input}`);
        } catch (error) {
            this.renderer.showError(error);
        }
    }

    showHelp() {
        const helpText = Object.entries(this.commandMap)
            .map(([cmd, {description}]) => `  ${cmd.padEnd(10)} - ${description}`)
            .join('\n');
        this.renderer.log(`Available commands:\n${helpText}`);
    }
}

export {TuiView};