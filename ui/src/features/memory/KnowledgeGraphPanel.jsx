import React, {useEffect, useState, useCallback, useMemo} from 'react';
import { Panel } from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import log from '@/utils/logger';
import {Network} from 'lucide-react';
import { MESSAGE_TYPES, UI_CONSTANTS } from '@/constants/ui';
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
    knowledgeItems.forEach((item, _index) => {
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
            try {
                setKnowledgeItems(prev => {
                    // Validate the incoming data
                    if (!data) {
                        log.warn('Empty knowledge data received');
                        notificationService.addWarning('Empty Data', 'Received empty knowledge data');
                        return prev;
                    }
                    
                    // Ensure data is an array
                    const dataArray = Array.isArray(data) ? data : [data];
                    
                    // Validate each item in the array
                    const validItems = dataArray.filter(item => {
                        if (!item || typeof item !== 'object') {
                            log.warn('Invalid knowledge item received:', item);
                            return false;
                        }
                        // At least one of statement or term should exist
                        if (!item.statement && !item.term) {
                            log.warn('Knowledge item missing statement or term:', item);
                            return false;
                        }
                        return true;
                    });
                    
                    if (validItems.length === 0) {
                        log.warn('No valid knowledge items to process');
                        notificationService.addWarning('Invalid Data', 'No valid knowledge items found');
                        return prev;
                    }
                    
                    // Merge new data with existing data
                    const combined = [...prev, ...validItems];
                    // Remove duplicates based on statement or term
                    const unique = Array.from(new Map(combined.map(item => [item.statement || item.term || item.id, item])).values());
                    return unique;
                });
                setIsLoading(false);
            } catch (error) {
                log.error('Error processing knowledge update:', error);
                notificationService.addError('Knowledge Update Error', 'Error processing knowledge update');
                setIsLoading(false);
            }
        };
        
        const handleKnowledgeError = (error) => {
            log.error('Knowledge graph error:', error);
            notificationService.addError('Knowledge Graph Error', error.message || 'Error receiving knowledge data');
            setIsLoading(false);
        };

        agentService.on(MESSAGE_TYPES.KNOWLEDGE_GRAPH_UPDATE, handleKnowledgeUpdate);
        agentService.on(MESSAGE_TYPES.KNOWLEDGE_GRAPH_ERROR, handleKnowledgeError);
        
        // Request initial knowledge data
        setIsLoading(true);
        agentService.sendMessage(MESSAGE_TYPES.KNOWLEDGE_GRAPH_UPDATE.replace('_update', ''), {}, { expectResponse: true, timeout: UI_CONSTANTS.CONNECTION.MESSAGE_TIMEOUT });
        
        return () => {
            agentService.off(MESSAGE_TYPES.KNOWLEDGE_GRAPH_UPDATE, handleKnowledgeUpdate);
            agentService.off(MESSAGE_TYPES.KNOWLEDGE_GRAPH_ERROR, handleKnowledgeError);
        };
    }, []);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleRefresh = () => {
        setIsLoading(true);
        agentService.sendMessage(MESSAGE_TYPES.KNOWLEDGE_GRAPH_UPDATE.replace('_update', ''), {});
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
        try {
            return {
                nodes: nodes.length,
                edges: edges.length,
                items: knowledgeItems.length
            };
        } catch (error) {
            log.error('Error calculating graph statistics:', error);
            return { nodes: 0, edges: 0, items: 0 };
        }
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
                            knowledgeItems.slice(0, 50).map((item, _index) => (  // Limit to first 50 items for performance
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
                        {knowledgeItems.length > 50 && (
                            <div className="knowledge-item info">
                                Showing 50 of {knowledgeItems.length} items. Filter to see specific items.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export default KnowledgeGraphPanel;