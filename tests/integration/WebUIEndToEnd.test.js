import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { createServer } from 'http';
import { startWebSocketServer } from '../../agent/WebSocketServer.js';
import AgentManager from '../../agent/AgentManager.js';

// Mock the file system operations to avoid actual file processing
vi.mock('fs');
vi.mock('glob');
vi.mock('../../core/utils/PlanProcessor.js');

// Mock the async wrapper to avoid dynamic imports
vi.mock('../../agent/utils/asyncWrapper.js', () => ({
  executeAsync: vi.fn().mockImplementation(async (fn) => {
    return fn();
  })
}));

// Mock the agent API handlers
vi.mock('../../agent/api/agent.js', () => ({
  handleNarsese: vi.fn().mockResolvedValue(undefined),
  handleAgentControl: vi.fn().mockResolvedValue(undefined),
  handleGetTasks: vi.fn().mockResolvedValue(undefined),
  handleTaskAction: vi.fn().mockResolvedValue(undefined),
  handleAddTask: vi.fn().mockResolvedValue(undefined),
  handleSearch: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../agent/api/fileSystem.js', () => ({
  handleReadDirectory: vi.fn().mockResolvedValue(undefined),
  handleReadFile: vi.fn().mockResolvedValue(undefined),
  handleWriteFile: vi.fn().mockResolvedValue(undefined),
  handleCreateFile: vi.fn().mockResolvedValue(undefined),
  handleCreateDirectory: vi.fn().mockResolvedValue(undefined),
  handleDeletePath: vi.fn().mockResolvedValue(undefined),
  handleRenamePath: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../agent/api/command.js', () => ({
  handleRunCommand: vi.fn().mockResolvedValue(undefined)
}));

describe('WebUI End-to-End Test', () => {
  let server;
  let wss;
  const port = 8081;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = createServer();
    const result = startWebSocketServer(server);
    wss = result.wss;
    await new Promise(resolve => server.listen(port, resolve));
  });

  afterEach(async () => {
    const closePromise = (service) => new Promise(resolve => {
      if (service && service.close) {
        service.close(() => resolve());
      } else {
        resolve();
      }
    });

    await closePromise(wss);
    await closePromise(server);
  });

  it('should establish WebSocket connection without errors', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', (error) => reject(new Error(`WebSocket connection failed: ${error.message}`)));
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  });

  it('should handle basic WebSocket messages without crashing', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping', payload: {} }));
        // For now, just close the connection after opening
        setTimeout(() => {
          ws.close();
          resolve();
        }, 100);
      });
      ws.on('error', (error) => reject(new Error(`WebSocket communication failed: ${error.message}`)));
      setTimeout(() => reject(new Error('WebSocket communication timeout')), 5000);
    });
  });

  it('should initialize agent manager without startup errors', async () => {
    const mockBroadcast = vi.fn();
    const agentManager = new AgentManager(mockBroadcast);
    await expect(agentManager.initialize()).resolves.not.toThrow();
    const agent = agentManager.getAgent();
    expect(agent.isInitialized).toBe(true);
  });
});