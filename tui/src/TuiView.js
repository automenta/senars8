import logger from '@senars/core/utils/logger.js';

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
            'stats': {handler: this._showStats, description: 'Show detailed system statistics'},
            'memory': {handler: this._showMemoryInfo, description: 'Show memory usage information'},
            'reset': {handler: this._handleReset, description: 'Reset the agent system'},
            'pause': {handler: this._handlePause, description: 'Pause the agent cycling'},
            'resume': {handler: this._handleResume, description: 'Resume the agent cycling'},
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

    displayError(message) {
        // Format error with timestamp
        const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
        this.renderer.log(`{red-fg}[${timestamp}] ERROR: ${message}{/red-fg}`);

        // Highlight the error in the status panel temporarily
        const originalContent = this.renderer.components.status.getContent();
        this.renderer.components.status.setContent(`{red-bg}{white-fg} ERROR: ${message.substring(0, 30)}... {/white-fg}{/red-bg}\n${originalContent.split('\n').slice(1).join('\n')}`);
        this.renderer.screen.render();

        // Reset to normal after a short delay
        setTimeout(() => {
            this.render(); // Re-render with proper content
        }, 3000);
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

        // Input field keys
        input.key(['escape', 'C-c'], () => this._handleQuit());
        input.key(['C-l'], () => this._clearScreen());
        input.key(['C-r'], () => this.showHelp());
        input.on('submit', (line) => this.handleUserInput(line));

        // Global navigation keys
        this.renderer.screen.key(['C-c'], () => this._handleQuit());
        this.renderer.screen.key(['C-l'], () => this._clearScreen());
        this.renderer.screen.key(['C-h'], () => this.showHelp());
        this.renderer.screen.key(['C-p'], () => this._showStats());
        this.renderer.screen.key(['C-m'], () => this._showMemoryInfo());
        this.renderer.screen.key(['C-b'], () => this._listBeliefs());
        this.renderer.screen.key(['C-g'], () => this._listGoals());
        this.renderer.screen.key(['C-t'], () => this._listTasks());

        // Add scrolling to the log panel
        this.renderer.screen.key(['up', 'k'], () => {
            log.scroll(-1);
            this.renderer.screen.render();
        });
        this.renderer.screen.key(['down', 'j'], () => {
            log.scroll(1);
            this.renderer.screen.render();
        });

        // Page up/down for log
        this.renderer.screen.key(['pageup'], () => {
            log.scroll(-10);
            this.renderer.screen.render();
        });
        this.renderer.screen.key(['pagedown'], () => {
            log.scroll(10);
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
        this.renderer.screen.render();
    }

    _listBeliefs() {
        const beliefs = this.apiService.getAgentState().memory?.beliefs || [];
        if (beliefs.length === 0) {
            this.renderer.log('No beliefs in memory.');
            return;
        }
        const content = 'Beliefs:\n' + beliefs.map(b => `  - ${b.termKey || b.id} (conf: ${(b.state?.truthValue?.confidence || 0).toFixed(2)})`).join('\n');
        this.renderer.log(content);
    }

    _listGoals() {
        const goals = this.apiService.getAgentState().memory?.goals || [];
        if (goals.length === 0) {
            this.renderer.log('No goals in memory.');
            return;
        }
        const content = 'Goals:\n' + goals.map(g => `  - ${g.termKey || g.id} (conf: ${(g.state?.truthValue?.confidence || 0).toFixed(2)})`).join('\n');
        this.renderer.log(content);
    }

    _listTasks() {
        const tasks = this.apiService.getAgentState().tasks || [];
        if (tasks.length === 0) {
            this.renderer.log('No tasks in memory.');
            return;
        }
        const content = 'Tasks:\n' + tasks.map(t => {
            const type = t.punctuation || '.';
            let colorStart = '', colorEnd = '';
            if (type === '!') {
                colorStart = '{red-fg}';
                colorEnd = '{/red-fg}';
            } else if (type === '?') {
                colorStart = '{yellow-fg}';
                colorEnd = '{/yellow-fg}';
            }
            return `  ${colorStart}${t.termKey || t.id}${colorEnd} ${type} (conf: ${(t.state?.truthValue?.confidence || 0).toFixed(2)})`;
        }).join('\n');
        this.renderer.log(content);
    }

    _showStats() {
        const state = this.apiService.getAgentState();
        if (!state) {
            this.renderer.log('No system state available.');
            return;
        }

        const stats = state.stats || {};
        const memory = state.memory || {};

        const content =
            'System Statistics:\n' +
            `  Cycles per second: ${stats.cyclesPerSecond?.toFixed(2) || 'N/A'}\n` +
            `  Memory used: ${stats.memoryUsedMB?.toFixed(1) || 'N/A'} MB\n` +
            `  CPU usage: ${stats.cpuUsage?.toFixed(1) || 'N/A'}%\n` +
            `  Tasks per second: ${stats.tasksPerSecond?.toFixed(2) || 'N/A'}\n` +
            `  Beliefs: ${memory.beliefs?.length || 0}\n` +
            `  Goals: ${memory.goals?.length || 0}\n` +
            `  Tasks: ${(state.tasks || []).length}\n` +
            `  Concepts: ${memory.concepts?.length || 0}\n` +
            `  Uptime: ${state.uptime || 'N/A'}`;

        this.renderer.log(content);
    }

    _showMemoryInfo() {
        const state = this.apiService.getAgentState();
        if (!state) {
            this.renderer.log('No system state available.');
            return;
        }

        const memory = state.memory || {};
        const content =
            'Memory Information:\n' +
            `  Total beliefs: ${memory.beliefs?.length || 0}\n` +
            `  Total goals: ${memory.goals?.length || 0}\n` +
            `  Total concepts: ${memory.concepts?.length || 0}\n` +
            `  Total tasks: ${(state.tasks || []).length}\n` +
            `  Memory capacity: ${memory.capacity || 'N/A'}\n` +
            `  Forgetting threshold: ${memory.forgettingThreshold || 'N/A'}`;

        this.renderer.log(content);
    }

    _handleReset() {
        this.apiService.sendAgentControl('reset');
        this.renderer.log('Agent reset command sent.');
    }

    _handlePause() {
        this.apiService.sendAgentControl('pause');
        this.renderer.log('Agent pause command sent.');
    }

    _handleResume() {
        this.apiService.sendAgentControl('resume');
        this.renderer.log('Agent resume command sent.');
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

            // Format the response based on task type
            const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
            let color = 'green';
            if (input.endsWith('!')) color = 'red';
            else if (input.endsWith('?')) color = 'yellow';

            this.renderer.log(`{${color}-fg}[${timestamp}] ✓ ${taskType}: ${input}{/${color}-fg}`);

        } catch (error) {
            const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
            this.renderer.log(`{red-fg}[${timestamp}] ✗ Failed to process: ${input}{/red-fg}`);
            this.renderer.log(`{red-fg}Error: ${error.message}{/red-fg}`);
        }
    }

    showHelp() {
        const helpText = Object.entries(this.commandMap)
            .map(([cmd, {description}]) => `  ${cmd.padEnd(10)} - ${description}`)
            .join('\n');

        const keyBindings =
            '\n\nKeyboard Shortcuts:\n' +
            '  Ctrl+C     - Quit application\n' +
            '  Ctrl+L     - Clear log panel\n' +
            '  Ctrl+H     - Show this help\n' +
            '  Ctrl+P     - Show system stats\n' +
            '  Ctrl+M     - Show memory info\n' +
            '  Ctrl+B     - List beliefs\n' +
            '  Ctrl+G     - List goals\n' +
            '  Ctrl+T     - List tasks\n' +
            '  Up/Down    - Scroll log panel\n' +
            '  PageUp/Dn  - Scroll log panel faster\n\n' +
            'Narsese Input:\n' +
            '  Statements ending with \'.\' are beliefs\n' +
            '  Statements ending with \'!\' are goals\n' +
            '  Statements ending with \'?\' are questions';

        this.renderer.log(`{bold}SENARS TUI Help{/bold}\n\nAvailable commands:\n${helpText}${keyBindings}`);
    }
}

export {TuiView};