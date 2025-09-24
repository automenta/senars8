import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock component that will throw an error
const ProblematicComponent = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>Working content</div>;
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Working content')).toBeInTheDocument();
    });

    it('catches error and displays fallback UI when child throws error', () => {
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('The component failed to load properly.')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('allows retrying after error', () => {
        const { unmount } = render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Simulate clicking the retry button
        fireEvent.click(screen.getByText('Try Again'));

        // Unmount the component to clear its state
        unmount();

        // Remount with a non-throwing component
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Working content')).toBeInTheDocument();
    });

    it('handles multiple errors gracefully', () => {
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Try Again'));

        // Component should still show error since ProblematicComponent still throws
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('includes action buttons in the error UI', () => {
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        const retryButton = screen.getByText('Try Again').closest('button');
        const reloadButton = screen.getByText('Reload Page').closest('button');

        expect(retryButton).toHaveClass('error-retry-button');
        expect(reloadButton).toHaveClass('error-reload-button');
    });
});