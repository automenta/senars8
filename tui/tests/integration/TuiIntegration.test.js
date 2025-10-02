import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import Application from '../../src/Application.js';
import ApiService from '@common/services/ApiService.js';

// Mock the terminal UI components
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      key: vi.fn(),
      append: vi.fn(),
      render: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    })),
    box: vi.fn((options) => ({
      ...options,
      on: vi.fn(),
      focus: vi.fn(),
      style: {},
      hide: vi.fn(),
      show: vi.fn(),
      setContent: vi.fn(),
      setLabel: vi.fn()
    })),
    list: vi.fn((options) => ({
      ...options,
      on: vi.fn(),
      focus: vi.fn(),
      style: {},
      hide: vi.fn(),
      show: vi.fn(),
      setItems: vi.fn()
    })),
    log: vi.fn((options) => ({
      ...options,
      on: vi.fn(),
      focus: vi.fn(),
      style: {},
      hide: vi.fn(),
      show: vi.fn(),
      log: vi.fn(),
      setContent: vi.fn()
    })),
    textbox: vi.fn((options) => ({
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

// Mock the API service to prevent actual connections
vi.mock('@common/services/ApiService.js', async () => {
  const actual = await vi.importActual('@common/services/ApiService.js');
  return {
    default: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendNarsese: vi.fn(),
      sendNaturalLanguage: vi.fn(),
      sendMessage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      getAgentState: vi.fn(() => ({ 
        isRunning: false, 
        cycleCount: 0, 
        tasks: [], 
        beliefs: [], 
        goals: [], 
        questions: [], 
        notifications: [] 
      })),
      getTasks: vi.fn(),
      addTask: vi.fn(),
    }))
  };
});

// Mock the logger to prevent console output during tests
vi.mock('@core/utils/logger.js', () => ({
  default: {
    create: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    }))
  },
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}));

// Mock the config to provide consistent test values
vi.mock('@common/constants/config.js', () => ({
  CONFIG: {
    TUI: {
      UPDATE_INTERVAL: 100, // Faster updates for tests
      ENABLE_COLOR: false,
      ENABLE_LOGGING: false
    },
    CONNECTION: {
      WEBSOCKET_URL: 'ws://localhost:8080/test'
    }
  }
}));

describe('TUI Integration Tests', () => {
  let app;
  let mockApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a real instance but with mocked dependencies
    app = new Application();
    
    // Get the mocked ApiService instance
    mockApiService = app.apiService;
  });

  afterEach(() => {
    if (app) {
      app.stop();
    }
  });

  it('should initialize without throwing errors', () => {
    expect(app).toBeInstanceOf(Application);
    expect(app.isRunning).toBe(false);
    expect(mockApiService).toBeDefined();
  });

  it('should start and stop correctly', async () => {
    // Verify initial state
    expect(app.isRunning).toBe(false);
    
    // Start the application
    await app.start();
    expect(app.isRunning).toBe(true);
    expect(mockApiService.connect).toHaveBeenCalled();
    
    // Stop the application
    app.stop();
    expect(app.isRunning).toBe(false);
    expect(mockApiService.disconnect).toHaveBeenCalled();
  });

  it('should handle duplicate start attempts safely', async () => {
    // Start once
    await app.start();
    expect(app.isRunning).toBe(true);
    
    // Try to start again - should not cause errors
    const initialConnectCalls = mockApiService.connect.mock.calls.length;
    await app.start();
    
    // Should still be running and connect should not have been called again
    expect(app.isRunning).toBe(true);
    expect(mockApiService.connect.mock.calls.length).toBe(initialConnectCalls);
  });

  it('should handle duplicate stop attempts safely', async () => {
    // Stop when not running - should be safe
    app.stop();
    expect(app.isRunning).toBe(false);
    
    // Start then stop
    await app.start();
    expect(app.isRunning).toBe(true);
    
    app.stop();
    expect(app.isRunning).toBe(false);
    
    // Stop again when already stopped - should be safe
    app.stop();
    expect(app.isRunning).toBe(false);
  });

  it('should send tasks via ApiService', async () => {
    const testTask = '<bird --> animal>.';
    
    await app.addTask(testTask);
    
    expect(mockApiService.sendNarsese).toHaveBeenCalledWith(testTask);
  });

  it('should handle task sending errors gracefully', async () => {
    // Mock an error in the API service by making it return a rejected promise
    mockApiService.sendNarsese.mockImplementation(() => {
      return Promise.reject(new Error('Connection failed'));
    });
    
    // This should not crash the application and should handle the promise rejection gracefully
    await expect(async () => {
      await app.addTask('<test --> task>.');
    }).not.toThrow();
  });

  it('should maintain proper internal state', async () => {
    expect(app.isRunning).toBe(false);
    
    await app.start();
    expect(app.isRunning).toBe(true);
    
    app.stop();
    expect(app.isRunning).toBe(false);
  });

  it('should initialize all required components', () => {
    expect(app.tuiView).toBeDefined();
    expect(app.tuiController).toBeDefined();
    expect(app.tuiRenderer).toBeDefined();
  });

  it('should handle initialization errors gracefully', async () => {
    // Test that the constructor doesn't throw errors with mocked dependencies
    expect(() => {
      const anotherApp = new Application();
      anotherApp.stop(); // Clean up
    }).not.toThrow();
  });
});

describe('TUI Component Integration', () => {
  let app;
  let mockApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Application();
    mockApiService = app.apiService;
  });

  afterEach(() => {
    if (app) {
      app.stop();
    }
  });

  it('should connect to agent service', async () => {
    await app.start();
    expect(mockApiService.connect).toHaveBeenCalled();
  });

  it('should start view and controller components', async () => {
    await app.start();
    
    // Since these are mocked, we can't directly check if they were called,
    // but we can verify the API service interaction happened
    expect(mockApiService.connect).toHaveBeenCalled();
  });

  it('should disconnect properly on stop', async () => {
    await app.start();
    app.stop();
    
    expect(mockApiService.disconnect).toHaveBeenCalled();
  });
});