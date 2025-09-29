import React from 'react';

const LucideIcon = (props) => <div {...props} />;

const lucideIcons = new Proxy({}, {
    get: (target, prop) => {
        if (prop === '__esModule') {
            return true;
        }
        return LucideIcon;
    }
});

module.exports = lucideIcons;
