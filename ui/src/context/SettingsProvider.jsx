import React, {useMemo, useState} from 'react';
import {SettingsContext} from './SettingsContext';

export function SettingsProvider({children}) {
    const [isSonificationEnabled, setIsSonificationEnabled] = useState(false);

    const toggleSonification = () => {
        setIsSonificationEnabled(prev => !prev);
    };

    const value = useMemo(() => ({
        isSonificationEnabled,
        toggleSonification,
    }), [isSonificationEnabled]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}