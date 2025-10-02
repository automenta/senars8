import {vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';
import {ConnectionProvider} from '@/context/ConnectionProvider';
import {SettingsProvider} from '@/context/SettingsProvider';
import InputPanel from '@/features/interaction/InputPanel';

// Mock agent service
vi.mock('@/services/agentService', () => ({
    __esModule: true,
    default: {
        on: vi.fn(),
        off: vi.fn(),
        sendNarsese: vi.fn(() => true),
        sendNaturalLanguage: vi.fn(() => true),
        sendMessage: vi.fn(),
        isConnected: true,
    }
}));

// Mock notification service
vi.mock('@/services/notificationService', () => ({
    __esModule: true,
    default: {
        addNotification: vi.fn(),
        addSuccess: vi.fn(),
        addWarning: vi.fn(),
        addInfo: vi.fn(),
        addError: vi.fn(),
        removeNotification: vi.fn(),
        clearAll: vi.fn(),
        getNotifications: vi.fn(() => []),
        on: vi.fn(),
        off: vi.fn(),
    }
}));

// Mock useInputHistory hook
vi.mock('@/hooks/useInputHistory', () => ({
    __esModule: true,
    default: () => ({
        inputValue: '',
        setInputValue: vi.fn(),
        history: [],
        addToHistory: vi.fn(),
    })
}));

// Mock useSettings hook
vi.mock('@/context/SettingsProvider', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useSettings: () => ({
            isSonificationEnabled: false,
        }),
    };
});

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
        vi.clearAllMocks();
    });

    it('renders correctly with initial state', () => {
        renderWithProviders(<InputPanel/>);

        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /send/i})).toBeInTheDocument();
    });
});