import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Sidebar from '../Sidebar';
import { categorizedPanels } from '@/features/panelRegistry';

// Mock the panel registry to have a predictable structure for tests
vi.mock('@/features/panelRegistry', () => ({
    categorizedPanels: {
        'Test Category 1': {
            'panel-1': { name: 'Test Panel 1', component: () => <div>Panel 1</div> },
        },
        'Test Category 2': {
            'panel-2': { name: 'Test Panel 2', component: () => <div>Panel 2</div> },
        },
    },
}));

describe('Sidebar', () => {
    it('renders categories and panels correctly', () => {
        const { getByText } = render(<Sidebar />);

        // Check for category titles
        expect(getByText('Test Category 1')).toBeInTheDocument();
        expect(getByText('Test Category 2')).toBeInTheDocument();

        // Check for panel buttons
        expect(getByText('Test Panel 1')).toBeInTheDocument();
        expect(getByText('Test Panel 2')).toBeInTheDocument();
    });

    it('calls addPanel when a panel button is clicked', () => {
        const mockModel = {
            doAction: vi.fn(),
        };
        const mockOnModelChange = vi.fn();

        const { getByText } = render(<Sidebar model={mockModel} onModelChange={mockOnModelChange} />);

        const panelButton = getByText('Test Panel 1');
        fireEvent.click(panelButton);

        expect(mockModel.doAction).toHaveBeenCalled();
        expect(mockOnModelChange).toHaveBeenCalled();
    });
});