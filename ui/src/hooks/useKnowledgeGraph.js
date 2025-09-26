import {useCallback, useState} from 'react';
import {parseTerm} from '@core/parser/parse-utils.js';
import log from '@common/utils/logger';

const useKnowledgeGraph = () => {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const addNode = useCallback((id, label) => {
        setNodes((nds) => {
            if (nds.find((node) => node.id === id)) {
                return nds;
            }
            const newNode = {
                id,
                position: {x: Math.random() * 500, y: Math.random() * 500},
                data: {label},
            };
            return [...nds, newNode];
        });
    }, []);

    const addEdge = useCallback((source, target, label) => {
        const newEdge = {
            id: `e-${source}-${target}`,
            source,
            target,
            label,
        };
        setEdges((eds) => eds.concat(newEdge));
    }, []);

    const handleNewBelief = useCallback((belief) => {
        try {
            const parsed = parseTerm(belief);
            if (parsed && parsed.term) {
                const {subject, predicate} = parsed.term;
                if (subject && predicate) {
                    const subjectLabel = subject.key || subject.term.key;
                    const predicateLabel = predicate.key || predicate.term.key;
                    addNode(subjectLabel, subjectLabel);
                    addNode(predicateLabel, predicateLabel);
                    addEdge(subjectLabel, predicateLabel, parsed.term.type);
                }
            }
        } catch (error) {
            log.error('Failed to parse belief:', belief, error);
        }
    }, [addNode, addEdge]);

    return {nodes, edges, handleNewBelief};
};

export default useKnowledgeGraph;
