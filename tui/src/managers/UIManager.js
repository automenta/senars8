import blessed from 'blessed';
import { createHeader } from '../components/Header.js';
import { createStatusBar } from '../components/StatusBar.js';
import { createTaskBox } from '../components/TaskBox.js';
import { createLogBox } from '../components/LogBox.js';
import { createNarseseInput } from '../components/NarseseInput.js';
import { createCommandInput } from '../components/CommandInput.js';
import { createHelpBox } from '../components/HelpBox.js';
import { createDetailBox } from '../components/DetailBox.js';
import { createBeliefsBox } from '../components/BeliefsBox.js';

/**
 * Manages the UI components for the TUI.
 */
export default class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.screen = this.createScreen();
        this.components = {};
        this.rawTasks = []; // To store full task objects
        this.rawBeliefs = []; // To store full belief objects
        this.initComponents();
        this.setupLayout();
        this.registerKeybindings();
    }

    createScreen() {
        return blessed.screen({
            smartCSR: true,
            title: 'SeNARS TUI',
            fullUnicode: true,
        });
    }

    initComponents() {
        this.components.header = createHeader();
        this.components.statusBar = createStatusBar();
        this.components.taskBox = createTaskBox((item, index) => {
            const task = this.rawTasks[index];
            if (task) {
                this.components.detailBox.setContent(JSON.stringify(task, null, 2));
                this.screen.render();
            }
        });
        this.components.logBox = createLogBox();
        this.components.narseseInput = createNarseseInput();
        this.components.commandInput = createCommandInput();
        this.components.helpBox = createHelpBox();
        this.components.detailBox = createDetailBox();
        this.components.beliefsBox = createBeliefsBox((item, index) => {
            this.stateManager.setSelectedBeliefIndex(index);
            const belief = this.rawBeliefs[index];
            if (belief) {
                this.components.detailBox.setContent(JSON.stringify(belief, null, 2));
                this.screen.render();
            }
        });
    }

    setupLayout() {
        Object.values(this.components).forEach(component => {
            this.screen.append(component);
        });
    }

    registerKeybindings() {
        this.screen.key(['q', 'C-c'], () => process.exit(0));

        this.screen.key(['escape', 'i'], () => {
            this.stateManager.set('focusedComponent', 'narseseInput');
            this.components.narseseInput.focus();
            this.updateStatusBar();
        });

        this.screen.key([':'], () => {
            this.stateManager.set('focusedComponent', 'commandInput');
            this.components.commandInput.focus();
            this.updateStatusBar();
        });

        this.screen.key(['t'], () => {
            this.stateManager.set('focusedComponent', 'taskBox');
            this.components.taskBox.focus();
            this.updateStatusBar();
        });

        this.screen.key(['b'], () => {
            this.stateManager.set('focusedComponent', 'beliefsBox');
            this.components.beliefsBox.focus();
            this.updateStatusBar();
        });
    }

    log(message) {
        this.components.logBox.log(message);
        this.screen.render();
    }

    updateTasks(tasks) {
        this.rawTasks = tasks; // Store full task objects
        const taskItems = tasks.map(t => {
            // Create a compact, readable string for the list
            return `${t.id}: ${t.term} (${t.type}) - P:${t.priority.toFixed(2)} D:${t.durability.toFixed(2)}`;
        });
        this.components.taskBox.setItems(taskItems);
        this.screen.render();
    }

    updateBeliefs(beliefs) {
        this.rawBeliefs = beliefs; // Store full belief objects
        const beliefItems = beliefs.map(b => {
            // Create a compact, readable string for the list
            return `${b.term} C:${b.confidence.toFixed(2)} F:${b.frequency.toFixed(2)}`;
        });
        this.components.beliefsBox.setItems(beliefItems);
        this.screen.render();
    }

    updateStatusBar() {
        const connected = this.stateManager.get('isConnected');
        const focused = this.stateManager.get('focusedComponent');
        const content = ` ${connected ? 'Connected' : 'Disconnected'} | Focus: ${focused}`;
        this.components.statusBar.setContent(content);
        this.screen.render();
    }

    render() {
        this.screen.render();
    }
}