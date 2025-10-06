import Bag from './bag.js';

/**
 * Bag-based adjacency collection for graph-based reasoning with priority sampling
 * Manages graph relationships using statistical priority sampling for efficient traversal
 */
class BagAdjacencyCollection {
    constructor(config = {}) {
        this.config = {
            maxAdjacenciesPerNode: config.maxAdjacenciesPerNode || 50,
            maxNodes: config.maxNodes || 1000,
            defaultRelationshipPriority: config.defaultRelationshipPriority || 0.5,
            ...config
        };

        // Main adjacency storage using Bags for each node
        this._adjacencyBags = new Map(); // nodeId -> Bag of adjacent nodes
        this._nodeMetadata = new Map(); // nodeId -> metadata object
        this._reverseAdjacencies = new Map(); // nodeId -> Set of nodes that point to this node

        // Global statistics
        this._stats = {
            nodesAdded: 0,
            relationshipsAdded: 0,
            traversalsPerformed: 0,
            priorityUpdates: 0
        };
    }

    /**
     * Add a node to the adjacency collection
     * @param {string} nodeId - Unique identifier for the node
     * @param {Object} metadata - Optional metadata for the node
     */
    addNode(nodeId, metadata = {}) {
        if (!nodeId || this._adjacencyBags.has(nodeId)) return false;

        if (this._adjacencyBags.size >= this.config.maxNodes) {
            this._removeLowestPriorityNode();
        }

        this._adjacencyBags.set(nodeId, new Bag(this.config.maxAdjacenciesPerNode));
        this._nodeMetadata.set(nodeId, {
            created: Date.now(),
            ...metadata
        });
        this._reverseAdjacencies.set(nodeId, new Set());

        this._stats.nodesAdded++;
        return true;
    }

    /**
     * Add a directed relationship between two nodes
     * @param {string} fromNode - Source node ID
     * @param {string} toNode - Target node ID
     * @param {number} priority - Relationship priority/strength
     * @param {Object} relationshipData - Additional relationship data
     */
    addRelationship(fromNode, toNode, priority = null, relationshipData = {}) {
        if (!fromNode || !toNode || fromNode === toNode) return false;

        // Ensure both nodes exist
        if (!this._adjacencyBags.has(fromNode)) {
            this.addNode(fromNode);
        }
        if (!this._adjacencyBags.has(toNode)) {
            this.addNode(toNode);
        }

        const relationshipPriority = priority !== null ? priority : this.config.defaultRelationshipPriority;

        const relationship = {
            fromNode,
            toNode,
            priority: relationshipPriority,
            data: relationshipData,
            created: Date.now(),
            id: `rel_${fromNode}_${toNode}_${Date.now()}`
        };

        // Add to forward adjacency
        const fromBag = this._adjacencyBags.get(fromNode);
        if (fromBag.size() >= this.config.maxAdjacenciesPerNode) {
            const lowestPriorityRel = this._findLowestPriorityRelationship(fromBag);
            if (lowestPriorityRel && lowestPriorityRel.priority < relationshipPriority) {
                fromBag.removeByPredicate(item => item.id === lowestPriorityRel.id);
                this._removeReverseRelationship(lowestPriorityRel.fromNode, lowestPriorityRel.toNode);
            } else {
                return false; // Cannot add, priority too low
            }
        }

        fromBag.put(relationship, relationshipPriority);

        // Add to reverse adjacency for bidirectional traversal
        this._reverseAdjacencies.get(toNode).add(fromNode);

        this._stats.relationshipsAdded++;
        return true;
    }

    /**
     * Get adjacent nodes using priority-based sampling
     * @param {string} nodeId - Source node ID
     * @param {number} count - Number of adjacent nodes to sample
     * @returns {Array} - Array of adjacent node relationships
     */
    getAdjacentNodes(nodeId, count = 1) {
        const adjacencyBag = this._adjacencyBags.get(nodeId);
        if (!adjacencyBag || adjacencyBag.isEmpty()) return [];

        const relationships = adjacencyBag.sampleMultipleUnique(count);
        this._stats.traversalsPerformed++;
        return relationships;
    }

    /**
     * Get nodes that point to a given node (reverse adjacency)
     * @param {string} nodeId - Target node ID
     * @param {number} count - Number of incoming nodes to sample
     * @returns {Array} - Array of node IDs that point to the target
     */
    getIncomingNodes(nodeId, count = 1) {
        const incomingNodes = this._reverseAdjacencies.get(nodeId);
        if (!incomingNodes || incomingNodes.size === 0) return [];

        const nodeArray = Array.from(incomingNodes);
        // Use simple random sampling for incoming nodes since we don't have priorities here
        const shuffled = nodeArray.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * Perform priority-based graph traversal
     * @param {string} startNode - Starting node ID
     * @param {number} maxDepth - Maximum traversal depth
     * @param {number} maxNodes - Maximum nodes to visit
     * @returns {Object} - Traversal results with nodes and relationships
     */
    traverseGraph(startNode, maxDepth = 3, maxNodes = 20) {
        const visited = new Set();
        const result = {
            nodes: new Set([startNode]),
            relationships: [],
            depth: 0
        };

        const queue = [{nodeId: startNode, depth: 0}];

        while (queue.length > 0 && result.nodes.size < maxNodes && result.depth < maxDepth) {
            const {nodeId, depth} = queue.shift();
            if (visited.has(nodeId)) continue;

            visited.add(nodeId);
            result.depth = Math.max(result.depth, depth);

            // Get adjacent nodes using priority sampling
            const adjacent = this.getAdjacentNodes(nodeId, Math.min(5, maxNodes - result.nodes.size));
            for (const relationship of adjacent) {
                if (!result.nodes.has(relationship.toNode)) {
                    result.nodes.add(relationship.toNode);
                    result.relationships.push(relationship);

                    if (depth + 1 < maxDepth) {
                        queue.push({nodeId: relationship.toNode, depth: depth + 1});
                    }
                }
            }
        }

        return {
            nodes: Array.from(result.nodes),
            relationships: result.relationships,
            depth: result.depth,
            visitedCount: visited.size
        };
    }

    /**
     * Find shortest path between two nodes using priority-based A* style search
     * @param {string} startNode - Starting node ID
     * @param {string} endNode - Target node ID
     * @returns {Array|null} - Array of node IDs representing the path, or null if no path found
     */
    findShortestPath(startNode, endNode) {
        if (startNode === endNode) return [startNode];

        const frontier = new Bag(100); // Priority queue for A* (lower f-score = higher priority)
        const cameFrom = new Map();
        const costSoFar = new Map();

        frontier.put(startNode, 0);
        cameFrom.set(startNode, null);
        costSoFar.set(startNode, 0);

        while (!frontier.isEmpty()) {
            const currentNode = frontier.sample();

            if (currentNode === endNode) {
                // Reconstruct path
                const path = [];
                let current = endNode;
                while (current !== null) {
                    path.unshift(current);
                    current = cameFrom.get(current);
                }
                return path;
            }

            const adjacent = this.getAdjacentNodes(currentNode, 10);
            for (const relationship of adjacent) {
                const newCost = costSoFar.get(currentNode) + (1 - relationship.priority); // Lower priority = higher cost
                const neighbor = relationship.toNode;

                if (!costSoFar.has(neighbor) || newCost < costSoFar.get(neighbor)) {
                    costSoFar.set(neighbor, newCost);
                    const priority = relationship.priority; // Higher priority = lower f-score (better)
                    frontier.put(neighbor, priority);
                    cameFrom.set(neighbor, currentNode);
                }
            }
        }

        return null; // No path found
    }

    /**
     * Update relationship priority
     * @param {string} fromNode - Source node ID
     * @param {string} toNode - Target node ID
     * @param {number} newPriority - New priority value
     */
    updateRelationshipPriority(fromNode, toNode, newPriority) {
        const adjacencyBag = this._adjacencyBags.get(fromNode);
        if (!adjacencyBag) return false;

        const updated = adjacencyBag.updatePriority(
            adjacencyBag.toArrayWithPriorities().find(item => item.toNode === toNode),
            newPriority
        );

        if (updated) {
            this._stats.priorityUpdates++;
        }

        return updated;
    }

    /**
     * Get node metadata
     * @param {string} nodeId - Node ID
     * @returns {Object|null} - Node metadata or null if not found
     */
    getNodeMetadata(nodeId) {
        return this._nodeMetadata.get(nodeId) || null;
    }

    /**
     * Remove a node and all its relationships
     * @param {string} nodeId - Node ID to remove
     */
    removeNode(nodeId) {
        if (!this._adjacencyBags.has(nodeId)) return;

        // Remove all relationships from this node
        const adjacencyBag = this._adjacencyBags.get(nodeId);
        for (const relationship of adjacencyBag.toArrayWithPriorities()) {
            this._removeReverseRelationship(relationship.fromNode, relationship.toNode);
        }

        // Remove reverse relationships
        const incomingNodes = this._reverseAdjacencies.get(nodeId);
        if (incomingNodes) {
            for (const incomingNode of incomingNodes) {
                const incomingBag = this._adjacencyBags.get(incomingNode);
                if (incomingBag) {
                    incomingBag.removeByPredicate(item => item.toNode === nodeId);
                }
            }
        }

        // Clean up storage
        this._adjacencyBags.delete(nodeId);
        this._nodeMetadata.delete(nodeId);
        this._reverseAdjacencies.delete(nodeId);
    }

    _findLowestPriorityNode() {
        let lowestPriorityNode = null;
        let lowestPriority = Infinity;

        for (const [nodeId, adjacencyBag] of this._adjacencyBags) {
            const stats = adjacencyBag.getPriorityStats();
            if (stats.count > 0 && stats.min < lowestPriority) {
                lowestPriority = stats.min;
                lowestPriorityNode = nodeId;
            }
        }

        return lowestPriorityNode;
    }

    _findLowestPriorityRelationship(bag) {
        return bag.toArrayWithPriorities()
            .sort((a, b) => a.priority - b.priority)[0];
    }

    _removeReverseRelationship(fromNode, toNode) {
        const reverseSet = this._reverseAdjacencies.get(toNode);
        if (reverseSet) {
            reverseSet.delete(fromNode);
        }
    }

    /**
     * Get collection statistics
     * @returns {Object} - Collection statistics
     */
    getStats() {
        const nodeCount = this._adjacencyBags.size;
        const totalRelationships = Array.from(this._adjacencyBags.values())
            .reduce((sum, bag) => sum + bag.size(), 0);

        return {
            ...this._stats,
            nodeCount,
            totalRelationships,
            averageAdjacenciesPerNode: nodeCount > 0 ? totalRelationships / nodeCount : 0
        };
    }

    /**
     * Clear all data
     */
    clear() {
        this._adjacencyBags.clear();
        this._nodeMetadata.clear();
        this._reverseAdjacencies.clear();
        this._stats = {
            nodesAdded: 0,
            relationshipsAdded: 0,
            traversalsPerformed: 0,
            priorityUpdates: 0
        };
    }
}

export default BagAdjacencyCollection;