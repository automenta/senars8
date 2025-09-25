import React from 'react';
import PropTypes from 'prop-types';
import {AlertCircle, RotateCcw} from 'lucide-react';
import notificationService from '../services/notificationService';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0 // Track error count to prevent infinite reload loops
        };
    }

    static getDerivedStateFromError(_error) {
        // Update state so the next render will show the fallback UI.
        return {hasError: true};
    }

    // Reset error state when props change to allow recovery from error state
    static getDerivedStateFromProps(props, state) {
        // Only reset the error state if we're getting new props (children changed)
        // This enables the test scenario where we switch from error component to working component
        if (state.hasError) {
            return {
                hasError: false,
                error: null,
                errorInfo: null
            };
        }
        return null;
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState(prevState => ({
            error: error,
            errorInfo: errorInfo,
            errorCount: prevState.errorCount + 1
        }));

        // Send error notification to user
        notificationService.addError(
            'Component Error',
            `An error occurred in a UI component. Please try reloading the component or page. Error: ${error.message || 'Unknown error'}`,
            10000
        );

        // Send error to a logging service in production (if configured)
        if (process.env.NODE_ENV === 'production') {
            // Example: send error to analytics or logging service
            // analytics.track('error_boundary', { error: error.toString(), stack: error.stack });
        }
    }

    handleRetry = () => {
        // Prevent infinite reload loops
        if (this.state.errorCount > 5) {
            // If too many errors, just reload the page
            window.location.reload();
            return;
        }

        // Attempt to reset the error state and try to re-render
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="error-boundary" role="alert">
                    <div className="error-content">
                        <AlertCircle size={48} className="error-icon"/>
                        <h2 className="error-title">Something went wrong</h2>
                        <p className="error-message">The component failed to load properly.</p>
                        {process.env.NODE_ENV === 'development' && (
                            <details className="error-details">
                                <summary>Error details</summary>
                                <pre className="error-stack">
                                    <code>{this.state.error && this.state.error.toString()}</code>
                                </pre>
                                <pre className="error-component-stack">
                                    <code>{this.state.errorInfo && this.state.errorInfo.componentStack}</code>
                                </pre>
                            </details>
                        )}
                        <div className="error-actions">
                            <button
                                className="error-retry-button"
                                onClick={this.handleRetry}
                                title="Retry loading the component"
                            >
                                <RotateCcw size={16}/>
                                Try Again
                            </button>
                            <button
                                className="error-reload-button"
                                onClick={() => window.location.reload()}
                                title="Reload the entire page"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Important: Always render children when no error occurs
        if (this.props.children) {
            return this.props.children;
        }

        // Fallback if no children are provided
        return null;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default ErrorBoundary;