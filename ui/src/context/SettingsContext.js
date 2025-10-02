import {createContext, useContext} from 'react';

export const SettingsContext = createContext(null);

export const useSettings = () => {
    return useContext(SettingsContext);
};