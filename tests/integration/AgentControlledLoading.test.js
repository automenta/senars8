import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import fs from 'fs';
import { glob } from 'glob';
import PlanProcessor from '../../core/utils/PlanProcessor.js';
import { SystemCommands } from '../../core/system/SystemCommands.js';

vi.mock('../../core/utils/PlanProcessor.js');

const { mockSystem } = vi.hoisted(() => ({
  mockSystem: {
    eventBus: { on: vi.fn(), emit: vi.fn() },
    memory: {
      getAllTasks: vi.fn().mockReturnValue([]),
      getBeliefs: vi.fn().mockReturnValue([]),
      getGoals: vi.fn().mockReturnValue([]),
      getQuestions: vi.fn().mockReturnValue([]),
    },
    addTasks: vi.fn().mockResolvedValue(undefined),
    commandBus: {
      request: vi.fn()
    },
    reasoner: {
      planner: {
        createPlan: vi.fn().mockResolvedValue({ steps: [{ key: 'action' }] }),
      },
    },
    stop: vi.fn(),
  }
}));

const { watcherInstance } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    add: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    _events: {},
    _clear: function () {
      this._events = {};
      this.on.mockClear();
      this.add.mockClear();
      this.close.mockClear();
      this.stop.mockClear();
    },
    _trigger: function (event, ...args) {
      if (this._events[event]) this._events[event](...args);
    },
  };
  instance.on.mockImplementation(function (event, callback) {
    instance._events[event] = callback;
    return instance;
  });
  return { watcherInstance: instance };
});

vi.mock('../../core/index.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createSystem: vi.fn().mockResolvedValue(mockSystem),
  };
});

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn().mockReturnValue(watcherInstance),
  },
}));

vi.mock('fs');
vi.mock('glob');

describe('Agent Controlled Document Loading Test', () => {
  let agentManager;
  let mockPlanProcessor;
  let mockBroadcast;

  beforeEach(() => {
    vi.clearAllMocks();
    watcherInstance._clear();
    glob.sync.mockClear();

    mockPlanProcessor = {
      initialize: vi.fn(),
      processFile: vi.fn().mockResolvedValue([]),
      convertGoalsToTasks: vi.fn().mockReturnValue([]),
    };
    PlanProcessor.mockImplementation(() => mockPlanProcessor);

    fs.readFileSync.mockReturnValue('');
    fs.existsSync.mockReturnValue(true);
    glob.sync.mockReturnValue([]);

    mockBroadcast = vi.fn();
    agentManager = new AgentManager(mockBroadcast);
  });

  it('should initialize agent manager correctly', async () => {
    await agentManager.initialize();

    const agent = agentManager.getAgent();
    expect(agent.isInitialized).toBe(true);

    // Verify basic initialization worked
    expect(mockSystem.eventBus.on).toHaveBeenCalled();
  });

  it('should handle agent commands without errors', async () => {
    await agentManager.initialize();

    // Test start command
    await agentManager.start(10);
    expect(mockSystem.commandBus.request).toHaveBeenCalledWith(
      SystemCommands.SYSTEM_START_CYCLING,
      { maxCycles: 10 }
    );

    // Reset mocks
    mockSystem.commandBus.request.mockClear();

    // Test stop command
    await agentManager.stop();
    expect(mockSystem.commandBus.request).toHaveBeenCalledWith(
      SystemCommands.SYSTEM_STOP_CYCLING
    );

    // Reset mocks
    mockSystem.commandBus.request.mockClear();

    // Test reset command
    await agentManager.reset();
    expect(mockSystem.commandBus.request).toHaveBeenCalledWith(
      SystemCommands.SYSTEM_RESET
    );
  });

  it('should maintain empty state when no documents are processed', async () => {
    await agentManager.initialize();

    // Check that the agent state is empty
    const state = agentManager.getAgent().getAgentState();
    expect(state.tasks).toEqual([]);
    expect(state.beliefs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.questions).toEqual([]);
  });
});