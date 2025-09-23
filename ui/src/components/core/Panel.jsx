import React from 'react';
import './Panel.css';

function Panel({title, children, className = ''}) {
    return (
        <div className={`panel ${className}`}>
            {title && <h2 className="panel-title">{title}</h2>}
            <div className="panel-content">
                {children}
            </div>
        </div>
    );
}

export default Panel;
