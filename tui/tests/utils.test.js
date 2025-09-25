import { formatTasks, formatSystemStats, createDashboardContent, formatNotifications, formatReasoningStep, formatReasoningTrace } from '../src/utils/formatters.js';
import { appState } from '../src/modules/state.js';

// Mock the state module
jest.mock('../src/modules/state.js', () => ({
  appState: {
    stats: {
      isRunning: true,
      cycleCount: 123,
      cpuUsage: '10%',
      memoryUsage: '50MB',
      temperature: 45
    },
    beliefs: [{ statement: 'Test belief.' }],
    goals: [{ statement: 'Test goal!' }],
    questions: [{ statement: 'Test question?' }],
    tasks: [
        { statement: 'Test belief.' },
        { statement: 'Test goal!' },
        { statement: 'Test question?' }
    ],
    notifications: [],
    statusUpdates: 5,
    newBeliefs: 2,
    newGoals: 1,
    reasoningSteps: 10,
    reasoningTraces: []
  },
}));

describe('TUI Formatters', () => {
  describe('formatTasks', () => {
    it('should format a list of tasks correctly', () => {
      const tasks = [
        { termKey: '<cat --> animal>', punctuation: '.', state: { priority: 0.9, truthValue: { frequency: 0.9, confidence: 0.9 } } },
        { termKey: '<bird --> animal>?', punctuation: '?', state: { priority: 0.8 } },
      ];
      const formatted = formatTasks(tasks, 'My Tasks');
      expect(formatted).toContain('My Tasks (2)');
      expect(formatted).toContain('<cat --> animal> . | P: 0.90 TV(0.90, 0.90)');
      expect(formatted).toContain('<bird --> animal>? ? | P: 0.80');
    });

    it('should handle an empty list of tasks', () => {
      const formatted = formatTasks([], 'My Tasks');
      expect(formatted).toBe('My Tasks: No items found');
    });
  });

  describe('formatSystemStats', () => {
    it('should format system stats correctly', () => {
      const stats = {
        cycleCount: 100,
        isRunning: true,
        memoryUsage: '123MB',
        beliefs: 10,
        goals: 5,
        questions: 2,
        tasks: 17,
        cpuUsage: '25%',
        temperature: '60C'
      };
      const formatted = formatSystemStats(stats);
      expect(formatted).toContain('Cycles: 100');
      expect(formatted).toContain('Running: Yes');
      expect(formatted).toContain('Total Usage: 123MB');
    });
  });

  describe('createDashboardContent', () => {
    it('should create dashboard content correctly', () => {
        const content = createDashboardContent();
        expect(content).toContain('SeNARS Real-Time Dashboard');
        expect(content).toContain('Agent Running: {green}YES{/green}');
        expect(content).toContain('Cycles: {cyan}123{/cyan}');
        expect(content).toContain('Total Tasks: {magenta}3{/magenta}');
    });
  });

  describe('formatNotifications', () => {
    it('should format notifications correctly', () => {
        const notifications = [
            { timestamp: new Date(), message: 'Error occurred', type: 'error' },
            { timestamp: new Date(), message: 'Task complete', type: 'success' },
        ];
        const formatted = formatNotifications(notifications);
        expect(formatted).toContain('Notifications (2)');
        expect(formatted).toContain('[✗]');
        expect(formatted).toContain('Error occurred');
        expect(formatted).toContain('[✓]');
        expect(formatted).toContain('Task complete');
    });
  });
});