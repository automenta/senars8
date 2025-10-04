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
        // Main activity log panel
        this.components.log = this.grid.set(0, 0, 7, 8, contrib.log, {
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

        // System status panel
        this.components.status = this.grid.set(0, 8, 3, 2, blessed.box, {
            label: 'System Status',
            content: '',
            border: {type: 'line', fg: 'green'},
            tags: true,
            style: {
                fg: 'green',
                border: {fg: 'green'}
            }
        });

        // Performance metrics panel
        this.components.performance = this.grid.set(0, 10, 3, 2, blessed.box, {
            label: 'Performance',
            content: '',
            border: {type: 'line', fg: 'yellow'},
            tags: true,
            style: {
                fg: 'yellow',
                border: {fg: 'yellow'}
            }
        });

        // Beliefs panel
        this.components.beliefs = this.grid.set(3, 8, 2, 4, blessed.box, {
            label: 'Beliefs',
            content: '',
            border: {type: 'line', fg: 'blue'},
            tags: true,
            style: {
                fg: 'blue',
                border: {fg: 'blue'}
            }
        });

        // Goals panel
        this.components.goals = this.grid.set(5, 8, 2, 4, blessed.box, {
            label: 'Goals',
            content: '',
            border: {type: 'line', fg: 'magenta'},
            tags: true,
            style: {
                fg: 'magenta',
                border: {fg: 'magenta'}
            }
        });

        // Tasks panel
        this.components.tasks = this.grid.set(7, 8, 2, 4, blessed.box, {
            label: 'Tasks',
            content: '',
            border: {type: 'line', fg: 'red'},
            tags: true,
            style: {
                fg: 'red',
                border: {fg: 'red'}
            }
        });

        // Stats panel
        this.components.stats = this.grid.set(3, 10, 4, 2, blessed.box, {
            label: 'Statistics',
            content: '',
            border: {type: 'line', fg: 'white'},
            tags: true,
            style: {
                fg: 'white',
                border: {fg: 'white'}
            }
        });

        // Input panel (expanded to full width)
        this.components.input = this.grid.set(9, 0, 3, 12, blessed.textarea, {
            label: 'Input (Enter to submit, Ctrl+C to exit)',
            border: {type: 'line', fg: 'cyan'},
            inputOnFocus: true,
            mouse: true,
            keys: true,
            vi: true,
            style: {
                fg: 'white',
                bg: 'black',
                border: {fg: 'cyan'},
            }
        });
    }

    render(state) {
        if (!this.initialized) this.initialize();

        this.updateStatus(state);
        this.updatePerformance(state);
        this.updateBeliefs(state?.memory?.beliefs);
        this.updateGoals(state?.memory?.goals);
        this.updateTasks(state?.tasks || []);
        this.updateStats(state);

        // Logs are now handled by the 'message' event in the controller
        // to avoid full re-renders on every log line.

        this.screen.render();
    }

    updateStatus(systemState) {
        const component = UiComponents.createSystemStatus(systemState);
        const content = ` {bold}Status:{/bold} ${component.isRunning ? '{green-fg}RUNNING{/green-fg}' : '{red-fg}STOPPED{/red-fg}'}\n` +
            ` {bold}Cycle:{/bold} ${component.cycleCount}\n` +
            ` {bold}Uptime:{/bold} ${component.uptime || 'N/A'}\n` +
            ` {bold}Version:{/bold} ${component.version}`;
        this.components.status.setContent(content);
    }

    updatePerformance(systemState) {
        if (!systemState) {
            this.components.performance.setContent('No data');
            return;
        }

        const stats = systemState.stats || {};
        const content = ` {bold}CPS:{/bold} ${stats.cyclesPerSecond?.toFixed(2) || 'N/A'}\n` +
            ` {bold}Mem:{/bold} ${stats.memoryUsedMB?.toFixed(1) || 'N/A'}MB\n` +
            ` {bold}CPU:{/bold} ${stats.cpuUsage?.toFixed(1) || 'N/A'}%\n` +
            ` {bold}Tasks/s:{/bold} ${stats.tasksPerSecond?.toFixed(2) || 'N/A'}`;
        this.components.performance.setContent(content);
    }

    updateStats(systemState) {
        if (!systemState) {
            this.components.stats.setContent('No data');
            return;
        }

        const memory = systemState.memory || {};
        const content = ` {bold}Beliefs:{/bold} ${memory.beliefs?.length || 0}\n` +
            ` {bold}Goals:{/bold} ${memory.goals?.length || 0}\n` +
            ` {bold}Tasks:{/bold} ${(systemState.tasks || []).length}\n` +
            ` {bold}Concepts:{/bold} ${memory.concepts?.length || 0}`;
        this.components.stats.setContent(content);
    }

    updateBeliefs(beliefs = []) {
        let beliefContent = '';
        if (beliefs.length === 0) {
            beliefContent = '{italic}No beliefs{/italic}';
        } else {
            beliefContent = beliefs.slice(0, 5).map(b => {
                const termKey = b.termKey || b.id || 'Unknown';
                const confidence = b.state?.truthValue?.confidence ?
                    ` {gray-fg}(${b.state.truthValue.confidence.toFixed(2)}){/gray-fg}` : '';
                return `  {blue-fg}${termKey}{/blue-fg}${confidence}`;
            }).join('\n');
        }
        this.components.beliefs.setContent(beliefContent);
    }

    updateGoals(goals = []) {
        let goalContent = '';
        if (goals.length === 0) {
            goalContent = '{italic}No goals{/italic}';
        } else {
            goalContent = goals.slice(0, 5).map(g => {
                const termKey = g.termKey || g.id || 'Unknown';
                const confidence = g.state?.truthValue?.confidence ?
                    ` {gray-fg}(${g.state.truthValue.confidence.toFixed(2)}){/gray-fg}` : '';
                return `  {magenta-fg}${termKey}{/magenta-fg}${confidence}`;
            }).join('\n');
        }
        this.components.goals.setContent(goalContent);
    }

    updateTasks(tasks = []) {
        let taskContent = '';
        if (tasks.length === 0) {
            taskContent = '{italic}No tasks{/italic}';
        } else {
            // Show most recent tasks
            const recentTasks = tasks.slice(0, 5);
            taskContent = recentTasks.map(t => {
                const termKey = t.termKey || t.id || 'Unknown';
                const type = t.punctuation || '.';
                const confidence = t.state?.truthValue?.confidence ?
                    ` {gray-fg}(${t.state.truthValue.confidence.toFixed(2)}){/gray-fg}` : '';
                let color = 'white';
                if (type === '!') color = 'red';
                else if (type === '?') color = 'yellow';
                return `  {${color}-fg}${termKey}{/${color}-fg}${confidence} {gray-fg}${type}{/gray-fg}`;
            }).join('\n');
        }
        this.components.tasks.setContent(taskContent);
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