import React, {useEffect, useState, useCallback, useMemo} from 'react';
import Panel from '@/components/core/Panel';
import agentService from '@/services/agentService';
import {Network} from 'lucide-react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import './KnowledgeGraphPanel.css';

// Helper function to convert knowledge items to nodes and edges
const convertToGraphData = (knowledgeItems) => {
    const nodes = [];
    const edges = [];
    const nodeIdMap = new Map();
    
    // Create nodes for each unique term/concept
    knowledgeItems.forEach((_item, _index) => {
        const statement = item.statement || item.term || 'Unknown';
        
        // Extract terms from statement (simplified approach)
        const terms = statement.match(/<([^>]+)>/g) || [];
        terms.forEach(term => {
            const cleanTerm = term.replace(/[<>]/g, '');
            if (!nodeIdMap.has(cleanTerm)) {
                nodeIdMap.set(cleanTerm, `node-${nodeIdMap.size}`);
                nodes.push({
                    id: nodeIdMap.get(cleanTerm),
                    type: 'default',
                    position: { x: Math.random() * 500, y: Math.random() * 500 },
                    data: { label: cleanTerm }
                });
            }
        });
        
        // Create edges between related terms
        if (terms.length > 1) {
            for (let i = 0; i < terms.length - 1; i++) {
                const sourceTerm = terms[i].replace(/[<>]/g, '');
                const targetTerm = terms[i + 1].replace(/[<>]/g, '');
                const sourceId = nodeIdMap.get(sourceTerm);
                const targetId = nodeIdMap.get(targetTerm);
                
                if (sourceId && targetId) {
                    edges.push({
                        id: `edge-${edges.length}`,
                        source: sourceId,
                        target: targetId,
                        markerEnd: { type: MarkerType.ArrowClosed },
                        animated: true,
                        style: { stroke: '#4a90e2' }
                    });
                }
            }
        }
    });
    
    return { nodes, edges };
};

function KnowledgeGraphPanel() {
    const [knowledgeItems, setKnowledgeItems] = useState([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Convert knowledge items to graph data when they change
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = convertToGraphData(knowledgeItems);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [knowledgeItems, setNodes, setEdges]);

    // Handle incoming knowledge data
    useEffect(() => {
        const handleKnowledgeUpdate = (data) => {
            setKnowledgeItems(prev => {
                // Merge new data with existing data
                const combined = [...prev, ...data];
                // Remove duplicates based on statement
                const unique = Array.from(new Map(combined.map(item => [item.statement || item.term, item])).values());
                return unique;
            });
            setIsLoading(false);
        };

        agentService.on('knowledge_graph_update', handleKnowledgeUpdate);
        
        // Request initial knowledge data
        setIsLoading(true);
        agentService.sendMessage('get_knowledge_graph_data', {});
        
        return () => {
            agentService.off('knowledge_graph_update', handleKnowledgeUpdate);
        };
    }, []);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleRefresh = () => {
        setIsLoading(true);
        agentService.sendMessage('get_knowledge_graph_data', {});
    };

    const handleClearGraph = () => {
        if (window.confirm('Are you sure you want to clear the knowledge graph?')) {
            setKnowledgeItems([]);
            setNodes([]);
            setEdges([]);
        }
    };

    // Calculate graph statistics
    const graphStats = useMemo(() => {
        return {
            nodes: nodes.length,
            edges: edges.length,
            items: knowledgeItems.length
        };
    }, [nodes, edges, knowledgeItems]);

    return (
        <Panel title={<><Network size={18}/> Knowledge Graph</>}>
            <div className="knowledge-graph-panel">
                {/* Controls */}
                <div className="graph-controls">
                    <button 
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="control-button"
                    >
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button 
                        onClick={handleClearGraph}
                        className="control-button clear-button"
                    >
                        Clear Graph
                    </button>
                    <div className="graph-stats">
                        Nodes: {graphStats.nodes} | Edges: {graphStats.edges} | Items: {graphStats.items}
                    </div>
                </div>

                {/* Graph Visualization */}
                <div className="graph-container">
                    {nodes.length > 0 ? (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            fitView
                            attributionPosition="bottom-left"
                        >
                            <Controls />
                            <MiniMap />
                            <Background variant="dots" gap={12} size={1} />
                        </ReactFlow>
                    ) : (
                        <div className="graph-empty">
                            {isLoading ? (
                                <div className="loading">Loading knowledge graph...</div>
                            ) : (
                                <div>
                                    <p>No knowledge data available.</p>
                                    <button onClick={handleRefresh} className="control-button">
                                        Load Knowledge Data
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Knowledge List */}
                <div className="knowledge-list-container">
                    <h4>Knowledge Items ({knowledgeItems.length})</h4>
                    <div className="knowledge-list">
                        {knowledgeItems.length > 0 ? (
                            knowledgeItems.map((item, _index) => (
                                <div key={item.id || _index} className="knowledge-item">
                                    <div className="knowledge-statement">
                                        {item.statement || item.term || 'Unknown item'}
                                    </div>
                                    <div className="knowledge-meta">
                                        <span className="confidence">
                                            Confidence: {item.confidence ? item.confidence.toFixed(3) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="knowledge-empty">
                                No knowledge items to display.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export default KnowledgeGraphPanel;