import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import useLayoutModel from '@/hooks/useLayoutModel';

const SessionContext = createContext();

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};

export const SessionProvider = ({children}) => {
    const {model} = useLayoutModel();
    const [activeSession, setActiveSession] = useState(null);
    const [savedSessions, setSavedSessions] = useState({});

    // Load saved sessions from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('senars-sessions');
        if (saved) {
            try {
                setSavedSessions(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading saved sessions:', e);
            }
        }
    }, []);

    const saveSession = useCallback((sessionId, sessionName, layoutData, additionalData = {}) => {
        const session = {
            id: sessionId,
            name: sessionName,
            layout: layoutData,
            data: additionalData,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        const updatedSessions = {
            ...savedSessions,
            [sessionId]: session
        };

        setSavedSessions(updatedSessions);
        localStorage.setItem('senars-sessions', JSON.stringify(updatedSessions));

        return sessionId;
    }, [savedSessions]);

    const loadSession = useCallback((sessionId) => {
        const session = savedSessions[sessionId];
        if (session) {
            setActiveSession(session);
            return session;
        }
        return null;
    }, [savedSessions]);

    const deleteSession = useCallback((sessionId) => {
        const updatedSessions = {...savedSessions};
        delete updatedSessions[sessionId];
        setSavedSessions(updatedSessions);
        localStorage.setItem('senars-sessions', JSON.stringify(updatedSessions));

        if (activeSession?.id === sessionId) {
            setActiveSession(null);
        }
    }, [savedSessions, activeSession]);

    const listSessions = useCallback(() => {
        return Object.values(savedSessions);
    }, [savedSessions]);

    const createNewSession = useCallback((sessionName) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return saveSession(sessionId, sessionName, model?.toJson ? model.toJson() : null, {});
    }, [model, saveSession]);

    const value = {
        activeSession,
        savedSessions,
        saveSession,
        loadSession,
        deleteSession,
        listSessions,
        createNewSession,
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};