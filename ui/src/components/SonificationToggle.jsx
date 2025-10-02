import React from 'react';
import {useSettings} from '@/context/useSettings';
import {Volume2, VolumeX} from 'lucide-react';
import './SonificationToggle.css';

const SonificationToggle = () => {
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
};

SonificationToggle.displayName = 'SonificationToggle';

SonificationToggle.propTypes = {};

export default SonificationToggle;