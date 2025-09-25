import React, {useMemo, useState} from 'react';
import {SettingsContext} from './SettingsContext';

export function SettingsProvider({children}) {
    const [isSonificationEnabled, setIsSonificationEnabled] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [fontSize, setFontSize] = useState('medium');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(5000);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [autoConnect, setAutoConnect] = useState(true);

    const toggleSonification = () => {
        setIsSonificationEnabled(prev => !prev);
    };

    const value = useMemo(() => ({
        isSonificationEnabled,
        toggleSonification,
        theme,
        setTheme,
        fontSize,
        setFontSize,
        autoRefresh,
        setAutoRefresh,
        refreshInterval,
        setRefreshInterval,
        notificationsEnabled,
        setNotificationsEnabled,
        autoConnect,
        setAutoConnect,
    }), [
        isSonificationEnabled,
        theme,
        fontSize,
        autoRefresh,
        refreshInterval,
        notificationsEnabled,
        autoConnect
    ]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}