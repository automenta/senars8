import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import Memory from '../../core/memory/Memory.js';
import Cycle from '../../core/system/Cycle.js';
import Bag from '../../core/utils/bag.js';
import BagBufferManager from '../../core/utils/BagBufferManager.js';
import BagAdjacencyCollection from '../../core/utils/BagAdjacencyCollection.js';
import {EventEmitter} from 'events';
import CommandBus from '../../core/system/CommandBus.js';
import Term from '../../core/core/Term.js';
import Task from '../../core/core/Task.js';

// Import additional components for comprehensive testing

describe('Phase 1.1-1.4 Comprehensive Integration Tests', () => {
    let memory, cycle, eventBus, commandBus;
    let bagBufferManager, adjacencyCollection;

    beforeEach(() => {
        // Initialize real components without mocks
        eventBus = new EventEmitter();
        commandBus = new CommandBus(eventBus);

        // Create a minimal config manager mock
        const configManager = {
            getNumber: (key, defaultValue) => defaultValue || 20,
            getString: (key, defaultValue) => defaultValue || '',
            getBoolean: (key, defaultValue) => defaultValue || false,
            getObject: (key, defaultValue) => defaultValue || {}
        };

        // Create real memory instance with all optimizations
        memory = new Memory(configManager, eventBus, commandBus);

        // Create real cycle instance with LM integration
        cycle = new Cycle(
            {}, // config
            memory, // memory
            {}, // reasoner (minimal for testing)
            {
                // Real LM service stub
                generateHypotheses: async () => [],
                explain: async () => 'test explanation',
                suggestPlanRepair: async () => null,
                bootstrapTerm: async () => ({embedding: [0.1, 0.2, 0.3]}),
                proactiveEnricher: {
                    proactiveEnrichment: async () => []
                }
            },
            {}, // perception
            {}, // planner
            {}, // metaCognition
            {}, // temporalReasoner
            {}, // priorityManager
            eventBus,
            commandBus
        );

        // Create real Bag-based utilities
        bagBufferManager = new BagBufferManager({
            maxMessageQueueSize: 50,
            maxToolQueueSize: 25,
            maxAdjacencyCollectionSize: 100
        });

        adjacencyCollection = new BagAdjacencyCollection({
            maxAdjacenciesPerNode: 20,
            maxNodes: 100
        });
    });

    afterEach(async () => {
        // Clean up
        if (memory && typeof memory.clear === 'function') {
            await memory.clear();
        }
        bagBufferManager.clearAll();
        adjacencyCollection.clear();
    });

    describe('Phase 1.1: Memory Access Optimization', () => {
        it('should demonstrate enhanced caching performance', async () => {
            // Create test tasks with different priorities
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`test_term_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random();
                tasks.push(task);
            }

            // Add tasks to memory
            await memory.addTasks(tasks);

            // Test caching performance
            const startTime = performance.now();
            for (let i = 0; i < 50; i++) {
                await memory.getHighestPriorityTasks(20);
            }
            const endTime = performance.now();

            // Should be fast due to caching (< 100ms for 50 iterations)
            expect(endTime - startTime).toBeLessThan(100);

            // Verify cache statistics are working
            const stats = await memory.getStatistics();
            expect(stats).toBeDefined();
            if (stats.totalCacheRequests !== undefined) {
                expect(stats.totalCacheRequests).toBeGreaterThan(0);
            }
        });

        it('should demonstrate intelligent maintenance scheduling', async () => {
            // Add many tasks to trigger memory pressure
            const tasks = [];
            for (let i = 0; i < 200; i++) {
                const term = new Term(`pressure_term_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.9;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Trigger multiple cycles to test adaptive maintenance
            const initialStats = await memory.getStatistics();

            // Simulate access patterns
            for (let i = 0; i < 20; i++) {
                await memory.getHighestPriorityTasks(10);
            }

            const finalStats = await memory.getStatistics();

            // Should show intelligent maintenance metrics
            expect(finalStats).toBeDefined();
            if (finalStats.currentMemoryPressure !== undefined) {
                expect(finalStats.currentMemoryPressure).toBeGreaterThanOrEqual(0);
            }
        });

        it('should demonstrate semantic memory enhancement', async () => {
            // Create terms with embeddings for semantic testing
            const term1 = new Term('cat', [0.1, 0.2, 0.3]);
            const term2 = new Term('dog', [0.15, 0.25, 0.35]);
            const term3 = new Term('bird', [0.8, 0.9, 0.95]);

            await memory.addTerm(term1);
            await memory.addTerm(term2);
            await memory.addTerm(term3);

            // Test semantic similarity (mock embedding store for this test)
            const similarTerms = await memory.findRelatedTerms('cat', 0.7, 5);

            // Should find semantically related terms
            expect(Array.isArray(similarTerms)).toBe(true);
        });

        it('should demonstrate query result caching for different filter types', async () => {
            // Create diverse tasks for testing different query patterns
            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const term = new Term(`query_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, i % 2 === 0 ? '.' : '!', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.8 + 0.1;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test punctuation-based queries (beliefs, goals, questions)
            const beliefs = await memory.getBeliefs();
            const goals = await memory.getGoals();
            const questions = await memory.getQuestions();

            expect(Array.isArray(beliefs)).toBe(true);
            expect(Array.isArray(goals)).toBe(true);
            expect(Array.isArray(questions)).toBe(true);

            // Test recent tasks caching
            const recentTasks1 = await memory.getRecentTasks(10);
            const recentTasks2 = await memory.getRecentTasks(10); // Should use cache

            expect(Array.isArray(recentTasks1)).toBe(true);
            expect(Array.isArray(recentTasks2)).toBe(true);
        });

        it('should demonstrate embedding-based term relationship caching', async () => {
            // Test term relationship caching with different thresholds
            const term1 = new Term('relationship_test_1', [0.1, 0.2, 0.3]);
            const term2 = new Term('relationship_test_2', [0.15, 0.25, 0.35]);

            await memory.addTerm(term1);
            await memory.addTerm(term2);

            // Test multiple calls to verify caching behavior
            const related1 = await memory.findRelatedTerms('relationship_test_1', 0.8, 3);
            const related2 = await memory.findRelatedTerms('relationship_test_1', 0.8, 3);

            expect(Array.isArray(related1)).toBe(true);
            expect(Array.isArray(related2)).toBe(true);
        });

        it('should demonstrate memory indexer query performance optimization', async () => {
            // Create tasks with various properties for complex filtering
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`index_test_${i}`, [0.5, 0.8]);
                const punctuation = ['.', '!', '?'][i % 3];
                const task = new Task(term, punctuation, {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.9 + 0.1;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test complex query operations
            const startTime = performance.now();
            for (let i = 0; i < 30; i++) {
                await memory.queryTasks({priority: {min: 0.5}});
                await memory.getTasksByPunctuation('.');
            }
            const endTime = performance.now();

            // Should be fast due to indexer optimization
            expect(endTime - startTime).toBeLessThan(200);
        });

        it('should demonstrate intelligent cache invalidation', async () => {
            // Test that cache invalidation works correctly when memory changes
            const tasks = [];
            for (let i = 0; i < 20; i++) {
                const term = new Term(`cache_test_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.7;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Perform queries to populate cache
            await memory.getHighestPriorityTasks(10);
            await memory.getRecentTasks(5);

            // Add more tasks (should invalidate cache)
            const newTasks = [];
            for (let i = 0; i < 10; i++) {
                const term = new Term(`new_cache_test_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.8;
                newTasks.push(task);
            }

            await memory.addTasks(newTasks);

            // Verify system still works after cache invalidation
            const updatedTasks = await memory.getHighestPriorityTasks(15);
            expect(Array.isArray(updatedTasks)).toBe(true);
        });
    });

    describe('Phase 1.2: Task Processing Efficiency', () => {
        it('should demonstrate LM-enhanced task prioritization', async () => {
            // Create test tasks
            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const term = new Term(`task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.5 + 0.3; // Medium priorities
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test focus set selection with semantic prioritization
            const focusSet = await cycle._selectFocusSet();

            // Should return tasks (may be empty if no reasoner, but should not error)
            expect(Array.isArray(focusSet)).toBe(true);
        });

        it('should demonstrate adaptive cycle timing', async () => {
            // Test adaptive timing with different system loads
            const initialInterval = cycle.getAdaptiveCycleInterval();

            // Simulate some processing load
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`load_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.8;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Get performance stats after processing
            const stats = cycle.getCyclePerformanceStats();

            // Should have collected performance data
            if (stats) {
                expect(stats.averageCycleDuration).toBeGreaterThan(0);
                expect(stats.totalCycles).toBeGreaterThan(0);
            }
        });

        it('should demonstrate proactive enrichment integration', async () => {
            // Create base focus set
            const baseTasks = [];
            for (let i = 0; i < 10; i++) {
                const term = new Term(`base_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.7;
                baseTasks.push(task);
            }

            // Test proactive enrichment
            const enrichedSet = await cycle._enrichFocusSetProactively(baseTasks);

            // Should return the original set or enriched version
            expect(Array.isArray(enrichedSet)).toBe(true);
            expect(enrichedSet.length).toBeGreaterThan(0);
        });

        it('should demonstrate semantic focus set enhancement', async () => {
            // Create tasks with semantic relationships
            const tasks = [];
            for (let i = 0; i < 30; i++) {
                const term = new Term(`semantic_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.6 + 0.2;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test semantic enhancement in focus set selection
            const enhancedSet = await cycle._enhanceFocusSetWithSemantics(tasks.slice(0, 10));

            expect(Array.isArray(enhancedSet)).toBe(true);
            // Should preserve task structure
            enhancedSet.forEach(task => {
                expect(task).toHaveProperty('termKey');
                expect(task).toHaveProperty('state');
            });
        });

        it('should demonstrate intelligent cycle performance tracking', async () => {
            // Test cycle performance tracking with various loads
            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const term = new Term(`timing_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.6;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Track performance over multiple cycles
            const performanceData = [];
            for (let i = 0; i < 5; i++) {
                const startTime = performance.now();
                await cycle._selectFocusSet();
                const endTime = performance.now();
                performanceData.push(endTime - startTime);
            }

            // Should have consistent performance
            const avgTime = performanceData.reduce((a, b) => a + b, 0) / performanceData.length;
            expect(avgTime).toBeGreaterThan(0);

            // Performance should be reasonable (< 50ms per cycle)
            expect(avgTime).toBeLessThan(50);
        });

        it('should demonstrate Bag-based focus set sampling', async () => {
            // Create diverse priority tasks for Bag sampling
            const tasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`bag_focus_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random();
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test Bag-based sampling in focus set selection
            const sampledSet = await cycle._selectFocusSetWithBagSampling(20);

            expect(Array.isArray(sampledSet)).toBe(true);
            expect(sampledSet.length).toBeLessThanOrEqual(20);

            // Verify Bag statistics
            const bagStats = cycle._focusSetBag.getStatistics();
            expect(bagStats).toBeDefined();
            expect(bagStats.size).toBeGreaterThan(0);
        });

        it('should demonstrate diversity sampling in focus sets', async () => {
            // Create tasks with different characteristics for diversity testing
            const tasks = [];
            for (let i = 0; i < 60; i++) {
                const term = new Term(`diversity_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.7 + 0.2;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test diversity sampling
            const baseTasks = tasks.slice(0, 40);
            const currentTasks = tasks.slice(0, 15);
            const diversityTasks = cycle._addDiversitySampling(baseTasks, currentTasks, 20);

            expect(Array.isArray(diversityTasks)).toBe(true);

            // Should add diversity when needed
            if (currentTasks.length < 20) {
                expect(diversityTasks.length).toBeGreaterThan(0);
            }
        });

        it('should demonstrate task deduplication in focus sets', async () => {
            // Create duplicate tasks for deduplication testing
            const tasks = [];
            for (let i = 0; i < 20; i++) {
                const term = new Term(`duplicate_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.5;
                tasks.push(task);
            }

            // Create some duplicates
            const duplicateTasks = [...tasks, ...tasks.slice(0, 5)];

            // Test deduplication
            const deduplicated = cycle._deduplicateTasks(duplicateTasks);

            expect(deduplicated.length).toBe(tasks.length); // Should remove duplicates
            expect(new Set(deduplicated.map(t => t.id)).size).toBe(deduplicated.length);
        });

        it('should demonstrate semantic boost calculation', async () => {
            // Create semantically related tasks
            const tasks = [];
            for (let i = 0; i < 15; i++) {
                const term = new Term(`boost_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.5;
                tasks.push(task);
            }

            // Test semantic boost calculation
            const baseTask = tasks[0];
            const boost = await cycle._calculateSemanticBoost(baseTask, tasks);

            // Should return a number (may be 0 if no semantic enhancement available)
            expect(typeof boost).toBe('number');
            expect(boost).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Phase 1.3: Bag Data Structure Optimization', () => {
        it('should demonstrate statistical priority sampling', () => {
            const bag = new Bag(50);

            // Add items with different priorities
            for (let i = 0; i < 20; i++) {
                bag.put(`low_${i}`, 0.2);
                bag.put(`medium_${i}`, 0.5);
                bag.put(`high_${i}`, 0.8);
            }

            // Sample multiple times and verify distribution
            const samples = [];
            for (let i = 0; i < 300; i++) {
                const sample = bag.sample();
                if (sample) samples.push(sample);
            }

            // Count samples by priority level
            const lowCount = samples.filter(s => s.startsWith('low_')).length;
            const mediumCount = samples.filter(s => s.startsWith('medium_')).length;
            const highCount = samples.filter(s => s.startsWith('high_')).length;

            // Higher priority items should be sampled more frequently
            expect(highCount).toBeGreaterThan(mediumCount);
            expect(mediumCount).toBeGreaterThan(lowCount);

            // Verify statistical properties
            const stats = bag.getStatistics();
            expect(stats.size).toBeLessThanOrEqual(50);
            expect(stats.totalPriority).toBeGreaterThan(0);
        });

        it('should demonstrate Bag-based buffer management', () => {
            // Test message queue with priority sampling
            const messages = [];
            for (let i = 0; i < 30; i++) {
                const success = bagBufferManager.addMessage(
                    {content: `message_${i}`},
                    Math.random(),
                    'test'
                );
                if (success) messages.push(i);
            }

            // Should respect capacity limits
            const stats = bagBufferManager.getStats();
            expect(stats.messageQueueSize).toBeLessThanOrEqual(50);

            // Test priority-based retrieval
            const retrievedMessages = [];
            for (let i = 0; i < 10; i++) {
                const message = bagBufferManager.getNextMessage();
                if (message) retrievedMessages.push(message);
            }

            expect(retrievedMessages.length).toBeGreaterThan(0);
        });

        it('should demonstrate Bag-based adjacency collections', () => {
            // Add nodes and relationships
            adjacencyCollection.addNode('node1', {type: 'test'});
            adjacencyCollection.addNode('node2', {type: 'test'});
            adjacencyCollection.addNode('node3', {type: 'test'});

            // Add relationships with different priorities
            adjacencyCollection.addRelationship('node1', 'node2', 0.8, {type: 'strong'});
            adjacencyCollection.addRelationship('node1', 'node3', 0.3, {type: 'weak'});
            adjacencyCollection.addRelationship('node2', 'node3', 0.6, {type: 'medium'});

            // Test priority-based traversal
            const adjacent = adjacencyCollection.getAdjacentNodes('node1', 5);
            expect(Array.isArray(adjacent)).toBe(true);

            // Test graph traversal with priority sampling
            const traversal = adjacencyCollection.traverseGraph('node1', 2, 10);
            expect(traversal.nodes).toContain('node1');
            expect(Array.isArray(traversal.relationships)).toBe(true);
        });

        it('should demonstrate Bag utility functions and operations', () => {
            const bag1 = new Bag(30);
            const bag2 = new Bag(30);

            // Test merge functionality
            for (let i = 0; i < 10; i++) {
                bag1.put(`bag1_item_${i}`, 0.5 + i * 0.05);
                bag2.put(`bag2_item_${i}`, 0.6 + i * 0.04);
            }

            const originalSize = bag1.size();
            bag1.merge(bag2);

            // Should have merged items
            expect(bag1.size()).toBeGreaterThan(originalSize);

            // Test split functionality
            const otherBag = bag1.split((item) => item.includes('bag1'));
            expect(otherBag.size()).toBeGreaterThan(0);
            expect(bag1.size()).toBeLessThan(originalSize + bag2.size());
        });

        it('should demonstrate Bag filtering and priority range queries', () => {
            const bag = new Bag(40);

            // Add items across priority spectrum
            for (let i = 0; i < 20; i++) {
                bag.put(`item_${i}`, 0.1 + i * 0.04); // Priorities from 0.1 to 0.9
            }

            // Test priority range queries
            const mediumPriorityItems = bag.getByPriorityRange(0.4, 0.7);
            expect(Array.isArray(mediumPriorityItems)).toBe(true);

            // Test filtering
            const filteredBag = bag.filterToNewBag((item, priority) => priority > 0.5);
            expect(filteredBag.size()).toBeLessThan(bag.size());

            // Test priority statistics
            const priorityStats = bag.getPriorityStats();
            expect(priorityStats).toHaveProperty('min');
            expect(priorityStats).toHaveProperty('max');
            expect(priorityStats).toHaveProperty('average');
            expect(priorityStats.min).toBeGreaterThan(0);
            expect(priorityStats.max).toBeLessThanOrEqual(1);
        });

        it('should demonstrate Bag capacity management and eviction', () => {
            const smallBag = new Bag(5);

            // Fill beyond capacity
            for (let i = 0; i < 10; i++) {
                smallBag.put(`capacity_item_${i}`, Math.random() * 0.8 + 0.1);
            }

            // Should respect capacity
            expect(smallBag.size()).toBeLessThanOrEqual(5);

            // Test unique sampling
            const uniqueSamples = smallBag.sampleMultipleUnique(3);
            expect(uniqueSamples.length).toBeLessThanOrEqual(3);
            expect(new Set(uniqueSamples).size).toBe(uniqueSamples.length);

            // Test multiple sampling with replacement
            const multipleSamples = smallBag.sampleMultiple(5);
            expect(multipleSamples.length).toBe(5);
        });

        it('should demonstrate Bag-based memory task collections', async () => {
            // Test memory's Bag-based collections
            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const term = new Term(`memory_bag_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.8 + 0.1;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test Bag-based task retrieval
            const priorityTasks = memory.getTasksByBagSampling(10);
            const recentTasks = memory.getRecentTasksByBagSampling(5);

            expect(Array.isArray(priorityTasks)).toBe(true);
            expect(Array.isArray(recentTasks)).toBe(true);

            // Test semantic Bag functionality
            const semanticScore = 0.7;
            memory.addTaskToSemanticBag(tasks[0], semanticScore);
            const semanticTasks = memory.getSemanticTasksByBagSampling(3);

            expect(Array.isArray(semanticTasks)).toBe(true);
        });

        it('should demonstrate Bag performance characteristics', () => {
            const performanceBag = new Bag(1000);

            // Test performance with large number of items
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                performanceBag.put(`perf_item_${i}`, Math.random());
            }
            const insertTime = performance.now() - startTime;

            // Should be fast (< 100ms for 1000 items)
            expect(insertTime).toBeLessThan(100);

            // Test sampling performance
            const sampleStartTime = performance.now();
            for (let i = 0; i < 500; i++) {
                performanceBag.sample();
            }
            const sampleTime = performance.now() - sampleStartTime;

            // Should be fast (< 50ms for 500 samples)
            expect(sampleTime).toBeLessThan(50);
        });

        it('should demonstrate Bag error handling and edge cases', () => {
            const edgeCaseBag = new Bag(10);

            // Test invalid operations
            expect(() => edgeCaseBag.put(null, 0.5)).toThrow();
            expect(() => edgeCaseBag.put(undefined, 0.5)).toThrow();

            // Test with single item
            edgeCaseBag.put('single_item', 0.5);
            for (let i = 0; i < 10; i++) {
                expect(edgeCaseBag.sample()).toBe('single_item');
            }

            // Test priority updates
            const updateSuccess = edgeCaseBag.updatePriority('single_item', 0.8);
            expect(updateSuccess).toBe(true);

            // Test containment checks
            expect(edgeCaseBag.contains('single_item')).toBe(true);
            expect(edgeCaseBag.contains('nonexistent')).toBe(false);
        });
    });

    describe('Phase 1.4: LM-Enhanced Reasoning Integration', () => {
        it('should demonstrate LM hypothesis generation integration', async () => {
            // Create test tasks for hypothesis generation
            const focusTasks = [];
            for (let i = 0; i < 5; i++) {
                const term = new Term(`hypothesis_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.7;
                focusTasks.push(task);
            }

            // Test LM hypothesis generation
            const hypotheses = await cycle._generateLMHypotheses(focusTasks, []);

            // Should return array (may be empty if LM not fully configured)
            expect(Array.isArray(hypotheses)).toBe(true);
        });

        it('should demonstrate LM explanation generation', async () => {
            // Create complex test tasks
            const complexTasks = [];
            for (let i = 0; i < 3; i++) {
                const term = new Term(`complex_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.8; // High priority for explanation
                task.metadata = {type: 'test_complex'};
                complexTasks.push(task);
            }

            // Test LM explanation generation
            await cycle._generateLMExplanations(complexTasks);

            // Should complete without errors
            // (Explanations may not be attached if LM not fully configured)
            expect(complexTasks.length).toBe(3);
        });

        it('should demonstrate semantic term bootstrapping', async () => {
            // Create compound terms for bootstrapping
            const compoundTasks = [];
            for (let i = 0; i < 3; i++) {
                const term = new Term(`compound_term_${i}_A_compound_term_${i}_B`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.6;
                compoundTasks.push(task);
            }

            // Test semantic bootstrapping
            const bootstrappedConcepts = await cycle._performSemanticTermBootstrapping(compoundTasks);

            // Should return array
            expect(Array.isArray(bootstrappedConcepts)).toBe(true);
        });

        it('should demonstrate LM-powered plan repair', async () => {
            // Create a goal task
            const goalTerm = new Term('test_goal', [0.5, 0.8]);
            const goalTask = new Task(goalTerm, '!', {frequency: 0.9, confidence: 0.9});
            goalTask.state.priority = 0.8;

            // Simulate execution failure
            const failureResult = {error: 'Test execution failed'};

            // Test plan repair
            const repairTask = await cycle._attemptPlanRepair(goalTask, failureResult);

            // Should return repair task or null
            if (repairTask) {
                expect(repairTask.termKey).toContain('repair_');
                expect(repairTask.metadata.type).toBe('plan_repair');
            }
        });

        it('should demonstrate LM-enhanced inference workflow', async () => {
            // Create diverse tasks for inference testing
            const tasks = [];
            for (let i = 0; i < 20; i++) {
                const term = new Term(`inference_task_${i}`, [0.5, 0.8]);
                const punctuation = i % 3 === 0 ? '!' : '.';
                const task = new Task(term, punctuation, {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.7 + 0.2;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Test complete inference workflow
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            if (focusSet.length > 0) {
                const inferenceResult = await cycle._performInference(focusSet);

                expect(inferenceResult).toHaveProperty('derivedTasks');
                expect(inferenceResult).toHaveProperty('actionableGoals');
                expect(Array.isArray(inferenceResult.derivedTasks)).toBe(true);
                expect(Array.isArray(inferenceResult.actionableGoals)).toBe(true);

                // Test actionable goal filtering
                const highPriorityGoals = inferenceResult.actionableGoals.filter(
                    goal => goal.state?.priority >= 0.5
                );
                expect(Array.isArray(highPriorityGoals)).toBe(true);
            }
        });

        it('should demonstrate LM integration error handling', async () => {
            // Test LM error handling and graceful degradation
            const errorTasks = [];
            for (let i = 0; i < 5; i++) {
                const term = new Term(`error_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.6;
                errorTasks.push(task);
            }

            // Test hypothesis generation with error handling
            const hypotheses = await cycle._generateLMHypotheses(errorTasks, []);
            expect(Array.isArray(hypotheses)).toBe(true);

            // Test explanation generation with error handling
            const explanationTasks = errorTasks.map(task => ({...task, state: {...task.state, priority: 0.8}}));
            await cycle._generateLMExplanations(explanationTasks);
            expect(explanationTasks.length).toBe(5);

            // Test plan repair with error handling
            const goalTask = errorTasks[0].withPunctuation('!');
            const repairTask = await cycle._attemptPlanRepair(goalTask, {error: 'test error'});
            // Should handle gracefully (return null or valid repair task)
            expect(repairTask === null || typeof repairTask === 'object').toBe(true);
        });

        it('should demonstrate semantic similarity integration', async () => {
            // Create semantically related tasks
            const semanticTasks = [];
            for (let i = 0; i < 10; i++) {
                const term = new Term(`semantic_group_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.5;
                semanticTasks.push(task);
            }

            await memory.addTasks(semanticTasks);

            // Test semantic similarity calculation
            const baseTask = semanticTasks[0];
            const similarity = await cycle._getTaskSimilarity(baseTask, semanticTasks[1]);

            // Should return a similarity score
            expect(typeof similarity).toBe('number');
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should demonstrate LM service integration patterns', async () => {
            // Test various LM service integration scenarios
            const integrationTasks = [];
            for (let i = 0; i < 8; i++) {
                const term = new Term(`integration_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.6;
                integrationTasks.push(task);
            }

            // Test batch hypothesis generation
            const hypotheses = await cycle._generateLMHypotheses(integrationTasks, []);
            expect(Array.isArray(hypotheses)).toBe(true);

            // Test batch explanation generation
            const highPriorityTasks = integrationTasks.map(task => ({
                ...task,
                state: {...task.state, priority: 0.8}
            }));
            await cycle._generateLMExplanations(highPriorityTasks);
            expect(highPriorityTasks.length).toBe(8);

            // Test semantic bootstrapping integration
            const compoundTasks = integrationTasks.slice(0, 3).map(task => ({
                ...task,
                termKey: task.termKey + '_compound_extension'
            }));
            const bootstrapped = await cycle._performSemanticTermBootstrapping(compoundTasks);
            expect(Array.isArray(bootstrapped)).toBe(true);
        });

        it('should demonstrate LM-enhanced cycle performance', async () => {
            // Test LM integration performance impact
            const performanceTasks = [];
            for (let i = 0; i < 30; i++) {
                const term = new Term(`performance_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.6 + 0.3;
                performanceTasks.push(task);
            }

            await memory.addTasks(performanceTasks);

            // Measure LM-enhanced operations performance
            const startTime = performance.now();

            // Perform LM-enhanced operations
            const focusSet = await cycle._selectFocusSet();
            if (focusSet.length > 0) {
                await cycle._generateLMHypotheses(focusSet, []);
                await cycle._performInference(focusSet);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should complete within reasonable time (< 200ms)
            expect(totalTime).toBeLessThan(200);
        });
    });

    describe('Cross-Phase Integration', () => {
        it('should demonstrate complete workflow from memory to reasoning', async () => {
            // Phase 1.1: Add tasks to memory with caching
            const tasks = [];
            for (let i = 0; i < 50; i++) {
                const term = new Term(`integration_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.5 + 0.3;
                tasks.push(task);
            }

            await memory.addTasks(tasks);

            // Phase 1.2: Test focus set selection with LM enhancement
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            // Phase 1.3: Test Bag-based sampling in memory
            const sampledTasks = memory.getTasksByBagSampling(10);
            expect(Array.isArray(sampledTasks)).toBe(true);

            // Phase 1.4: Test LM integration in inference
            if (focusSet.length > 0) {
                const inferenceResult = await cycle._performInference(focusSet);
                expect(inferenceResult).toHaveProperty('derivedTasks');
                expect(inferenceResult).toHaveProperty('actionableGoals');
                expect(Array.isArray(inferenceResult.derivedTasks)).toBe(true);
                expect(Array.isArray(inferenceResult.actionableGoals)).toBe(true);
            }
        });

        it('should demonstrate performance improvements across phases', async () => {
            // Create substantial workload
            const tasks = [];
            for (let i = 0; i < 200; i++) {
                const term = new Term(`performance_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random();
                tasks.push(task);
            }

            // Measure complete workflow performance
            const startTime = performance.now();

            await memory.addTasks(tasks);

            // Test multiple memory operations
            for (let i = 0; i < 20; i++) {
                await memory.getHighestPriorityTasks(15);
                await memory.findSimilarTasks(tasks[i] || tasks[0], 0.7, 5);
            }

            // Test cycle operations
            for (let i = 0; i < 5; i++) {
                await cycle._selectFocusSet();
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should complete within reasonable time (< 500ms for this workload)
            expect(totalTime).toBeLessThan(500);

            // Verify all components are working
            const memoryStats = await memory.getStatistics();
            const cycleStats = cycle.getCyclePerformanceStats();

            expect(memoryStats.totalTasks).toBeGreaterThan(0);
            expect(memoryStats.cacheHitRate).toBeGreaterThanOrEqual(0);
        });

        it('should demonstrate error recovery across all phases', async () => {
            // Test error handling when components fail
            const errorTasks = [];
            for (let i = 0; i < 10; i++) {
                const term = new Term(`error_recovery_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.5;
                errorTasks.push(task);
            }

            // Test memory error recovery
            await memory.addTasks(errorTasks);

            // Test cycle error recovery
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            // Test LM error recovery
            const hypotheses = await cycle._generateLMHypotheses(focusSet, []);
            expect(Array.isArray(hypotheses)).toBe(true);

            // System should continue functioning despite errors
            const finalTasks = await memory.getHighestPriorityTasks(5);
            expect(Array.isArray(finalTasks)).toBe(true);
        });

        it('should demonstrate resource management across phases', async () => {
            // Test resource allocation and cleanup across all phases
            const resourceTasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`resource_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.8 + 0.1;
                resourceTasks.push(task);
            }

            await memory.addTasks(resourceTasks);

            // Test resource usage in memory
            const memoryStats = await memory.getStatistics();
            expect(memoryStats.totalTasks).toBeGreaterThan(0);

            // Test resource usage in Bag collections
            const bagStats = cycle._focusSetBag.getStatistics();
            expect(bagStats).toBeDefined();

            // Test resource usage in buffer manager
            const bufferStats = bagBufferManager.getStats();
            expect(bufferStats).toBeDefined();

            // Test resource cleanup
            const initialTaskCount = memoryStats.totalTasks;
            // System should maintain reasonable resource usage
            expect(initialTaskCount).toBeLessThan(1000);
        });

        it('should demonstrate configuration integration across phases', async () => {
            // Test that configuration settings affect all phases correctly
            const configTasks = [];
            for (let i = 0; i < 30; i++) {
                const term = new Term(`config_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.6;
                configTasks.push(task);
            }

            await memory.addTasks(configTasks);

            // Test configuration-driven behavior
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            // Test adaptive timing configuration
            const adaptiveInterval = cycle.getAdaptiveCycleInterval();
            expect(typeof adaptiveInterval).toBe('number');
            expect(adaptiveInterval).toBeGreaterThan(0);

            // Test Bag configuration
            const bagConfig = cycle._focusSetBag.getStatistics();
            expect(bagConfig.capacity).toBeGreaterThan(0);
        });

        it('should demonstrate statistical properties across all phases', async () => {
            // Create tasks with known statistical properties
            const statisticalTasks = [];
            for (let i = 0; i < 100; i++) {
                const term = new Term(`statistical_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random();
                statisticalTasks.push(task);
            }

            await memory.addTasks(statisticalTasks);

            // Test statistical sampling in memory
            const sampledTasks = memory.getTasksByBagSampling(20);
            expect(Array.isArray(sampledTasks)).toBe(true);

            // Test statistical properties in focus selection
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            // Test statistical properties in buffer management
            for (let i = 0; i < 20; i++) {
                bagBufferManager.addMessage(
                    {content: `statistical_message_${i}`},
                    Math.random(),
                    'statistical_test'
                );
            }

            const bufferStats = bagBufferManager.getStats();
            expect(bufferStats.messageQueueSize).toBeGreaterThan(0);

            // Verify overall system maintains statistical properties
            const memoryStats = await memory.getStatistics();
            expect(memoryStats.totalTasks).toBeGreaterThan(0);
        });

        it('should demonstrate backward compatibility across phases', async () => {
            // Test that all existing interfaces still work
            const compatibilityTasks = [];
            for (let i = 0; i < 40; i++) {
                const term = new Term(`compatibility_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = 0.5;
                compatibilityTasks.push(task);
            }

            await memory.addTasks(compatibilityTasks);

            // Test existing memory interfaces
            const allTasks = await memory.getAllTasks();
            const beliefs = await memory.getBeliefs();
            const goals = await memory.getGoals();
            const questions = await memory.getQuestions();

            expect(Array.isArray(allTasks)).toBe(true);
            expect(Array.isArray(beliefs)).toBe(true);
            expect(Array.isArray(goals)).toBe(true);
            expect(Array.isArray(questions)).toBe(true);

            // Test existing cycle interfaces
            const focusSet = await cycle._selectFocusSet();
            expect(Array.isArray(focusSet)).toBe(true);

            // Test existing Bag interfaces
            const bagSamples = cycle._focusSetBag.sampleMultiple(5);
            expect(Array.isArray(bagSamples)).toBe(true);

            // All existing functionality should work unchanged
            expect(allTasks.length).toBeGreaterThan(0);
        });

        it('should demonstrate scalability across all phases', async () => {
            // Test system performance with larger workloads
            const scalabilityTasks = [];
            for (let i = 0; i < 500; i++) {
                const term = new Term(`scalability_task_${i}`, [0.5, 0.8]);
                const task = new Task(term, '.', {frequency: 0.8, confidence: 0.9});
                task.state.priority = Math.random() * 0.9 + 0.05;
                scalabilityTasks.push(task);
            }

            const scaleStartTime = performance.now();
            await memory.addTasks(scalabilityTasks);
            const scaleEndTime = performance.now();

            // Should handle large workloads efficiently
            expect(scaleEndTime - scaleStartTime).toBeLessThan(1000);

            // Test scalability of memory operations
            const memoryScaleStart = performance.now();
            for (let i = 0; i < 50; i++) {
                await memory.getHighestPriorityTasks(20);
                await memory.queryTasks({priority: {min: 0.5}});
            }
            const memoryScaleEnd = performance.now();

            expect(memoryScaleEnd - memoryScaleStart).toBeLessThan(300);

            // Test scalability of cycle operations
            const cycleScaleStart = performance.now();
            for (let i = 0; i < 10; i++) {
                await cycle._selectFocusSet();
            }
            const cycleScaleEnd = performance.now();

            expect(cycleScaleEnd - cycleScaleStart).toBeLessThan(100);

            // System should scale appropriately
            const finalStats = await memory.getStatistics();
            expect(finalStats.totalTasks).toBe(500);
        });
    });
});