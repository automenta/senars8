import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import './style.css';

const Tooltip = ({children, content, position = 'top', delay = 500}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const timeoutRef = useRef(null);
    const triggerRef = useRef(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            setIsMounted(true);
        }, delay);
    };

    const hideTooltip = () => {
        clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const tooltipPosition = () => {
        if (!triggerRef.current) return {};

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipStyles = {};

        switch (position) {
            case 'top':
                tooltipStyles.bottom = `${triggerRect.height + 5}px`;
                tooltipStyles.left = '50%';
                tooltipStyles.transform = 'translateX(-50%)';
                break;
            case 'bottom':
                tooltipStyles.top = `${triggerRect.height + 5}px`;
                tooltipStyles.left = '50%';
                tooltipStyles.transform = 'translateX(-50%)';
                break;
            case 'left':
                tooltipStyles.top = '50%';
                tooltipStyles.right = `${triggerRect.width + 5}px`;
                tooltipStyles.transform = 'translateY(-50%)';
                break;
            case 'right':
                tooltipStyles.top = '50%';
                tooltipStyles.left = `${triggerRect.width + 5}px`;
                tooltipStyles.transform = 'translateY(-50%)';
                break;
            default:
                tooltipStyles.bottom = `${triggerRect.height + 5}px`;
                tooltipStyles.left = '50%';
                tooltipStyles.transform = 'translateX(-50%)';
        }

        return tooltipStyles;
    };

    return (
        <div
            className="tooltip-wrapper"
            ref={triggerRef}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            tabIndex="0"
            aria-describedby={isVisible ? "tooltip-content" : undefined}
        >
            {children}
            {isMounted && (
                <div
                    className={`tooltip ${isVisible ? 'tooltip-visible' : 'tooltip-hidden'} tooltip-${position}`}
                    style={tooltipPosition()}
                    role="tooltip"
                    id="tooltip-content"
                >
                    {content}
                </div>
            )}
        </div>
    );
};

Tooltip.propTypes = {
    children: PropTypes.node.isRequired,
    content: PropTypes.node.isRequired,
    position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
    delay: PropTypes.number
};

export default Tooltip;