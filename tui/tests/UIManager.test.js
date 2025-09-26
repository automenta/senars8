import UIManager from '../src/managers/UIManager.js';
import StateManager from '../src/managers/StateManager.js';

// Mock blessed library
jest.mock('blessed', () => ({
    screen: jest.fn(() => ({
        append: jest.fn(),
        key: jest.fn(),
        render: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
        program: {
            showCursor: jest.fn(),
            hideCursor: jest.fn(),
            alternateBuffer: jest.fn(),
            exit: jest.fn(),
        },
    })),
    box: jest.fn(() => ({ on: jest.fn(), setContent: jest.fn(), toggle: jest.fn() })),
    list: jest.fn(() => ({ on: jest.fn(), setItems: jest.fn(), focus: jest.fn() })),
    log: jest.fn(() => ({ log: jest.fn(), clear: jest.fn() })),
    textbox: jest.fn(() => ({ on: jest.fn(), focus: jest.fn(), clearValue: jest.fn(), setValue: jest.fn() })),
}));

describe('UIManager', () => {
    let stateManager;
    let uiManager;

    beforeEach(() => {
        stateManager = new StateManager();
        uiManager = new UIManager(stateManager);
    });

    test('should initialize and create all UI components', () => {
        expect(uiManager.screen).toBeDefined();
        expect(Object.keys(uiManager.components).length).toBe(9); // Header, StatusBar, TaskBox, LogBox, NarseseInput, CommandInput, HelpBox, DetailBox, BeliefsBox
        expect(uiManager.components.header).toBeDefined();
        expect(uiManager.components.statusBar).toBeDefined();
        expect(uiManager.components.taskBox).toBeDefined();
        expect(uiManager.components.logBox).toBeDefined();
        expect(uiManager.components.narseseInput).toBeDefined();
        expect(uiManager.components.commandInput).toBeDefined();
        expect(uiManager.components.helpBox).toBeDefined();
        expect(uiManager.components.detailBox).toBeDefined();
        expect(uiManager.components.beliefsBox).toBeDefined();
    });

    test('should register keybindings', () => {
        // q, C-c, escape, i, :, t, b
        expect(uiManager.screen.key).toHaveBeenCalledWith(['q', 'C-c'], expect.any(Function));
        expect(uiManager.screen.key).toHaveBeenCalledWith(['escape', 'i'], expect.any(Function));
        expect(uiManager.screen.key).toHaveBeenCalledWith([':'], expect.any(Function));
        expect(uiManager.screen.key).toHaveBeenCalledWith(['t'], expect.any(Function));
        expect(uiManager.screen.key).toHaveBeenCalledWith(['b'], expect.any(Function));
    });

    test('should update status bar', () => {
        stateManager.set('isConnected', true);
        stateManager.set('focusedComponent', 'narseseInput');
        uiManager.updateStatusBar();
        expect(uiManager.components.statusBar.setContent).toHaveBeenCalledWith(' Connected | Focus: narseseInput');
    });

    test('should update tasks', () => {
        const tasks = [{ id: 1, term: 'test', type: 'goal', priority: 0.9, durability: 0.9 }];
        uiManager.updateTasks(tasks);
        expect(uiManager.components.taskBox.setItems).toHaveBeenCalledWith(['1: test (goal) - P:0.90 D:0.90']);
    });

    test('should update beliefs', () => {
        const beliefs = [{ term: '<a --> b>', confidence: 0.9, frequency: 0.9 }];
        uiManager.updateBeliefs(beliefs);
        expect(uiManager.components.beliefsBox.setItems).toHaveBeenCalledWith(['<a --> b> C:0.90 F:0.90']);
    });
});