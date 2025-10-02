import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';
import {CONFIG} from '@senars/common/constants/config.js';
import UiComponents from '@senars/common/services/UiComponents.js';

class TuiRenderer {
    constructor() {
        this.screen = null;
        this.grid = null;
        this.components = {};
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.screen = blessed.screen({
            smartCSR: true,
            title: CONFIG.TUI.TITLE || 'SENARS TUI',
        });

        this.grid = new contrib.grid({
            rows: 12,
            cols: 12,
            screen: this.screen,
        });

        this._createComponents();
        this.initialized = true;
    }

    _createComponents() {
        this.components.log = this.grid.set(0, 0, 9, 9, contrib.log, {
            fg: 'green',
            label: 'Activity Log',
            border: {type: 'line', fg: 'cyan'},
            scrollable: true,
            scrollbar: {
                ch: ' ',
                track: {bg: 'cyan'},
                style: {inverse: true},
            },
        });

        this.components.status = this.grid.set(0, 9, 3, 3, blessed.box, {
            label: 'System Status',
            content: '',
            border: {type: 'line', fg: 'cyan'},
            tags: true,
        });

        this.components.beliefs = this.grid.set(3, 9, 3, 3, blessed.box, {
            label: 'Beliefs',
            content: '',
            border: {type: 'line', fg: 'cyan'},
            tags: true,
        });

        this.components.goals = this.grid.set(6, 9, 3, 3, blessed.box, {
            label: 'Goals',
            content: '',
            border: {type: 'line', fg: 'cyan'},
            tags: true,
        });

        this.components.input = this.grid.set(9, 0, 3, 12, blessed.textarea, {
            label: 'Input (Enter to submit, Ctrl+C to exit)',
            border: {type: 'line', fg: 'cyan'},
            inputOnFocus: true,
            mouse: true,
            keys: true,
            vi: true,
        });
    }

    render(state) {
        if (!this.initialized) this.initialize();

        this.updateStatus(state);
        this.updateBeliefs(state?.memory?.beliefs);
        this.updateGoals(state?.memory?.goals);

        // Logs are now handled by the 'message' event in the controller
        // to avoid full re-renders on every log line.

        this.screen.render();
    }

    updateStatus(systemState) {
        const component = UiComponents.createSystemStatus(systemState);
        const content = ` {bold}Status:{/bold} ${component.isRunning ? 'RUNNING' : 'STOPPED'}\n` +
                        ` {bold}Cycle:{/bold} ${component.cycleCount}\n` +
                        ` {bold}Uptime:{/bold} ${component.uptime || 'N/A'}\n` +
                        ` {bold}Version:{/bold} ${component.version}`;
        this.components.status.setContent(content);
    }

    updateBeliefs(beliefs = []) {
        const beliefContent = beliefs.slice(0, 5).map(b => b.termKey || b.id).join('\n');
        this.components.beliefs.setContent(beliefContent);
    }

    updateGoals(goals = []) {
        const goalContent = goals.slice(0, 5).map(g => g.termKey || g.id).join('\n');
        this.components.goals.setContent(goalContent);
    }

    log(message) {
        if (this.components.log) {
            this.components.log.log(message);
        }
    }

    showError(error) {
        const errorMessage = `Error: ${error.message}\n${error.stack}`;
        this.log(chalk.red(errorMessage));
        this.screen.render();
    }

    destroy() {
        if (this.screen) {
            this.screen.destroy();
            this.initialized = false;
            this.screen = null;
        }
    }
}

export {TuiRenderer};