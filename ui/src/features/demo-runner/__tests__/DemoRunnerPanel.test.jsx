import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import DemoRunnerPanel from '../DemoRunnerPanel';
import agentService from '@/services/agentService';
import demos from '@/generated/demos.json';

// Mock the agentService
vi.mock('@/services/agentService', () => ({
    default: {
        on: vi.fn(),
        off: vi.fn(),
        sendMessage: vi.fn(),
    },
}));

// Mock the generated demos.json
vi.mock('@/generated/demos.json', () => ({
    default: [
        { id: 'demo-1', name: 'Demo One', path: 'tests/demos/demo-one.js' },
        { id: 'demo-2', name: 'Demo Two', path: 'tests/demos/demo-two.js' },
    ]
}));

describe('DemoRunnerPanel', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the list of demos', () => {
        const { getByText } = render(<DemoRunnerPanel />);
        expect(getByText('Demo One')).toBeInTheDocument();
        expect(getByText('Demo Two')).toBeInTheDocument();
    });

    it('runs a demo when a button is clicked', async () => {
        const { getByText } = render(<DemoRunnerPanel />);
        const demoButton = getByText('Demo One');

        fireEvent.click(demoButton);

        expect(agentService.sendMessage).toHaveBeenCalledWith('runDemo', {
            path: 'tests/demos/demo-one.js',
        });

        // Check that the UI updates to a "running" state
        await waitFor(() => {
            expect(getByText('Output')).toBeInTheDocument();
        });
    });

    it('displays output from the agentService', async () => {
        let demoOutputCallback;
        agentService.on.mockImplementation((event, callback) => {
            if (event === 'demo-output') {
                demoOutputCallback = callback;
            }
        });

        const { getByText } = render(<DemoRunnerPanel />);

        // Simulate receiving output
        act(() => {
            demoOutputCallback({ data: 'Hello from the demo!' });
        });

        await waitFor(() => {
            expect(getByText(/Hello from the demo!/)).toBeInTheDocument();
        });
    });
});