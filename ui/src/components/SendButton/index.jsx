import React from 'react';
import PropTypes from 'prop-types';
import {Loader, Send} from 'lucide-react';
import './style.css';

const SendButton = ({onClick, disabled}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={disabled ? "Input disabled" : "Send"}
        className={`send-button ${disabled ? 'disabled' : ''}`}
        aria-label="Send input"
    >
        {disabled ? <Loader size={16} className="sending-spinner"/> : <Send size={16}/>} Send
    </button>
);

SendButton.displayName = 'SendButton';

SendButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

export default SendButton;