import React from 'react';
import PropTypes from 'prop-types';
import './Panel.css';

/**
 * A reusable Panel component.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} [props.header] - The panel's header content.
 * @param {React.ReactNode} props.children - The panel's main content.
 * @param {string} [props.className] - An optional CSS class for the panel.
 * @returns {React.ReactElement} The rendered panel.
 */
function Panel({ header, children, className = '' }) {
    return (
        <section className={`panel ${className}`} role="region" aria-label={header ? "Panel" : undefined}>
            {header && <header className="panel-header" role="presentation">{header}</header>}
            <div className="panel-content">
                {children}
            </div>
        </section>
    );
}

Panel.propTypes = {
    header: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Panel;
