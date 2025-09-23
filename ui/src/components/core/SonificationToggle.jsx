import React from 'react';
import PropTypes from 'prop-types';
import {useSettings} from '../../context/useSettings';
import {Volume2, VolumeX} from 'lucide-react';
import './SonificationToggle.css';

function SonificationToggle() {
    const {isSonificationEnabled, toggleSonification} = useSettings();

    return (
        <button
            onClick={toggleSonification}
            title={isSonificationEnabled ? 'Disable Sonification' : 'Enable Sonification'}
            className="icon-button"
            aria-label={isSonificationEnabled ? 'Disable Sonification' : 'Enable Sonification'}
        >
            {isSonificationEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
            {isSonificationEnabled ? 'Sound On' : 'Sound Off'}
        </button>
    );
}

SonificationToggle.propTypes = {};

export default SonificationToggle;