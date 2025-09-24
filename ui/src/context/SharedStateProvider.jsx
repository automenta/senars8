import React, {useEffect, useState, useCallback} from 'react';
import agentService from '../services/agentService';
import {SharedStateContext} from './SharedStateContext';

// Helper to get a random user color
const usercolors = [
    '#30bced', '#6eeb83', '#ffbc42', '#ecd444', '#ee6352', '#9ac2c9', '#8acb88', '#1be7ff'
];
const randomColor = () => usercolors[Math.floor(Math.random() * usercolors.length)];

export function SharedStateProvider({children}) {
    const [awareness, setAwareness] = useState(null);
    const [sharedState, setSharedStateInternal] = useState({
        editorContent: '// Start coding here...',
        currentOpenFile: null,
    });

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

    const setSharedState = useCallback((updater) => {
        setSharedStateInternal(prevState => {
            const newState = typeof updater === 'function' ? updater(prevState) : updater;
            return { ...prevState, ...newState };
        });
    }, []);

    const value = {
        yDoc: agentService.yDoc,
        awareness: awareness,
        sharedState,
        setSharedState,
    };

    return (
        <SharedStateContext.Provider value={value}>
            {children}
        </SharedStateContext.Provider>
    );
}