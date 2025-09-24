import React from 'react';
import PropTypes from 'prop-types';
import {Send} from 'lucide-react';
import './SendButton.css';

const SendButton = ({onClick, disabled}) => (
    <button 
        onClick={onClick} 
        disabled={disabled} 
        title="Send" 
        className="send-button"
        aria-label="Send input"
    >
        <Send size={16}/> Send
    </button>
);

SendButton.displayName = 'SendButton';

SendButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

SendButton.defaultProps = {
    disabled: false,
};

export default SendButton;