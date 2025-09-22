import React from 'react';
import Panel from '../core/Panel';
import { Footprints } from 'lucide-react';

function ReasonerTracePanel() {
    return (
        <Panel title={<><Footprints size={18} /> Reasoner Trace</>}>
            <div style={{ textAlign: 'center', color: '#888' }}>
                Live reasoning trace will be displayed here.
            </div>
        </Panel>
    );
}

export default ReasonerTracePanel;
