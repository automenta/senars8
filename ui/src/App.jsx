import React, { useEffect } from 'react';
import agentService from './services/agentService';
import sonificationService from './services/sonificationService';

// Panels
import StatusPanel from './features/system/StatusPanel.jsx';
import ControlPanel from './features/system/ControlPanel.jsx';
import InputPanel from './features/interaction/InputPanel.jsx';
import LogPanel from './features/system/LogPanel.jsx';
import MemoryViewPanel from './features/memory/MemoryViewPanel.jsx';
import ReasonerTracePanel from './features/reasoning/ReasonerTracePanel.jsx';
import KnowledgeGraphPanel from './features/memory/KnowledgeGraphPanel.jsx';

// Core Styles
import './App.css';
import './components/core/Panel.css';

function App() {
    useEffect(() => {
        // Connect to the agent when the app mounts
        agentService.connect();

        // Initialize sonification on first user interaction
        const handleFirstInteraction = () => {
            sonificationService.initialize();
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);

        // Disconnect on unmount
        return () => {
            agentService.disconnect();
            window.removeEventListener('click', handleFirstInteraction);
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