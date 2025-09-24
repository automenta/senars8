import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that will throw an error
const ErrorComponent = () => {
    throw new Error('Test error');
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Suppress console.error during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error after tests
        jest.restoreAllMocks();
    });

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <div>Child content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('catches error and displays fallback UI when child throws error', () => {
        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        // Check if error message is displayed
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('The component failed to load properly.')).toBeInTheDocument();
        
        // Check if the retry button exists
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        
        // Check if the reload button exists
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('allows retrying after error', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        // Initially should show error
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Simulate successful retry by rendering a working component
        rerender(
            <ErrorBoundary>
                <div>Working content</div>
            </ErrorBoundary>
        );

        // Should now show the working content
        expect(screen.getByText('Working content')).toBeInTheDocument();
    });

    it('handles multiple errors gracefully', () => {
        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        // Check error is displayed
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Click the retry button
        fireEvent.click(screen.getByText('Try Again'));

        // Component should still show error since ErrorComponent always throws
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('includes action buttons in the error UI', () => {
        render(
            <ErrorBoundary>
                <ErrorComponent />
            </ErrorBoundary>
        );

        // Check that both buttons are present
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Reload Page')).toBeInTheDocument();

        // Check that buttons have proper classes
        const retryButton = screen.getByText('Try Again').closest('button');
        const reloadButton = screen.getByText('Reload Page').closest('button');
        
        expect(retryButton).toHaveClass('error-retry-button');
        expect(reloadButton).toHaveClass('error-reload-button');
    });
});