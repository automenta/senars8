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
  let port = 8081; // Define port upfront

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wss) {
      wss.close();
    }
    if (server) {
      server.close();
    }
  });

  it('should establish WebSocket connection without errors', async () => {
    // This test would have caught the import errors we fixed
    // Start WebSocket server on the port
    const result = startWebSocketServer(port);
    wss = result.wss;

    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      // Timeout to prevent hanging
      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  });

  it('should handle basic WebSocket messages without crashing', async () => {
    // Start WebSocket server on the port
    const result = startWebSocketServer(port);
    wss = result.wss;

    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        // Send a simple message
        ws.send(JSON.stringify({
          type: 'ping',
          payload: {}
        }));
      });

      // For now, just close the connection after opening
      setTimeout(() => {
        ws.close();
        resolve();
      }, 100);

      ws.on('error', (error) => {
        reject(new Error(`WebSocket communication failed: ${error.message}`));
      });

      // Timeout to prevent hanging
      setTimeout(() => {
        reject(new Error('WebSocket communication timeout'));
      }, 5000);
    });
  });

  it('should initialize agent manager without startup errors', async () => {
    // This test would have caught the coreIntegration.js syntax error
    const mockBroadcast = vi.fn();
    const agentManager = new AgentManager(mockBroadcast);

    // This should not throw any errors
    await expect(agentManager.initialize()).resolves.not.toThrow();

    const agent = agentManager.getAgent();
    expect(agent.isInitialized).toBe(true);
  });
});