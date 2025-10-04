import React, {useEffect, useState} from 'react';
import {Panel} from '@ui/components';
import {useConnection} from '@/context/useConnection';
import {useSharedState} from '@/context/useSharedState';
import {useSettings} from '@/context/useSettings';
import {useSearch} from '@/context/SearchContext';
import {useTasks} from '@/context/TaskContext';
import {useSession} from '@/context/SessionContext';
import {Activity, Bug, Cpu, Database, HardDrive, Trash2, Zap} from 'lucide-react';
import agentService from '@/services/agentService';
import './style.css';

const DebugPanel = () => {
    const {isConnected, connectionStatus, connectionError, connectionStats, lastMessage} = useConnection();
    const {sharedState, awareness} = useSharedState();
    const {isSonificationEnabled} = useSettings();
    const {searchResults, isSearching, searchTerm} = useSearch();
    const {tasks} = useTasks();
    const {activeSession, savedSessions} = useSession();

    const [debugInfo, setDebugInfo] = useState({});
    const [showSystemInfo, setShowSystemInfo] = useState(false);
    const [showMemoryInfo, setShowMemoryInfo] = useState(false);
    const [showConnectionInfo, setShowConnectionInfo] = useState(false);
    const [showSharedState, setShowSharedState] = useState(false);

    // Update debug info periodically
    useEffect(() => {
        const timer = setInterval(() => {
            setDebugInfo(prev => ({
                ...prev,
                timestamp: new Date().toISOString(),
                agentServiceStatus: agentService.isConnected ? 'connected' : 'disconnected',
                pendingMessages: agentService.pendingMessages?.length || 0,
                connectionStats: agentService.getConnectionStats(),
                memoryUsage: typeof performance !== 'undefined' ?
                    performance.memory ?
                        `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` :
                        'N/A' : 'N/A'
            }));
        }, 2000);

        return () => clearInterval(timer);
    }, []);

    const handleSendMessage = () => {
        try {
            // Send a test message to the agent
            const success = agentService.sendMessage('debug_ping', {timestamp: Date.now()});
            if (success) {
                console.log('Debug ping sent successfully');
            } else {
                console.log('Failed to send debug ping');
            }
        } catch (error) {
            console.error('Error sending debug message:', error);
        }
    };

    const handleClearDebug = () => {
        // Clear any debug messages or reset debug state
        console.log('Debug cleared');
    };

    const formatMessage = (msg) => {
        if (!msg) return 'No message';
        if (typeof msg === 'string') return msg;
        if (typeof msg === 'object') return JSON.stringify(msg, null, 2);
        return String(msg);
    };

    return (
        <Panel title={<><Bug size={18}/> Debug Tools</>}>
            <div className="debug-panel">
                <div className="debug-controls">
                    <button
                        className="debug-btn primary"
                        onClick={handleSendMessage}
                        title="Send test message to agent"
                    >
                        <Zap size={16}/> Ping Agent
                    </button>
                    <button
                        className="debug-btn secondary"
                        onClick={handleClearDebug}
                        title="Clear debug information"
                    >
                        <Trash2 size={16}/> Clear
                    </button>
                </div>

                <div className="debug-sections">
                    {/* Connection Debug */}
                    <div className="debug-section">
                        <div
                            className="section-header"
                            onClick={() => setShowConnectionInfo(!showConnectionInfo)}
                        >
                            <h4><Activity size={16}/> Connection Info</h4>
                            <span className={`toggle ${showConnectionInfo ? 'open' : ''}`}>&#9662;</span>
                        </div>
                        {showConnectionInfo && (
                            <div className="section-content">
                                <div className="debug-item">
                                    <span className="label">Status:</span>
                                    <span className={`value ${connectionStatus}`}>{connectionStatus}</span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Connected:</span>
                                    <span className={`value ${isConnected ? 'connected' : 'disconnected'}`}>
                                        {isConnected ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                {connectionError && (
                                    <div className="debug-item">
                                        <span className="label">Error:</span>
                                        <span className="value error">{connectionError.toString()}</span>
                                    </div>
                                )}
                                {connectionStats && (
                                    <div className="debug-item">
                                        <span className="label">Total Connections:</span>
                                        <span className="value">{connectionStats.totalConnections}</span>
                                    </div>
                                )}
                                <div className="debug-item">
                                    <span className="label">Last Message:</span>
                                    <div className="value last-message">
                                        {formatMessage(lastMessage)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* System Debug */}
                    <div className="debug-section">
                        <div
                            className="section-header"
                            onClick={() => setShowSystemInfo(!showSystemInfo)}
                        >
                            <h4><Cpu size={16}/> System Info</h4>
                            <span className={`toggle ${showSystemInfo ? 'open' : ''}`}>&#9662;</span>
                        </div>
                        {showSystemInfo && (
                            <div className="section-content">
                                <div className="debug-item">
                                    <span className="label">Sonification:</span>
                                    <span className={`value ${isSonificationEnabled ? 'enabled' : 'disabled'}`}>
                                        {isSonificationEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Timestamp:</span>
                                    <span className="value">{debugInfo.timestamp || 'N/A'}</span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Memory Usage:</span>
                                    <span className="value">{debugInfo.memoryUsage || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Memory Debug */}
                    <div className="debug-section">
                        <div
                            className="section-header"
                            onClick={() => setShowMemoryInfo(!showMemoryInfo)}
                        >
                            <h4><Database size={16}/> Memory Info</h4>
                            <span className={`toggle ${showMemoryInfo ? 'open' : ''}`}>&#9662;</span>
                        </div>
                        {showMemoryInfo && (
                            <div className="section-content">
                                <div className="debug-item">
                                    <span className="label">Tasks:</span>
                                    <span className="value">{tasks.length}</span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Search Results:</span>
                                    <span className="value">{searchResults.length}</span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Search Term:</span>
                                    <span className="value">{searchTerm || 'None'}</span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Searching:</span>
                                    <span className={`value ${isSearching ? 'active' : 'inactive'}`}>
                                        {isSearching ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className="debug-item">
                                    <span className="label">Saved Sessions:</span>
                                    <span className="value">{Object.keys(savedSessions).length}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shared State */}
                    <div className="debug-section">
                        <div
                            className="section-header"
                            onClick={() => setShowSharedState(!showSharedState)}
                        >
                            <h4><HardDrive size={16}/> Shared State</h4>
                            <span className={`toggle ${showSharedState ? 'open' : ''}`}>&#9662;</span>
                        </div>
                        {showSharedState && (
                            <div className="section-content">
                                <div className="debug-item">
                                    <span className="label">Awareness Clients:</span>
                                    <span className="value">
                                        {awareness ? awareness.getStates().size : 0}
                                    </span>
                                </div>
                                {sharedState && Object.keys(sharedState).map(key => (
                                    <div key={key} className="debug-item">
                                        <span className="label">{key}:</span>
                                        <span className="value">
                                            {typeof sharedState[key] === 'object'
                                                ? JSON.stringify(sharedState[key]).substring(0, 50) + (JSON.stringify(sharedState[key]).length > 50 ? '...' : '')
                                                : String(sharedState[key]).substring(0, 50) + (String(sharedState[key]).length > 50 ? '...' : '')
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default DebugPanel;