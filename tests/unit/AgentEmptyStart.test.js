import { beforeEach, describe, expect, it, vi } from 'vitest';
import Agent from '../../agent/Agent.js';
import { createSystem } from '../../core/index.js';

// Mock the core system to avoid loading external dependencies
vi.mock('../../core/index.js', () => {
  const mockSystem = {
    memory: {
      getAllTasks: vi.fn().mockReturnValue([]),
      getBeliefs: vi.fn().mockReturnValue([]),
      getGoals: vi.fn().mockReturnValue([]),
      getQuestions: vi.fn().mockReturnValue([]),
    },
    eventBus: {
      on: vi.fn(),
      emit: vi.fn(),
    },
    commandBus: {
      request: vi.fn(),
    },
    reasoner: {
      planner: {
        createPlan: vi.fn().mockResolvedValue(null),
      },
    },
    addTasks: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  };

  return {
    createSystem: vi.fn().mockResolvedValue(mockSystem),
    agentErrorHandler: {
      execute: vi.fn().mockImplementation((fn) => fn()),
      runSync: vi.fn().mockImplementation((fn) => fn()),
    }
  };
});

describe('Agent Empty Startup Test', () => {
  let agent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new Agent();
  });

  it('should start with empty state when initialized without file monitoring', async () => {
    // Initialize the agent without file monitoring
    await agent.initialize();

    expect(agent.isInitialized).toBe(true);
    expect(createSystem).toHaveBeenCalled();

    // Check that the agent state is empty
    const state = agent.getAgentState();
    expect(state.tasks).toEqual([]);
    expect(state.beliefs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.questions).toEqual([]);
  });

  it('should not automatically load documents during initialization', async () => {
    // Initialize the agent
    await agent.initialize();

    // Verify no automatic document loading happened
    const state = agent.getAgentState();
    expect(state.tasks).toHaveLength(0);
    expect(state.beliefs).toHaveLength(0);
    expect(state.goals).toHaveLength(0);
    expect(state.questions).toHaveLength(0);

    // Verify no file processing was triggered in core
    expect(agent.system.addTasks).not.toHaveBeenCalled();
  });
});