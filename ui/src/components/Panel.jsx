import React from 'react';
import PropTypes from 'prop-types';
import './Panel.css';

// Helper function to extract text from a React node for the aria-label
const extractTextFromNode = (node) => {
    if (typeof node === 'string') {
        return node;
    }
    if (Array.isArray(node)) {
        return node.map(extractTextFromNode).join('');
    }
    if (React.isValidElement(node) && node.props.children) {
        return React.Children.toArray(node.props.children).map(extractTextFromNode).join('');
    }
    return '';
};

const Panel = ({header, children, className = ''}) => {
    // Use the helper to generate a string for the aria-label
    const ariaLabel = extractTextFromNode(header).trim() || 'Panel';

    return (
        <section className={`panel ${className}`} role="region" aria-label={ariaLabel}>
            {header && (
                <header className="panel-header" role="presentation">
                    <h2 className="panel-title">{header}</h2>
                </header>
            )}
            <div className="panel-content" tabIndex="0">
                {children}
            </div>
        </section>
    );
};


Panel.displayName = 'Panel';

Panel.propTypes = {
    header: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Panel;