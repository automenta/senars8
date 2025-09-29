import React, {useCallback, useEffect, useState} from 'react';
import agentService from '../services/agentService';
import {SharedStateContext} from './SharedStateContext';

// Helper to get a random user color
const usercolors = [
    '#30bced', '#6eeb83', '#ffbc44', '#ecd444', '#ee6352', '#9ac2c9', '#8acb88', '#1be7ff'
];
const randomColor = () => usercolors[Math.floor(Math.random() * usercolors.length)];

export function SharedStateProvider({children}) {
    const [awareness, setAwareness] = useState(null);
    const [sharedState, setSharedStateInternal] = useState({
        editorContent: '// Start coding here...',
        currentOpenFile: null,
    });

    useEffect(() => {
        const handleAwarenessUpdate = () => {
            if (agentService.awareness) {
                setAwareness(agentService.awareness);

                // Set some initial awareness state for the local user
                agentService.awareness.setLocalStateField('user', {
                    name: 'User ' + Math.floor(Math.random() * 100),
                    color: randomColor(),
                });
            }
        };

        // Initialize immediately
        handleAwarenessUpdate();

        // Setup listener for changes
        agentService.on('awareness_change', handleAwarenessUpdate);

        return () => {
            agentService.off('awareness_change', handleAwarenessUpdate);
        };
    }, []);

    // Setup shared text document for collaborative editing
    useEffect(() => {
        if (agentService.yDoc) {
            // Create a shared text type for editing
            const sharedText = agentService.yDoc.getText('sharedEditor');

            // Set up initial content if empty
            if (sharedText.length === 0) {
                sharedText.insert(0, '// Start coding here...');
            }

            // Listen for changes in the shared document
            sharedText.observe(() => {
                setSharedStateInternal(prev => ({
                    ...prev,
                    editorContent: sharedText.toString()
                }));
            });
        }
    }, []);

    const setSharedState = useCallback((updater) => {
        setSharedStateInternal(prevState => {
            const newState = typeof updater === 'function' ? updater(prevState) : updater;
            return {...prevState, ...newState};
        });
    }, []);

    // Function to update the shared editor content
    const updateSharedEditorContent = useCallback((newContent) => {
        if (agentService.yDoc) {
            const sharedText = agentService.yDoc.getText('sharedEditor');
            sharedText.delete(0, sharedText.length); // Clear current content
            sharedText.insert(0, newContent); // Insert new content
        }
        setSharedStateInternal(prevState => ({
            ...prevState,
            editorContent: newContent
        }));
    }, []);

    const value = {
        yDoc: agentService.yDoc,
        awareness: awareness,
        sharedState,
        setSharedState,
        updateSharedEditorContent,
    };

    return (
        <SharedStateContext.Provider value={value}>
            {children}
        </SharedStateContext.Provider>
    );
}