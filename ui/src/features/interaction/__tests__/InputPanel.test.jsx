import React from 'react';
import {render, screen} from '@testing-library/react';
import {ConnectionProvider} from '@/context/ConnectionProvider';
import {SettingsProvider} from '@/context/SettingsProvider';
import InputPanel from '@/features/interaction/InputPanel';

// Mock agent service
jest.mock('@/services/agentService', () => ({
    __esModule: true,
    default: {
        on: jest.fn(),
        off: jest.fn(),
        sendNarsese: jest.fn(() => true),
        sendNaturalLanguage: jest.fn(() => true),
        sendMessage: jest.fn(),
        isConnected: true,
    }
}));

// Mock notification service
jest.mock('@/services/notificationService', () => ({
    __esModule: true,
    default: {
        addNotification: jest.fn(),
        addSuccess: jest.fn(),
        addWarning: jest.fn(),
        addInfo: jest.fn(),
        addError: jest.fn(),
        removeNotification: jest.fn(),
        clearAll: jest.fn(),
        getNotifications: jest.fn(() => []),
        on: jest.fn(),
        off: jest.fn(),
    }
}));

// Mock useInputHistory hook
jest.mock('@/hooks/useInputHistory', () => ({
    __esModule: true,
    default: () => ({
        inputValue: '',
        setInputValue: jest.fn(),
        history: [],
        addToHistory: jest.fn(),
    })
}));

// Mock useSettings hook
jest.mock('@/context/SettingsProvider', () => ({
    ...jest.requireActual('@/context/SettingsProvider'),
    useSettings: () => ({
        isSonificationEnabled: false,
    }),
}));

describe('InputPanel', () => {
    const renderWithProviders = (ui) => {
        return render(
            <SettingsProvider>
                <ConnectionProvider>
                    {ui}
                </ConnectionProvider>
            </SettingsProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with initial state', () => {
        renderWithProviders(<InputPanel/>);

        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /send/i})).toBeInTheDocument();
    });
});