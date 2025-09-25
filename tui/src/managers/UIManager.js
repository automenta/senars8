import blessed from 'blessed';

/**
 * Manages the UI components for the TUI.
 */
export default class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.screen = this.createScreen();
        this.components = {};
        this.rawTasks = []; // To store full task objects
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
        this.components.header = this.createHeader();
        this.components.statusBar = this.createStatusBar();
        this.components.taskBox = this.createTaskBox();
        this.components.logBox = this.createLogBox();
        this.components.narseseInput = this.createNarseseInput();
        this.components.commandInput = this.createCommandInput();
        this.components.helpBox = this.createHelpBox();
        this.components.detailBox = this.createDetailBox();
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
    }

    createHeader() {
        return blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: ' SeNARS TUI ',
            style: {
                fg: 'white',
                bg: 'blue',
            },
        });
    }

    createStatusBar() {
        return blessed.box({
            top: 1,
            left: 0,
            width: '100%',
            height: 1,
            style: {
                fg: 'white',
                bg: 'cyan',
            },
        });
    }

    createTaskBox() {
        const taskBox = blessed.list({
            top: 2,
            left: 0,
            width: '50%',
            height: '60%-2',
            label: 'Tasks',
            border: {
                type: 'line',
            },
            style: {
                fg: 'white',
                border: {
                    fg: '#f0f0f0',
                },
                selected: {
                    bg: 'blue',
                },
            },
            keys: true,
            mouse: true,
            scrollable: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'grey',
                },
                style: {
                    inverse: true,
                },
            },
        });

        taskBox.on('select', (item, index) => {
            const task = this.rawTasks[index];
            if (task) {
                this.components.detailBox.setContent(JSON.stringify(task, null, 2));
                this.screen.render();
            }
        });

        return taskBox;
    }

    createLogBox() {
        return blessed.log({
            top: 2,
            left: '50%',
            width: '50%',
            height: '100%-4',
            label: 'Log',
            border: {
                type: 'line',
            },
            style: {
                fg: 'white',
                border: {
                    fg: '#f0f0f0',
                },
            },
            scrollable: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'grey',
                },
                style: {
                    inverse: true,
                },
            },
        });
    }

    createDetailBox() {
        return blessed.box({
            top: '60%',
            left: 0,
            width: '50%',
            height: '40%-2',
            label: 'Details',
            content: '',
            border: {
                type: 'line',
            },
            style: {
                fg: 'white',
                border: {
                    fg: '#f0f0f0',
                },
            },
        });
    }

    createNarseseInput() {
        return blessed.textbox({
            bottom: 0,
            left: 0,
            width: '50%',
            height: 1,
            style: {
                bg: 'black',
                fg: 'white',
                focus: {
                    bg: 'grey',
                },
            },
            inputOnFocus: true,
        });
    }

    createCommandInput() {
        return blessed.textbox({
            bottom: 0,
            left: '50%',
            width: '50%',
            height: 1,
            style: {
                bg: 'black',
                fg: 'white',
                focus: {
                    bg: 'grey',
                },
            },
            inputOnFocus: true,
        });
    }

    createHelpBox() {
        return blessed.box({
            top: 'center',
            left: 'center',
            width: '50%',
            height: '50%',
            label: 'Help',
            content: `
    Keybindings:
    q, C-c      Quit
    i           Focus Narsese input
    :           Focus command input
    Up/Down     Navigate history/lists
    Enter       Submit input

    Commands:
    !help       Show this help
    !connect    Connect to agent
    !disconnect Disconnect from agent
    !clear      Clear log
            `,
            border: {
                type: 'line',
            },
            style: {
                fg: 'white',
                border: {
                    fg: '#f0f0f0',
                },
            },
            hidden: true,
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