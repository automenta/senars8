import React, { useState, useEffect } from 'react';
import { Panel } from '@ui/components';
import { Network, Activity, Zap, Brain, Filter } from 'lucide-react';
import ReactForceGraph2D from 'react-force-graph-2d';
import './VisualReasoningPanel.css';

// Helper function to convert knowledge items to nodes and edges for concept maps
const convertToConceptMapData = (beliefs, goals, inferences) => {
    const nodes = new Map();
    const edges = [];
    const nodeConnections = new Map(); // Track connections for confidence calculation

    // Helper to extract terms from Narsese statement
    const extractTerms = (statement) => {
        // Extract terms from Narsese format (basic extraction)
        const matches = statement.match(/<([^<>]+)>|(\w+)/g);
        if (matches) {
            return matches.map(m => m.replace(/[<>.?]/g, '').trim()).filter(m => m);
        }
        return [];
    };

    // Process beliefs
    beliefs.forEach(belief => {
        const statement = typeof belief === 'string' ? belief : (belief.statement || belief.term || JSON.stringify(belief));
        const terms = extractTerms(statement);

        // Add terms as nodes
        terms.forEach(term => {
            if (term && !nodes.has(term)) {
                nodes.set(term, {
                    id: term,
                    name: term,
                    group: 'belief',
                    confidence: belief.confidence || 0.5,
                    type: 'belief'
                });
            }
        });

        // Create edges between terms
        for (let i = 0; i < terms.length - 1; i++) {
            for (let j = i + 1; j < terms.length; j++) {
                const source = terms[i];
                const target = terms[j];
                const edgeId = `${source}-${target}`;

                if (!edges.find(e => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source,
                        target,
                        type: 'belief-connection',
                        strength: belief.confidence || 0.5,
                        statement: statement
                    });

                    // Track connections for confidence calculation
                    if (!nodeConnections.has(source)) nodeConnections.set(source, []);
                    if (!nodeConnections.has(target)) nodeConnections.set(target, []);
                    nodeConnections.get(source).push(target);
                    nodeConnections.get(target).push(source);
                }
            }
        }
    });

    // Process goals
    goals.forEach(goal => {
        const statement = typeof goal === 'string' ? goal : (goal.statement || goal.term || JSON.stringify(goal));
        const terms = extractTerms(statement);

        // Add terms as nodes
        terms.forEach(term => {
            if (term && !nodes.has(term)) {
                nodes.set(term, {
                    id: term,
                    name: term,
                    group: 'goal',
                    confidence: goal.confidence || 0.5,
                    type: 'goal'
                });
            } else if (nodes.has(term)) {
                // Update node if it exists but is a different type
                const existing = nodes.get(term);
                nodes.set(term, {
                    ...existing,
                    group: existing.group === 'belief' ? 'mixed' : 'goal',
                    type: existing.type === 'belief' ? 'mixed' : 'goal',
                    confidence: Math.max(existing.confidence, goal.confidence || 0.5)
                });
            }
        });

        // Create edges between terms in goals
        for (let i = 0; i < terms.length - 1; i++) {
            for (let j = i + 1; j < terms.length; j++) {
                const source = terms[i];
                const target = terms[j];
                const edgeId = `${source}-${target}`;

                if (!edges.find(e => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source,
                        target,
                        type: 'goal-connection',
                        strength: goal.confidence || 0.5,
                        statement: statement
                    });
                }
            }
        }
    });

    // Process inferences
    inferences.forEach(inference => {
        const statement = typeof inference === 'string' ? inference : JSON.stringify(inference);
        const terms = extractTerms(statement);

        // Add terms as nodes
        terms.forEach(term => {
            if (term && !nodes.has(term)) {
                nodes.set(term, {
                    id: term,
                    name: term,
                    group: 'inference',
                    confidence: inference.confidence || 0.5,
                    type: 'inference'
                });
            } else {
                const existing = nodes.get(term);
                nodes.set(term, {
                    ...existing,
                    group: existing.group === 'belief' ? 'mixed' : existing.group === 'goal' ? 'mixed' : 'inference',
                    type: 'mixed',
                    confidence: Math.max(existing.confidence, inference.confidence || 0.5)
                });
            }
        });

        // Create edges between terms in inferences
        for (let i = 0; i < terms.length - 1; i++) {
            for (let j = i + 1; j < terms.length; j++) {
                const source = terms[i];
                const target = terms[j];
                const edgeId = `${source}-${target}`;

                if (!edges.find(e => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source,
                        target,
                        type: 'inference-connection',
                        strength: inference.confidence || 0.5,
                        statement: statement
                    });
                }
            }
        }
    });

    // Update node confidence based on connections
    nodes.forEach(node => {
        const connections = nodeConnections.get(node.id) || [];
        if (connections.length > 0) {
            // Increase confidence based on number of connections
            node.confidence = Math.min(1.0, node.confidence + (connections.length * 0.1));
        }
    });

    return {
        nodes: Array.from(nodes.values()),
        edges
    };
};

function ConceptMap({ beliefs, goals, inferences, selectedNode }) {
    const [conceptData, setConceptData] = useState({ nodes: [], edges: [] });
    const [graphSize, setGraphSize] = useState({ width: 600, height: 400 });

    // Update graph data when beliefs/goals/inferences change
    useEffect(() => {
        const data = convertToConceptMapData(beliefs, goals, inferences);
        setConceptData(data);
    }, [beliefs, goals, inferences]);

    // Update graph size when component mounts or resizes
    useEffect(() => {
        const updateSize = () => {
            const container = document.querySelector('.concept-map-container');
            if (container) {
                setGraphSize({
                    width: container.clientWidth,
                    height: Math.max(400, container.clientHeight - 50) // Minimum height of 400px
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Node color based on type and confidence
    const getNodeColor = useCallback((node) => {
        const confidence = node.confidence || 0.5;
        const intensity = Math.floor(confidence * 255);

        switch (node.type) {
            case 'belief':
                return `rgb(0, ${intensity}, ${255 - intensity})`; // Blue to Red based on confidence
            case 'goal':
                return `rgb(${intensity}, 100, ${255 - intensity / 2})`; // Purple based on confidence
            case 'inference':
                return `rgb(${200 - intensity / 2}, ${intensity}, ${100})`; // Orange based on confidence
            case 'mixed':
                return `rgb(${intensity}, ${intensity}, ${intensity})`; // Gray based on confidence
            default:
                return `rgb(100, ${intensity}, 200)`; // Default to purple
        }
    }, []);

    // Node size based on connections
    const getNodeSize = useCallback((node) => {
        // Base size of 5, increase with confidence
        return 5 + (node.confidence || 0.5) * 10;
    }, []);

    // Edge color based on type
    const getEdgeColor = useCallback((edge) => {
        switch (edge.type) {
            case 'belief-connection':
                return '#4A90E2';
            case 'goal-connection':
                return '#9013FE';
            case 'inference-connection':
                return '#F5A623';
            default:
                return '#888888';
        }
    }, []);

    // Render node labels
    const renderNodeLabel = useCallback((node) => {
        return `${node.name}
Conf: ${(node.confidence || 0).toFixed(2)}`;
    }, []);

    // Handle node click
    const handleNodeClick = useCallback((node) => {
        if (selectedNode && selectedNode(node)) {
            selectedNode(node);
        }
    }, [selectedNode]);

    return (
        <div className="concept-map-container">
            <ReactForceGraph2D
                graphData={conceptData}
                width={graphSize.width}
                height={graphSize.height}
                nodeLabel={renderNodeLabel}
                nodeAutoColorBy="group"
                nodeColor={getNodeColor}
                nodeVal={getNodeSize}
                linkColor={getEdgeColor}
                linkWidth={1}
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.15}
                onNodeClick={handleNodeClick}
                onNodeRightClick={node => console.log(node)}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
                warmupTicks={10}
                staticGraph={false}
            />
        </div>
    );
}

export default ConceptMap;