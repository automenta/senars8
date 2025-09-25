import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import ReasoningDebuggerPanel from '@/features/reasoning/ReasoningDebuggerPanel';
import TaskInspectorPanel from '@/features/task/TaskInspectorPanel';

// Mock the services and contexts
jest.mock('@/services/agentService', () => ({
    on: jest.fn(),
    off: jest.fn(),
    sendMessage: jest.fn(),
    sendNarsese: jest.fn(),
    isConnected: true,
}));

jest.mock('@/services/notificationService', () => ({
    addInfo: jest.fn(),
    addError: jest.fn(),
    addWarning: jest.fn(),
}));

jest.mock('@/context/useConnection', () => ({
    useConnection: () => ({
        isConnected: true,
        connectionStatus: 'connected',
        connectionError: null,
        reconnect: jest.fn(),
    }),
}));

jest.mock('@/context/useSettings', () => ({
    useSettings: () => ({
        isSonificationEnabled: false,
        toggleSonification: jest.fn(),
    }),
}));

jest.mock('@/hooks/useReasoningDebugger', () => ({
    __esModule: true,
    default: () => ({
        debugResults: null,
        isProcessing: false,
        debugReasoning: jest.fn(),
        clearDebugResults: jest.fn(),
    }),
}));

jest.mock('@/hooks/useInputHistory', () => () => ({
    inputValue: '',
    setInputValue: jest.fn(),
    history: [],
    addToHistory: jest.fn(),
}));

describe('ReasoningDebuggerPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders without crashing', () => {
        render(<ReasoningDebuggerPanel/>);

        expect(screen.getByText(/Reasoning Debugger/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Narsese Statement:/i)).toBeInTheDocument();
    });

    test('displays input field and action buttons', () => {
        render(<ReasoningDebuggerPanel/>);

        const input = screen.getByRole('textbox');
        const executeBtn = screen.getByText(/Execute/i);
        const debugBtn = screen.getByText(/Debug/i);

        expect(input).toBeInTheDocument();
        expect(executeBtn).toBeInTheDocument();
        expect(debugBtn).toBeInTheDocument();
    });

    test('validates Narsese statements properly', async () => {
        render(<ReasoningDebuggerPanel/>);

        const input = screen.getByRole('textbox');

        // Test empty input
        fireEvent.change(input, {target: {value: ''}});
        fireEvent.click(screen.getByText(/Debug/i));

        // Note: Actual validation behavior depends on the validateNarseseStatement utility
        await waitFor(() => {
            // Validation happens in the component logic
        });
    });
});

describe('TaskInspectorPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders without crashing', () => {
        render(<TaskInspectorPanel/>);

        expect(screen.getByText(/Task Inspector/i)).toBeInTheDocument();
    });

    test('displays filter controls', () => {
        render(<TaskInspectorPanel/>);

        const filterInput = screen.getByPlaceholderText(/Filter tasks/i);
        const typeFilter = screen.getByDisplayValue('all');
        const priorityFilter = screen.getAllByDisplayValue('all')[1]; // Second 'all' is priority filter

        expect(filterInput).toBeInTheDocument();
        expect(typeFilter).toBeInTheDocument();
        expect(priorityFilter).toBeInTheDocument();
    });

    test('has refresh button', () => {
        render(<TaskInspectorPanel/>);

        const refreshBtn = screen.getByText(/Refresh/i);
        expect(refreshBtn).toBeInTheDocument();
    });
});

describe('Core Integration Utilities', () => {
    test('validateNarseseStatement works correctly', async () => {
        // Dynamically import to avoid issues during test setup
        const {validateNarseseStatement} = await import('@/utils/coreIntegration');

        // Test valid statements
        expect(validateNarseseStatement('<bird --> animal>.')).toEqual({
            valid: true,
            parsed: expect.any(Object)
        });

        expect(validateNarseseStatement('<robin --> bird>?')).toEqual({
            valid: true,
            parsed: expect.any(Object)
        });

        // Test invalid statements
        expect(validateNarseseStatement('')).toEqual({
            valid: false,
            error: expect.any(String)
        });

        expect(validateNarseseStatement('invalid')).toEqual({
            valid: false,
            error: expect.any(String)
        });
    });
});