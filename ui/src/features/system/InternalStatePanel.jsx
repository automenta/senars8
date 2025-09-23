import React from 'react';
import Panel from '@/components/core/Panel';
import { Thermometer } from 'lucide-react';

function InternalStatePanel() {
    return (
        <Panel title={<><Thermometer size={18} /> Internal State</>}>
            <div style={{ textAlign: 'center', color: '#888' }}>
                Agent's internal state will be visualized here.
            </div>
        </Panel>
    );
}

export default InternalStatePanel;
