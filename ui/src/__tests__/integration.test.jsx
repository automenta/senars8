import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {ThemeProvider} from '@/context/ThemeProvider';
import {SettingsProvider} from '@/context/SettingsProvider';
import {ConnectionProvider} from '@/context/ConnectionProvider';
import {SharedStateProvider} from '@/context/SharedStateProvider';
import {NotificationProvider} from '@/context/NotificationContext';
import {SearchProvider} from '@/context/SearchContext';
import {TaskProvider} from '@/context/TaskContext';
import {SessionProvider} from '@/context/SessionContext';
import {Model} from 'flexlayout-react';
import defaultLayout from '@/features/defaultLayout';

// Mock all services
jest.mock('@/services/agentService', () => ({
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(function (message) {
        if (typeof message === 'object' && message.content) {
            // This logic is a simplified version of what might happen in the real service
            if (message.content.startsWith('<') && message.content.includes('-->')) {
                return this.sendNarsese(message.content);
            } else {
                return this.sendNaturalLanguage(message.content);
            }
        }
        return false;
    }),
    sendNarsese: jest.fn(),
    sendNaturalLanguage: jest.fn(),
    isConnected: true,
    isAgentRunning: jest.fn().mockReturnValue(true),
}));

jest.mock('@/services/agentIntegration', () => ({
    initialize: jest.fn().mockResolvedValue(),
    processNarsese: jest.fn(),
    getAgentInfo: jest.fn(),
    sendAgentCommand: jest.fn(),
    getAllTasks: jest.fn().mockResolvedValue([]),
    getInitializedStatus: jest.fn().mockReturnValue(true),
    getConfiguration: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/services/notificationService');

jest.mock('@/hooks/useSystemCycle', () => jest.fn(() => 100));
jest.mock('@/hooks/useSystemStats', () => jest.fn(() => ({
    beliefs: 5,
    goals: 2,
    questions: 1,
    memory: 1024,
})));

const mockModel = Model.fromJson(defaultLayout);
jest.mock('@/hooks/useLayoutModel', () => ({
    __esModule: true,
    default: () => ({
        model: mockModel,
        onModelChange: jest.fn(),
    }),
}));

// Mock child components that are not essential for this integration test
jest.mock('@/features/reasoning/VisualReasoningPanel', () => () => <div data-testid="mock-visual-reasoning-panel"/>);
jest.mock('@/features/reasoning/ConceptMap', () => () => <div data-testid="mock-concept-map"/>);
jest.mock('react-force-graph-2d', () => () => <div data-testid="mock-force-graph"/>);
jest.mock('react-xtermjs', () => ({XTerm: () => null}));
jest.mock('flexlayout-react', () => {
    const original = jest.requireActual('flexlayout-react');
    const React = require('react');
    return {
        ...original,
        Layout: ({factory, model}) => {
            const components = [];
            model.visitNodes((node) => {
                if (node.getType() === 'tab') {
                    const element = factory(node);
                    components.push(React.cloneElement(element, {key: node.getId()}));
                }
            });
            return <div data-testid="mock-layout">{components}</div>;
        },
    };
});

// Helper function to render with all providers
const renderWithProviders = (ui, options) => {
    const AllTheProviders = ({children}) => (
        <ThemeProvider>
            <SettingsProvider>
                <ConnectionProvider>
                    <SharedStateProvider>
                        <NotificationProvider>
                            <SearchProvider>
                                <TaskProvider>
                                    <SessionProvider>{children}</SessionProvider>
                                </TaskProvider>
                            </SearchProvider>
                        </NotificationProvider>
                    </SharedStateProvider>
                </ConnectionProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
    return render(ui, {wrapper: AllTheProviders, ...options});
};

describe('UI-Agent-Core Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Status Panel Integration', () => {
        test('displays agent information correctly', async () => {
            renderWithProviders(<App/>);
            await waitFor(() => {
                const cycleCard = screen.getByText(/Cycles/).closest('.status-card');
                expect(within(cycleCard).getByText('100')).toBeInTheDocument();

                const beliefsCard = screen.getByText(/Beliefs/).closest('.status-card');
                expect(within(beliefsCard).getByText('5')).toBeInTheDocument();

                const goalsCard = screen.getByText(/Goals/).closest('.status-card');
                expect(within(goalsCard).getByText('2')).toBeInTheDocument();

                const questionsCard = screen.getByText(/Questions/).closest('.status-card');
                expect(within(questionsCard).getByText('1')).toBeInTheDocument();
            });
        });
    });

    describe('Input Panel Integration', () => {
        test('sends narsese statement to agent', async () => {
            agentService.sendNarsese.mockResolvedValue(true);
            renderWithProviders(<App/>);

            const input = screen.getByLabelText('Narsese input');
            await userEvent.type(input, '<bird --> animal>.');

            const sendButton = screen.getByRole('button', {name: /Send/i});
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(agentService.sendNarsese).toHaveBeenCalledWith('<bird --> animal>.');
                expect(notificationService.addSuccess).toHaveBeenCalledWith(
                    'Narsese Sent',
                    'Statement: <bird --> animal>.',
                    3000
                );
            });
        });

        test('sends natural language to agent', async () => {
            agentService.sendNaturalLanguage.mockResolvedValue(true);
            renderWithProviders(<App/>);

            const input = screen.getByLabelText('Narsese input');
            await userEvent.type(input, 'Tell me about birds');

            const sendButton = screen.getByRole('button', {name: /Send/i});
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(agentService.sendNaturalLanguage).toHaveBeenCalledWith('Tell me about birds');
                expect(notificationService.addInfo).toHaveBeenCalledWith(
                    'NL Sent',
                    'Input: Tell me about birds',
                    3000
                );
            });
        });
    });

    describe('Error Handling Integration', () => {
        test('handles agent service errors gracefully', async () => {
            agentService.sendNarsese.mockResolvedValue(false); // Simulate a failed send
            renderWithProviders(<App/>);

            const input = screen.getByLabelText('Narsese input');
            await userEvent.type(input, '<bird --> animal>.');

            const sendButton = screen.getByRole('button', {name: /Send/i});
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(notificationService.addError).toHaveBeenCalledWith(
                    'Send Error',
                    'Failed to send message to agent'
                );
            });
        });
    });
});