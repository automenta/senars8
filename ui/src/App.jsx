import React, { useEffect } from 'react';
import agentService from './services/agentService';

// Panels
import StatusPanel from './components/panels/StatusPanel';
import ControlPanel from './components/panels/ControlPanel';
import InputPanel from './components/panels/InputPanel';
import LogPanel from './components/panels/LogPanel';
import MemoryViewPanel from './components/panels/MemoryViewPanel';
import ReasonerTracePanel from './components/panels/ReasonerTracePanel';
import KnowledgeGraphPanel from './components/panels/KnowledgeGraphPanel';

// Core Styles
import './App.css';
import './components/core/Panel.css';

function App() {
    useEffect(() => {
        // Connect to the agent when the app mounts
        agentService.connect();

        // Disconnect on unmount
        return () => {
            agentService.disconnect();
        };
    }, []);

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>SeNARS IDE</h1>
            </header>
            <main className="app-main">
                <div className="main-grid">
                    <div className="grid-top-left">
                        <StatusPanel />
                    </div>
                    <div className="grid-top-right">
                        <ControlPanel />
                    </div>
                    <div className="grid-middle-left">
                        <InputPanel />
                    </div>
                    <div className="grid-middle-right">
                        <LogPanel />
                    </div>
                    <div className="grid-bottom-left">
                        <MemoryViewPanel />
                        <ReasonerTracePanel />
                    </div>
                    <div className="grid-bottom-right">
                        <KnowledgeGraphPanel />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;