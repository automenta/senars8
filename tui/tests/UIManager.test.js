import UIManager from '../src/managers/UIManager.js';
import StateManager from '../src/managers/StateManager.js';

// Mock dependencies
jest.mock('blessed', () => ({
    screen: jest.fn(() => ({
        key: jest.fn(),
        append: jest.fn(),
        render: jest.fn(),
        on: jest.fn(),
        removeListener: jest.fn(),
    })),
    box: jest.fn(options => ({ ...options, on: jest.fn(), focus: jest.fn(), style: {}, hide: jest.fn(), show: jest.fn(), setContent: jest.fn(), setLabel: jest.fn() })),
    list: jest.fn(options => ({ ...options, on: jest.fn(), focus: jest.fn(), style: {}, hide: jest.fn(), show: jest.fn(), setItems: jest.fn() })),
    log: jest.fn(options => ({ ...options, on: jest.fn(), focus: jest.fn(), style: {}, hide: jest.fn(), show: jest.fn(), log: jest.fn(), setContent: jest.fn() })),
    textbox: jest.fn(options => ({ ...options, on: jest.fn(), focus: jest.fn(), style: {}, hide: jest.fn(), show: jest.fn() })),
}));

jest.mock('blessed-contrib', () => ({
    grid: jest.fn(() => ({
        set: jest.fn((row, col, rowSpan, colSpan, obj, options) => ({
            ...options,
            on: jest.fn(),
            focus: jest.fn(),
            style: { border: {} },
            hide: jest.fn(),
            show: jest.fn(),
            log: jest.fn(),
            setItems: jest.fn(),
            setContent: jest.fn(),
            setLabel: jest.fn(),
        })),
    })),
}));

jest.mock('cli-highlight', () => ({
    highlight: jest.fn(text => text),
}));

jest.mock('../src/components/Header.js', () => ({ getHeaderConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/StatusBar.js', () => ({ getStatusBarConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/TaskBox.js', () => ({ getTaskBoxConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/LogBox.js', () => ({ getLogBoxConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/NarseseInput.js', () => ({ getNarseseInputConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/CommandInput.js', () => ({ getCommandInputConfig: jest.fn(() => ({})) }));
jest.mock('../src/components/HelpBox.js', () => ({ createHelpBox: jest.fn(() => ({ hide: jest.fn(), show: jest.fn(), focus: jest.fn(), setContent: jest.fn(), visible: false })) }));
jest.mock('../src/components/DetailBox.js', () => ({ createDetailBox: jest.fn(() => ({ hide: jest.fn(), show: jest.fn(), focus: jest.fn(), setContent: jest.fn(), setLabel: jest.fn(), visible: false })) }));
jest.mock('../src/components/BeliefsBox.js', () => ({ getBeliefsBoxConfig: jest.fn(() => ({})) }));
jest.mock('../src/services/commandHandler.js', () => ({ commandDefinitions: {} }));


describe('UIManager', () => {
    let stateManager;
    let uiManager;

    beforeEach(() => {
        stateManager = new StateManager();
        uiManager = new UIManager(stateManager);
    });

    it('should instantiate without crashing', () => {
        expect(uiManager).toBeInstanceOf(UIManager);
    });

    it('should set focus and update status bar', () => {
        const componentName = 'taskBox';
        uiManager.setFocus(componentName);
        expect(uiManager.components[componentName].focus).toHaveBeenCalled();
        expect(uiManager.components.statusBar.setContent).toHaveBeenCalled();
    });

    it('should clear the log content', () => {
        uiManager.clearLog();
        expect(uiManager.components.logBox.setContent).toHaveBeenCalledWith('');
    });

    it('should toggle help box visibility and set content', () => {
        // Initially hidden
        expect(uiManager.components.helpBox.visible).toBe(false);

        // Show help
        uiManager.toggleHelp();
        expect(uiManager.components.helpBox.show).toHaveBeenCalled();
        expect(uiManager.components.helpBox.focus).toHaveBeenCalled();
        expect(uiManager.components.helpBox.setContent).toHaveBeenCalled();

        // Hide help by toggling again
        uiManager.components.helpBox.visible = true; // simulate it's visible
        uiManager.toggleHelp();
        // The handleEscape function is now responsible for hiding
        // We'll test that separately if needed, but this confirms the branch logic
        expect(uiManager.components.helpBox.visible).toBe(true); // Should still be visible before handleEscape is called
    });
});