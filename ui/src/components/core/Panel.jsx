import React from 'react';
import PropTypes from 'prop-types';
import './Panel.css';

function Panel({title = null, children, className = ''}) {
    return (
        <div className={`panel ${className}`}>
            {title && <h2 className="panel-title">{title}</h2>}
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
}

Panel.propTypes = {
    title: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Panel;
