import React from 'react';
import PropTypes from 'prop-types';
import './Panel.css';

const Panel = ({ header, children, className = '' }) => (
    <section className={`panel ${className}`} role="region" aria-label={header ? "Panel" : undefined}>
        {header && <header className="panel-header" role="presentation">{header}</header>}
        <div className="panel-content">
            {children}
        </div>
    </section>
);

Panel.displayName = 'Panel';

Panel.propTypes = {
    header: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Panel;
