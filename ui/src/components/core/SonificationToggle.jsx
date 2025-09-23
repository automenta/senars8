import React from 'react';
import {useSettings} from '../../context/SettingsContext';
import {Volume2, VolumeX} from 'lucide-react';

function SonificationToggle() {
    const {isSonificationEnabled, toggleSonification} = useSettings();

    return (
        <button
            onClick={toggleSonification}
            title={isSonificationEnabled ? 'Disable Sonification' : 'Enable Sonification'}
            className="icon-button"
        >
            {isSonificationEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}
        </button>
    );
}

export default SonificationToggle;
