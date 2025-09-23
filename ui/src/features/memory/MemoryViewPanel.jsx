import React, {useEffect, useState} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {BrainCircuit} from 'lucide-react';
import './MemoryViewPanel.css';

function MemoryViewPanel() {
    const [beliefs, setBeliefs] = useState([]);

    useEffect(() => {
        const handleNewBelief = (belief) => {
            setBeliefs(prev => [...prev, belief]);
        };

        agentService.on('add_belief', handleNewBelief);
        return () => agentService.off('add_belief', handleNewBelief);
    }, []);

    return (
        <Panel title={<><BrainCircuit size={18}/> Memory</>}>
            <ul className="memory-list">
                {beliefs.map((belief, index) => (
                    <li key={index}>{belief.replace(/\\/g, '')}</li>
                ))}
            </ul>
            {beliefs.length === 0 && (
                <div className="memory-empty">
                    No beliefs yet.
                </div>
            )}
        </Panel>
    );
}

export default MemoryViewPanel;