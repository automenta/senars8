import StateManager from '../src/managers/StateManager.js';

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = new StateManager();
    });

    test('should initialize with default state', () => {
        expect(stateManager.get('isConnected')).toBe(false);
        expect(stateManager.get('commandHistory')).toEqual([]);
        expect(stateManager.get('focusedComponent')).toBe('commandInput');
    });

    test('should set and get a value from state', () => {
        stateManager.set('isConnected', true);
        expect(stateManager.get('isConnected')).toBe(true);
    });

    test('should add a command to history', () => {
        stateManager.addCommandToHistory('!test');
        expect(stateManager.get('commandHistory')).toEqual(['!test']);
    });

    test('should not add empty commands to history', () => {
        stateManager.addCommandToHistory('');
        expect(stateManager.get('commandHistory')).toEqual([]);
    });

    test('should navigate command history correctly', () => {
        stateManager.addCommandToHistory('!first');
        stateManager.addCommandToHistory('!second');

        expect(stateManager.getPreviousCommand()).toBe('!second');
        expect(stateManager.getPreviousCommand()).toBe('!first');
        expect(stateManager.getPreviousCommand()).toBe(null);

        // stateManager is now at the beginning
        expect(stateManager.getNextCommand()).toBe('!second');
        expect(stateManager.getNextCommand()).toBe(''); // at the end
    });

    test('should reset history index when getting next command past the end', () => {
        stateManager.addCommandToHistory('!a');
        stateManager.addCommandToHistory('!b');

        stateManager.getPreviousCommand(); // index at 1 ('!b')
        stateManager.getPreviousCommand(); // index at 0 ('!a')

        stateManager.getNextCommand(); // index at 1 ('!b')
        const next = stateManager.getNextCommand(); // moves past end

        expect(next).toBe('');
        expect(stateManager.get('currentHistoryIndex')).toBe(2); // Should be at the end of the history array
    });

    test('should handle logs and tasks', () => {
        stateManager.addLog('Test log');
        expect(stateManager.get('log')).toEqual(['Test log']);

        const tasks = [{ id: 1, term: 'test' }];
        stateManager.setTasks(tasks);
        expect(stateManager.get('tasks')).toEqual(tasks);
    });
});