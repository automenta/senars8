import React, {createContext, useMemo, useState} from 'react';

export const SettingsContext = createContext(null);

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