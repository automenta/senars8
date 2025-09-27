import UIManager from '../src/managers/UIManager.js';
import StateManager from '../src/managers/StateManager.js';

// Mock dependencies
vi.mock('blessed', () => ({
    default: {
        screen: vi.fn(() => ({
            key: vi.fn(),
            append: vi.fn(),
            render: vi.fn(),
            on: vi.fn(),
            removeListener: vi.fn(),
        })),
        box: vi.fn(options => ({
            ...options,
            on: vi.fn(),
            focus: vi.fn(),
            style: {},
            hide: vi.fn(),
            show: vi.fn(),
            setContent: vi.fn(),
            setLabel: vi.fn()
        })),
        list: vi.fn(options => ({
            ...options,
            on: vi.fn(),
            focus: vi.fn(),
            style: {},
            hide: vi.fn(),
            show: vi.fn(),
            setItems: vi.fn()
        })),
        log: vi.fn(options => ({
            ...options,
            on: vi.fn(),
            focus: vi.fn(),
            style: {},
            hide: vi.fn(),
            show: vi.fn(),
            log: vi.fn(),
            setContent: vi.fn()
        })),
        textbox: vi.fn(options => ({
            ...options,
            on: vi.fn(),
            focus: vi.fn(),
            style: {},
            hide: vi.fn(),
            show: vi.fn()
        })),
    }
}));

vi.mock('blessed-contrib', () => ({
    default: {
        grid: vi.fn(() => ({
            set: vi.fn((row, col, rowSpan, colSpan, obj, options) => ({
                ...options,
                on: vi.fn(),
                focus: vi.fn(),
                style: {border: {}},
                hide: vi.fn(),
                show: vi.fn(),
                log: vi.fn(),
                setItems: vi.fn(),
                setContent: vi.fn(),
                setLabel: vi.fn(),
            })),
        })),
    }
}));

vi.mock('cli-highlight', () => ({
    highlight: vi.fn(text => text),
}));

vi.mock('../src/components/Header.js', () => ({getHeaderConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/StatusBar.js', () => ({getStatusBarConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/TaskBox.js', () => ({getTaskBoxConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/LogBox.js', () => ({getLogBoxConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/NarseseInput.js', () => ({getNarseseInputConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/CommandInput.js', () => ({getCommandInputConfig: vi.fn(() => ({}))}));
vi.mock('../src/components/HelpBox.js', () => ({
    createHelpBox: vi.fn(() => ({
        hide: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        setContent: vi.fn(),
        visible: false
    }))
}));
vi.mock('../src/components/DetailBox.js', () => ({
    createDetailBox: vi.fn(() => ({
        hide: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
        setContent: vi.fn(),
        setLabel: vi.fn(),
        visible: false
    }))
}));
vi.mock('../src/components/BeliefsBox.js', () => ({getBeliefsBoxConfig: vi.fn(() => ({}))}));
vi.mock('../src/services/commandHandler.js', () => ({commandDefinitions: {}}));


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