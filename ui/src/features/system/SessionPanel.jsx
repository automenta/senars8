import React, {useState} from 'react';
import {Panel} from '@ui/components';
import {useSession} from '@/context/SessionContext';
import {Clock, FilePlus, FolderOpen, Save, Trash2} from 'lucide-react';
import './SessionPanel.css';

const SessionPanel = () => {
    const {
        activeSession,
        savedSessions,
        createNewSession,
        loadSession,
        deleteSession,
        listSessions
    } = useSession();

    const [newSessionName, setNewSessionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateSession = () => {
        if (newSessionName.trim()) {
            createNewSession(newSessionName.trim());
            setNewSessionName('');
            setIsCreating(false);
        }
    };

    const sessionsList = listSessions();

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <Panel title={<><FolderOpen size={18}/> Sessions</>}>
            <div className="session-panel">
                <div className="session-controls">
                    {!isCreating ? (
                        <button
                            className="new-session-btn"
                            onClick={() => setIsCreating(true)}
                        >
                            <FilePlus size={16}/> New Session
                        </button>
                    ) : (
                        <div className="create-session-form">
                            <input
                                type="text"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                placeholder="Session name..."
                                className="session-name-input"
                                maxLength={50}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateSession();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                            <button
                                className="confirm-btn"
                                onClick={handleCreateSession}
                                disabled={!newSessionName.trim()}
                            >
                                <Save size={14}/> Create
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => setIsCreating(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                <div className="active-session">
                    <h4>Active Session</h4>
                    {activeSession ? (
                        <div className="session-info">
                            <div className="session-name">{activeSession.name}</div>
                            <div className="session-meta">
                                <span className="created-date">
                                    <Clock size={12}/> Created: {formatDate(activeSession.createdAt)}
                                </span>
                                <span className="modified-date">
                                    Modified: {formatDate(activeSession.lastModified)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="no-session">No active session</div>
                    )}
                </div>

                <div className="saved-sessions">
                    <h4>Saved Sessions ({sessionsList.length})</h4>
                    {sessionsList.length > 0 ? (
                        <div className="sessions-list">
                            {sessionsList.map(session => (
                                <div key={session.id} className="session-item">
                                    <div className="session-content">
                                        <div className="session-name" title={session.name}>
                                            {session.name}
                                        </div>
                                        <div className="session-meta">
                                            <span className="created-date">
                                                <Clock size={10}/> {formatDate(session.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="session-actions">
                                        <button
                                            className="load-btn"
                                            onClick={() => loadSession(session.id)}
                                            title="Load session"
                                        >
                                            <FolderOpen size={14}/>
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => {
                                                if (window.confirm(`Delete session "${session.name}"?`)) {
                                                    deleteSession(session.id);
                                                }
                                            }}
                                            title="Delete session"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-sessions">
                            No saved sessions. Create one to save your current layout and settings.
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
};

export default SessionPanel;