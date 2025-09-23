import React from 'react';
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import Panel from '../../components/core/Panel';
import { Share2 } from 'lucide-react';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function KnowledgeGraphPanel() {
    return (
        <Panel title={<><Share2 size={18} /> Knowledge Graph</>}>
            <ReactFlow
                nodes={initialNodes}
                edges={initialEdges}
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
