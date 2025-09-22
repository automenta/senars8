import React from 'react';
import Panel from '../core/Panel';
import { BrainCircuit } from 'lucide-react';

function MemoryViewPanel() {
    return (
        <Panel title={<><BrainCircuit size={18} /> Memory</>}>
            <div style={{ textAlign: 'center', color: '#888' }}>
                Memory inspection tools will be here.
            </div>
        </Panel>
    );
}

export default MemoryViewPanel;
