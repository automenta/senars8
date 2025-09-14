export default {
    strategy: 'HTN', // Can be 'AStar' or 'HTN'
    maxDepth: 10, // Maximum depth for HTN planning
    plannerConfig: {
        // A* specific configs
        heuristicWeights: {
            complexity: 0.4,
            confidence: 0.3,
            semantic: 0.3,
        },
    }
};