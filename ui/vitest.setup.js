import '@testing-library/jest-dom';
import {vi} from 'vitest';

// Mock console.error to reduce noise during tests
vi.spyOn(console, 'error').mockImplementation(() => {
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Minimal mocks for UI components - just make them render without error
vi.mock('react-ace', () => ({
    default: ({value, onChange, name}) => {
        // Minimal return to satisfy React rendering
        return null;
    }
}));

vi.mock('@pablo-lion/xterm-react', () => ({
    XTerm: () => null
}));

vi.mock('flexlayout-react', () => ({
    Layout: () => null,
    Model: {
        fromJson: vi.fn(() => ({
            visitNodes: vi.fn(),
            getId: vi.fn(),
            getType: vi.fn(() => 'tab')
        }))
    }
}));

vi.mock('react-force-graph-2d', () => ({
    default: () => null
}));

vi.mock('re-resizable', () => ({
    Resizable: ({children}) => children
}));

vi.mock('react-xtermjs', () => ({
    ReactTerminal: () => null
}));

// Mock the notification service globally since it's used by StatusBar component
// which is imported by App and needs to return an array to prevent filter error
vi.mock('@/services/notificationService', () => ({
    __esModule: true,
    default: {
        addSuccess: vi.fn(),
        addInfo: vi.fn(),
        addError: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        getNotifications: vi.fn(() => []), // Return empty array to fix StatusBar issue
        removeNotification: vi.fn(),
    }
}));

vi.mock('@/hooks/useSystemCycle', () => ({__esModule: true, default: () => 0}));
vi.mock('@/hooks/useSystemStats', () => ({__esModule: true, default: () => ({})}));
vi.mock('@/hooks/useLayoutModel', () => ({
    __esModule: true,
    default: () => ({model: {visitNodes: vi.fn()}, onModelChange: vi.fn()})
}));

// Mock problematic components to render nothing or minimal output
vi.mock('@/features/reasoning/VisualReasoningPanel', () => ({default: () => null}));
vi.mock('@/features/reasoning/ConceptMap', () => ({default: () => null}));

vi.mock('@/context/useConnection', () => ({
    useConnection: vi.fn(() => ({
        isConnected: false,
        connectionStatus: 'disconnected',
        connectionError: null,
        reconnect: vi.fn(),
        sendMessage: vi.fn(),
        lastMessage: null,
        connectionStats: null,
        messageHistory: []
    }))
}));

vi.mock('@/context/SharedStateProvider', () => ({
    SharedStateProvider: ({children}) => children,
}));

vi.mock('@/context/useSettings', () => {
    const mockSettings = {
        isSonificationEnabled: false,
        theme: 'light',
        fontSize: 'medium',
        toggleSonification: vi.fn(),
        setTheme: vi.fn(),
        setFontSize: vi.fn(),
        autoRefresh: true,
        setAutoRefresh: vi.fn(),
        refreshInterval: 5000,
        setRefreshInterval: vi.fn(),
        notificationsEnabled: true,
        setNotificationsEnabled: vi.fn(),
        autoConnect: true,
        setAutoConnect: vi.fn(),
    };

    return {
        useSettings: vi.fn(() => mockSettings),
        __esModule: true
    };
});

vi.mock('@/hooks/useUIErrorHandler', () => ({
    useUIErrorHandler: vi.fn(() => ({
        handleError: vi.fn(),
        safeExecute: vi.fn((fn) => fn())
    }))
}));

vi.mock('@/hooks/useInputHistory', () => ({
    useInputHistory: vi.fn(() => ({
        inputValue: '',
        setInputValue: vi.fn(),
        history: [],
        addToHistory: vi.fn()
    }))
}));

vi.mock('@/services/agentService', () => ({
    __esModule: true,
    default: {
        on: vi.fn(),
        off: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        send: vi.fn(),
        sendNarsese: vi.fn(),
        sendNaturalLanguage: vi.fn(),
        isConnected: false,
        isAgentRunning: vi.fn(() => false),
        yDoc: {},
        getAgentState: vi.fn(() => ({})),
        getBeliefsCount: vi.fn(() => 0),
        getGoalsCount: vi.fn(() => 0)
    }
}));

vi.mock('@/services/agentIntegration', () => {
    const mockAgentIntegration = {
        initialize: vi.fn(),
        processNarsese: vi.fn(),
        getAgentInfo: vi.fn(() => ({})),
        sendAgentCommand: vi.fn(),
        getAllTasks: vi.fn(() => []),
        getInitializedStatus: vi.fn(() => false),
        getConfiguration: vi.fn(() => ({})),
        getAgentState: vi.fn(() => ({})),
        isAgentRunning: vi.fn(() => false),
        sendAgentControl: vi.fn(),
        getBeliefsCount: vi.fn(() => 0),
        getGoalsCount: vi.fn(() => 0)
    };

    return {
        __esModule: true,
        default: mockAgentIntegration,
        // Also export individual functions for named imports
        ...mockAgentIntegration
    };
});

// Replace jest with vi for all test environments
global.jest = vi;

// Add mock for jest.requireMock which is sometimes used in tests
global.jest.requireMock = vi.importMock;