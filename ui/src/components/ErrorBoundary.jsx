import React from 'react';
import PropTypes from 'prop-types';
import {AlertCircle} from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="error-boundary">
                    <div className="error-content">
                        <AlertCircle size={48} className="error-icon" />
                        <h2 className="error-title">Something went wrong</h2>
                        <p className="error-message">The component failed to load properly.</p>
                        {process.env.NODE_ENV === 'development' && (
                            <details className="error-details">
                                <summary>Error details</summary>
                                <pre>
                                    <code>{this.state.error && this.state.error.toString()}</code>
                                </pre>
                                <pre>
                                    <code>{this.state.errorInfo.componentStack}</code>
                                </pre>
                            </details>
                        )}
                        <button 
                            className="error-retry-button"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired
};

export default ErrorBoundary;