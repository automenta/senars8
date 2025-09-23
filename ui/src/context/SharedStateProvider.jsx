import React, {createContext, useEffect, useState} from 'react';
import agentService from '../services/agentService';

export const SharedStateContext = createContext(null);

// Helper to get a random user color
const usercolors = [
    '#30bced', '#6eeb83', '#ffbc42', '#ecd444', '#ee6352', '#9ac2c9', '#8acb88', '#1be7ff'
];
const randomColor = () => usercolors[Math.floor(Math.random() * usercolors.length)];

export function SharedStateProvider({children}) {
    const [awareness, setAwareness] = useState(null);

    useEffect(() => {
        if (agentService.awareness) {
            setAwareness(agentService.awareness);

            // Set some initial awareness state for the local user
            agentService.awareness.setLocalStateField('user', {
                name: 'User ' + Math.floor(Math.random() * 100),
                color: randomColor(),
            });
        }
    }, []);

    const value = {
        yDoc: agentService.yDoc,
        awareness: awareness,
    };

    return (
        <SharedStateContext.Provider value={value}>
            {children}
        </SharedStateContext.Provider>
    );
}
