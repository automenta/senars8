import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import UIManager from '../src/managers/UIManager.js';
import StateManager from '../src/managers/StateManager.js';

// Mock component factory functions to return predictable mock objects
const mockHeader = { on: jest.fn(), setContent: jest.fn() };
const mockStatusBar = { on: jest.fn(), setContent: jest.fn() };
const mockTaskBox = { on: jest.fn(), setItems: jest.fn(), focus: jest.fn() };
const mockLogBox = { log: jest.fn(), clear: jest.fn() };
const mockNarseseInput = { on: jest.fn(), focus: jest.fn(), clearValue: jest.fn(), setValue: jest.fn() };
const mockCommandInput = { on: jest.fn(), focus: jest.fn(), clearValue: jest.fn(), setValue: jest.fn(), key: jest.fn() };
const mockHelpBox = { on: jest.fn(), toggle: jest.fn() };
const mockDetailBox = { on: jest.fn(), setContent: jest.fn() };
const mockBeliefsBox = { on: jest.fn(), setItems: jest.fn(), focus: jest.fn() };

// Mock the screen separately as it's not a component module
jest.mock('blessed', () => ({
    screen: jest.fn(() => ({
        append: jest.fn(),
        key: jest.fn(),
        render: jest.fn(),
    })),
}));

// Mock each component module
jest.mock('../src/components/Header.js', () => ({ createHeader: () => mockHeader }));
jest.mock('../src/components/StatusBar.js', () => ({ createStatusBar: () => mockStatusBar }));
jest.mock('../src/components/TaskBox.js', () => ({ createTaskBox: () => mockTaskBox }));
jest.mock('../src/components/LogBox.js', () => ({ createLogBox: () => mockLogBox }));
jest.mock('../src/components/NarseseInput.js', () => ({ createNarseseInput: () => mockNarseseInput }));
jest.mock('../src/components/CommandInput.js', () => ({ createCommandInput: () => mockCommandInput }));
jest.mock('../src/components/HelpBox.js', () => ({ createHelpBox: () => mockHelpBox }));
jest.mock('../src/components/DetailBox.js', () => ({ createDetailBox: () => mockDetailBox }));
jest.mock('../src/components/BeliefsBox.js', () => ({ createBeliefsBox: () => mockBeliefsBox }));

describe('UIManager', () => {
    let stateManager;
    let uiManager;

    beforeEach(() => {
        jest.clearAllMocks();
        stateManager = new StateManager();
        uiManager = new UIManager(stateManager);
    });

    test('should initialize and create all UI components', () => {
        expect(uiManager.screen).toBeDefined();
        expect(Object.keys(uiManager.components).length).toBe(9);
        expect(uiManager.components.header).toBe(mockHeader);
        expect(uiManager.components.statusBar).toBe(mockStatusBar);
    });

    test('should register keybindings', () => {
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
        expect(mockStatusBar.setContent).toHaveBeenCalledWith(' Connected | Focus: narseseInput');
    });

    test('should update tasks', () => {
        const tasks = [{ id: 1, term: 'test', type: 'goal', priority: 0.9, durability: 0.9 }];
        uiManager.updateTasks(tasks);
        expect(mockTaskBox.setItems).toHaveBeenCalledWith(['1: test (goal) - P:0.90 D:0.90']);
    });

    test('should update beliefs', () => {
        const beliefs = [{ term: '<a --> b>', confidence: 0.9, frequency: 0.9 }];
        uiManager.updateBeliefs(beliefs);
        expect(mockBeliefsBox.setItems).toHaveBeenCalledWith(['<a --> b> C:0.90 F:0.90']);
    });
});