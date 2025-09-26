import blessed from 'blessed';
import blessedContrib from 'blessed-contrib';
import {highlight} from 'cli-highlight';
import {getHeaderConfig} from '../components/Header.js';
import {getStatusBarConfig} from '../components/StatusBar.js';
import {getTaskBoxConfig} from '../components/TaskBox.js';
import {getLogBoxConfig} from '../components/LogBox.js';
import {getNarseseInputConfig} from '../components/NarseseInput.js';
import {getCommandInputConfig} from '../components/CommandInput.js';
import {createHelpBox} from '../components/HelpBox.js';
import {createDetailBox} from '../components/DetailBox.js';
import {getBeliefsBoxConfig} from '../components/BeliefsBox.js';
import {commandDefinitions} from '../services/commandHandler.js';
import {EMOJIS, STYLES} from '../TuiConstants.js';

export default class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.screen = this.createScreen();
        this.grid = new blessedContrib.grid({rows: 12, cols: 12, screen: this.screen});
        this.components = {};
        this.rawTasks = [];
        this.rawBeliefs = [];

        this.setupLayout();
        this.registerKeybindings();
        this.setFocus('narseseInput');
    }

    createScreen() {
        return blessed.screen({
            smartCSR: true,
            title: 'SeNARS TUI',
            fullUnicode: true,
            autoPadding: true,
        });
    }

    setupLayout() {
        this.components.header = this.grid.set(0, 0, 1, 12, blessed.box, getHeaderConfig());
        this.components.taskBox = this.grid.set(1, 0, 5, 6, blessed.list, getTaskBoxConfig());
        this.components.beliefsBox = this.grid.set(1, 6, 5, 6, blessed.list, getBeliefsBoxConfig());
        this.components.logBox = this.grid.set(6, 0, 5, 12, blessed.log, getLogBoxConfig());
        this.components.narseseInput = this.grid.set(11, 0, 1, 9, blessed.textbox, getNarseseInputConfig());
        this.components.commandInput = this.grid.set(11, 0, 1, 9, blessed.textbox, getCommandInputConfig());
        this.components.statusBar = this.grid.set(11, 9, 1, 3, blessed.box, getStatusBarConfig());

        this.components.detailBox = createDetailBox();
        this.components.helpBox = createHelpBox();
        this.screen.append(this.components.detailBox);
        this.screen.append(this.components.helpBox);
    }

    registerKeybindings() {
        this.screen.key(['q', 'C-c'], () => process.exit(0));
        this.screen.key(['escape'], () => this.handleEscape());
        this.screen.key(['i'], () => this.setFocus('narseseInput'));
        this.screen.key([':'], () => this.setFocus('commandInput'));
        this.screen.key(['t'], () => this.setFocus('taskBox'));
        this.screen.key(['b'], () => this.setFocus('beliefsBox'));
        this.screen.key(['l'], () => this.setFocus('logBox'));
        this.screen.key(['h', '?'], () => this.toggleHelp());

        this.components.taskBox.on('select', this.onTaskSelect.bind(this));
        this.components.beliefsBox.on('select', this.onBeliefSelect.bind(this));
    }

    handleEscape() {
        if (this.components.detailBox.visible) {
            this.components.detailBox.hide();
            this.setFocus(this.stateManager.get('focusedComponent'));
        } else if (this.components.helpBox.visible) {
            this.components.helpBox.hide();
            this.setFocus(this.stateManager.get('focusedComponent'));
        } else {
            this.setFocus('narseseInput');
        }
        this.render();
    }

    setFocus(componentName) {
        const previouslyFocused = this.stateManager.get('focusedComponent');
        if (previouslyFocused && this.components[previouslyFocused]) {
            this.components[previouslyFocused].style.border = STYLES.base.border;
        }

        this.stateManager.set('focusedComponent', componentName);
        const component = this.components[componentName];
        if (component) {
            component.focus();
            component.style.border = STYLES.focused.border;
        }

        this.components.narseseInput.hide();
        this.components.commandInput.hide();
        if (componentName === 'narseseInput' || componentName === 'commandInput') {
            this.components[componentName].show();
        }

        this.updateStatusBar();
        this.render();
    }

    onTaskSelect(item, index) {
        const task = this.rawTasks[index];
        if (task) this.showDetailView('Task Details', task);
    }

    onBeliefSelect(item, index) {
        const belief = this.rawBeliefs[index];
        if (belief) this.showDetailView('Belief Details', belief);
    }

    showDetailView(title, data) {
        const jsonString = JSON.stringify(data, null, 2);
        const highlightedContent = highlight(jsonString, {language: 'json', ignoreIllegals: true});

        this.components.detailBox.setLabel(` ${EMOJIS.DETAIL} ${title} `);
        this.components.detailBox.setContent(highlightedContent);
        this.components.detailBox.show();
        this.components.detailBox.focus();
        this.render();
    }

    toggleHelp() {
        if (this.components.helpBox.visible) {
            this.handleEscape();
        } else {
            const keybindings = [
                '{bold}Keybindings{/bold}',
                '  q, C-c      Quit',
                '  i           Focus Narsese Input',
                '  :           Focus Command Input',
                '  t           Focus Task List',
                '  b           Focus Beliefs List',
                '  l           Focus Log View',
                '  h, ?        Toggle Help',
                '  esc         Close Detail/Help or Focus Narsese Input',
                '  Up/Down     Navigate Lists',
            ].join('\n');

            const commands = Object.entries(commandDefinitions)
                .map(([, {usage, description}]) => `  {bold}${usage}{/bold}\n    L ${description}`)
                .join('\n\n');

            const helpContent = `${keybindings}\n\n{bold}Commands{/bold}\n${commands}`;

            this.components.helpBox.setContent(helpContent);
            this.components.helpBox.show();
            this.components.helpBox.focus();
        }
        this.render();
    }

    log(message) {
        this.components.logBox.log(message);
        this.render();
    }

    clearLog() {
        this.components.logBox.setContent('');
        this.render();
    }

    updateTasks(tasks) {
        this.rawTasks = tasks;
        const taskItems = tasks.map(t => `${EMOJIS.TASKS} ${t.id}: ${t.term}`);
        this.components.taskBox.setItems(taskItems);
        this.render();
    }

    updateBeliefs(beliefs) {
        this.rawBeliefs = beliefs;
        const beliefItems = beliefs.map(b => `${EMOJIS.BELIEFS} ${b.term}`);
        this.components.beliefsBox.setItems(beliefItems);
        this.render();
    }

    updateStatusBar() {
        const connected = this.stateManager.get('isConnected');
        const focus = this.stateManager.get('focusedComponent');
        const statusIcon = connected ? EMOJIS.STATUS_CONNECTED : EMOJIS.STATUS_DISCONNECTED;
        const content = ` ${statusIcon} ${connected ? 'Connected' : 'Disconnected'} | ${EMOJIS.FOCUS} ${focus}`;
        this.components.statusBar.setContent(content);
        this.render();
    }

    render() {
        this.screen.render();
    }
}