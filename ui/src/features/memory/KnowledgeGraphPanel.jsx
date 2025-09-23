import React, { useEffect } from 'react';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import Panel from '../../components/core/Panel';
import { Share2 } from 'lucide-react';
import agentService from '../../services/agentService';
import useKnowledgeGraph from '@/hooks/useKnowledgeGraph';

function KnowledgeGraphPanel() {
    const { nodes, edges, handleNewBelief } = useKnowledgeGraph();

    useEffect(() => {
        agentService.on('add_belief', handleNewBelief);

        return () => {
            agentService.off('add_belief', handleNewBelief);
        };
    }, [handleNewBelief]);

    return (
        <Panel title={<><Share2 size={18} /> Knowledge Graph</>}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
        </Panel>
    );
}

export default KnowledgeGraphPanel;
