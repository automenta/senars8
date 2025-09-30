import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileMonitoring from '../../agent/fileMonitoring.js';
import PlanProcessor from '../../core/utils/PlanProcessor.js';
import { glob } from 'glob';

const { watcherInstance } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getWatched: vi.fn().mockReturnValue({}),
    _events: {},
    _clear: function() {
      this._events = {};
      this.on.mockClear();
      this.close.mockClear();
      this.getWatched.mockClear();
    },
    _trigger: function(event, ...args) {
      if (this._events[event]) this._events[event](...args);
    },
  };
  instance.on.mockImplementation(function(event, callback) {
    instance._events[event] = callback;
    return instance;
  });
  return { watcherInstance: instance };
});

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn().mockReturnValue(watcherInstance),
  },
}));

vi.mock('../../core/utils/PlanProcessor.js');
vi.mock('glob');

describe('FileMonitoring', () => {
  let agent;
  let fileMonitoring;
  let mockPlanProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    watcherInstance._clear();
    glob.sync.mockReturnValue([]); // Default to no files found

    mockPlanProcessor = {
      initialize: vi.fn(),
      processFile: vi.fn().mockResolvedValue([{ content: 'goal1' }]),
      convertGoalsToTasks: vi.fn().mockReturnValue([{ id: 'task1' }]),
      getStatistics: vi.fn().mockReturnValue({ processed: 1 }),
    };
    PlanProcessor.mockImplementation(() => mockPlanProcessor);

    agent = {
      system: {
        eventBus: { on: vi.fn(), emit: vi.fn() },
        addTasks: vi.fn().mockResolvedValue(undefined),
      },
    };

    fileMonitoring = new FileMonitoring(agent, {
      patterns: ['**/*.md'],
      watchDir: '/test/dir',
      debounce: 10,
    });
  });

  it('should initialize correctly', () => {
    expect(fileMonitoring).toBeInstanceOf(FileMonitoring);
  });

  it('should start and process existing files', async () => {
    glob.sync.mockReturnValue(['/test/dir/existing.md']);
    await fileMonitoring.start();
    expect(fileMonitoring.isWatching).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockPlanProcessor.processFile).toHaveBeenCalledWith('/test/dir/existing.md', { initial: true });
  });

  it('should handle file changes with debouncing', async () => {
    await fileMonitoring.start();
    watcherInstance._trigger('change', '/test/dir/new.md');
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockPlanProcessor.processFile).toHaveBeenCalledTimes(1);
  });

  it('should handle file removal', async () => {
    await fileMonitoring.start();
    fileMonitoring.processedFiles.add('/test/dir/removed.md');
    watcherInstance._trigger('unlink', '/test/dir/removed.md');
    expect(fileMonitoring.processedFiles.has('/test/dir/removed.md')).toBe(false);
  });

  it('should stop the watcher', async () => {
    await fileMonitoring.start();
    await fileMonitoring.stop();
    expect(watcherInstance.close).toHaveBeenCalled();
  });

  it('should get statistics', async () => {
    await fileMonitoring.start();
    fileMonitoring.processedFiles.add('file1.md');
    const stats = fileMonitoring.getStatistics();
    expect(stats.processedFilesCount).toBe(1);
  });
});