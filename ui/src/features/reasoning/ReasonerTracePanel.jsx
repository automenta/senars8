import React, { useState, useEffect } from 'react';
import Panel from '../../components/core/Panel';
import agentService from '../../../services/agentService';
import { Footprints } from 'lucide-react';

function ReasonerTracePanel() {
    const [trace, setTrace] = useState([]);

    useEffect(() => {
        const handleStep = (step) => {
            setTrace(prev => [...prev, step]);
        };

        agentService.on('reasoning_step', handleStep);
        return () => agentService.off('reasoning_step', handleStep);
    }, []);

    return (
        <Panel title={<><Footprints size={18} /> Reasoner Trace</>}>
            <ul className="reasoner-trace-list">
                {trace.map((step, index) => (
                    <li key={index}>{typeof step === 'object' ? JSON.stringify(step) : step}</li>
                ))}
            </ul>
            {trace.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888' }}>
                    No reasoning steps yet.
                </div>
            )}
        </Panel>
    );
}

export default ReasonerTracePanel;
