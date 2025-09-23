import React from 'react';
import Panel from '../../components/core/Panel';
import { Share2 } from 'lucide-react';

function KnowledgeGraphPanel() {
    return (
        <Panel title={<><Share2 size={18} /> Knowledge Graph</>}>
            <div style={{ textAlign: 'center', color: '#888' }}>
                Knowledge graph visualization will be here.
            </div>
        </Panel>
    );
}

export default KnowledgeGraphPanel;
