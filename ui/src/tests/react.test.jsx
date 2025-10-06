import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {vi, describe, it, expect, beforeEach} from 'vitest';
import App from '../App';
import {ThemeProvider} from '../context/ThemeProvider';
import {AgentProvider} from '../context/AgentProvider';
import {NotificationProvider} from '../context/NotificationContext';
import {SearchProvider} from '../context/SearchContext';
import agentService from '../services/agentService';

// Mock agent service with proper alias support
vi.mock('@/services/agentService', () => {
  // Create a singleton instance that both AgentProvider and SearchContext can use
  const mockInstance = {
    _events: {},
    isConnected: false,
    yDoc: new (class YDoc {})(),
    yProvider: null,
    awareness: null,

    on(event, callback) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(callback);
      return this;
    },

    off(event, callback) {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      }
      return this;
    },

    emit(event, data) {
      if (this._events[event]) {
        this._events[event].forEach(callback => callback(data));
      }
      return this;
    },

    connect() {
      return this;
    },

    disconnect() {
      return this;
    },

    sendMessage() {
      return true;
    },

    sendNarsese() {
      return true;
    },

    sendNaturalLanguage() {
      return true;
    },

    sendAgentControl() {
      return true;
    },

    search() {
      return true;
    },

    isAgentRunning() {
      return false;
    },

    getAgentState() {
      return {};
    }
  };

  // Create a constructor function that returns the mock instance
  const MockAgentService = vi.fn(function(wsUrl) {
    return mockInstance;
  });

  // Copy all the methods to the constructor as spies
  Object.assign(MockAgentService, mockInstance);

  // Ensure connect is properly spied
  MockAgentService.connect = vi.fn(function() {
    return mockInstance;
  });

  return {
    __esModule: true,
    default: MockAgentService,
  };
});

// Mock the useLayoutModel hook with proper alias support
vi.mock('@/hooks/useLayoutModel', () => ({
  default: () => ({
    model: {
      visitNodes: vi.fn(),
      getId: vi.fn(() => 'root'),
      getType: vi.fn(() => 'tab'),
      getWeight: vi.fn(() => 100),
      getActiveTab: vi.fn(() => null),
      doAction: vi.fn(),
    },
    onModelChange: vi.fn(),
  })
}));

// Mock useAppInit hook with proper alias support
vi.mock('@/hooks/useAppInit', () => ({
  default: vi.fn(),
}));

// Mock panelRegistry with proper alias support
vi.mock('@/features/panelRegistry', () => ({
  default: {},
}));

// Mock UI components with proper alias support
vi.mock('@ui/components', () => ({
  ErrorBoundary: ({children}) => <div data-testid="error-boundary">{children}</div>,
  Header: () => <header data-testid="header">Header</header>,
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>,
}));

// Mock flexlayout-react Layout component
vi.mock('flexlayout-react', () => ({
  Layout: ({children, ...props}) => <div data-testid="layout" {...props}>{children}</div>,
}));

// Mock CSS imports
vi.mock('../App.css', () => ({}));
vi.mock('flexlayout-react/style/light.css', () => ({}));

// Mock constants with proper alias support
vi.mock('@/constants/ui', () => ({
  MESSAGE_TYPES: {
    SEARCH_RESULTS: 'search_results',
    SEARCH_ERROR: 'search_error',
  },
}));

// Mock window.matchMedia since it's not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('App Component Integration Tests', () => {
  const renderApp = () => {
    return render(
      <ThemeProvider>
        <AgentProvider>
          <NotificationProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </NotificationProvider>
        </AgentProvider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and displays main app structure', () => {
    expect(() => renderApp()).not.toThrow();

    // Check that main app elements are present
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();

    // Check that the app container is present with correct attributes
    const appContainer = document.querySelector('.app-container');
    expect(appContainer).toBeInTheDocument();
    expect(appContainer).toHaveAttribute('data-theme');
  });

  it('renders all provider layers correctly', () => {
    renderApp();

    // Verify that the app renders with all the expected structure
    // This tests that all providers are working together correctly
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });
});

// Additional tests for provider hierarchy
describe('React Context Provider Hierarchy', () => {
  it('provides all required contexts to child components', () => {
    // This test ensures the provider order is correct to prevent context errors
    expect(() => render(
      <ThemeProvider>
        <AgentProvider>
          <NotificationProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </NotificationProvider>
        </AgentProvider>
      </ThemeProvider>
    )).not.toThrow();
  });
});