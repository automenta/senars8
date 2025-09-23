import React, {useCallback, useEffect, useState} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {Footprints} from 'lucide-react';
import './ReasonerTracePanel.css';

function ReasonerTracePanel() {
    const [trace, setTrace] = useState([]);

    const handleStep = useCallback((step) => {
        setTrace(prev => [...prev, step]);
    }, []);

    useEffect(() => {
        agentService.on('reasoning_step', handleStep);
        return () => agentService.off('reasoning_step', handleStep);
    }, [handleStep]);

    return (
        <Panel title={<><Footprints size={18}/> Reasoner Trace</>}>
            <ul className="reasoner-trace-list">
                {trace.map((step, index) => (
                    <li key={index}>{typeof step === 'object' ? JSON.stringify(step) : step}</li>
                ))}
            </ul>
            {trace.length === 0 && (
                <div className="reasoner-trace-empty">
                    No reasoning steps yet.
                </div>
            )}
        </Panel>
    );
}

export default ReasonerTracePanel;