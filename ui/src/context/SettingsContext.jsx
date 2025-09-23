import React, {createContext, useContext, useMemo, useState} from 'react';

export const SettingsContext = createContext();

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

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
