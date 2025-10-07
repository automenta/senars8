import {beforeEach, describe, expect, it} from 'vitest';
import Bag from './bag.js';

describe('Bag Data Structure', () => {
    let bag;

    beforeEach(() => {
        bag = new Bag(10); // Small capacity for testing
    });

    describe('Basic Operations', () => {
        it('should initialize with correct capacity', () => {
            expect(bag.capacity).toBe(10);
            expect(bag.size()).toBe(0);
            expect(bag.isEmpty()).toBe(true);
        });

        it('should add items with priorities', () => {
            bag.put('item1', 0.8);
            bag.put('item2', 0.5);
            bag.put('item3', 0.9);

            expect(bag.size()).toBe(3);
            expect(bag.isEmpty()).toBe(false);
        });

        it('should handle invalid priorities gracefully', () => {
            bag.put('item1', -1); // Invalid priority
            bag.put('item2', 0);   // Zero priority
            bag.put('item3', null); // Null priority

            expect(bag.size()).toBe(3);
            // Should assign default minimum priority (0.001)
            const stats = bag.getPriorityStats();
            expect(stats.min).toBeGreaterThan(0);
        });

        it('should sample items based on priority', () => {
            // Add items with different priorities
            bag.put('low', 0.1);
            bag.put('medium', 0.5);
            bag.put('high', 0.9);
            bag.put('very_high', 1.0);

            // Sample multiple times and verify higher priority items are more likely
            const samples = [];
            for (let i = 0; i < 100; i++) {
                const sample = bag.sample();
                if (sample) samples.push(sample);
            }

            const highPrioritySamples = samples.filter(s => s === 'high' || s === 'very_high').length;
            const lowPrioritySamples = samples.filter(s => s === 'low').length;

            // Higher priority items should be sampled more frequently
            expect(highPrioritySamples).toBeGreaterThan(lowPrioritySamples);
        });

        it('should respect capacity limits', () => {
            // Fill beyond capacity
            for (let i = 0; i < 15; i++) {
                bag.put(`item${i}`, Math.random());
            }

            expect(bag.size()).toBeLessThanOrEqual(10);
        });

        it('should clear correctly', () => {
            bag.put('item1', 0.8);
            bag.put('item2', 0.5);
            expect(bag.size()).toBe(2);

            bag.clear();
            expect(bag.size()).toBe(0);
            expect(bag.isEmpty()).toBe(true);
        });
    });

    describe('Utility Functions', () => {
        beforeEach(() => {
            bag.put('item1', 0.8);
            bag.put('item2', 0.5);
            bag.put('item3', 0.9);
            bag.put('item4', 0.3);
        });

        it('should merge bags correctly', () => {
            const otherBag = new Bag(5);
            otherBag.put('item5', 0.7);
            otherBag.put('item6', 0.4);

            bag.merge(otherBag);
            expect(bag.size()).toBe(6);
        });

        it('should split bags based on predicate', () => {
            const otherBag = bag.split((item, priority) => priority > 0.6);

            expect(bag.size()).toBe(2); // Items with priority <= 0.6
            expect(otherBag.size()).toBe(2); // Items with priority > 0.6
        });

        it('should filter items correctly', () => {
            bag.filter((item, priority) => priority > 0.5);

            expect(bag.size()).toBe(2); // Only high priority items
            const stats = bag.getPriorityStats();
            expect(stats.min).toBeGreaterThan(0.5);
        });

        it('should get items by priority range', () => {
            const mediumPriorityItems = bag.getByPriorityRange(0.4, 0.7);

            expect(mediumPriorityItems).toContain('item2'); // 0.5
            expect(mediumPriorityItems).not.toContain('item1'); // 0.8 (too high)
            expect(mediumPriorityItems).not.toContain('item4'); // 0.3 (too low)
        });

        it('should sample multiple unique items', () => {
            const samples = bag.sampleMultipleUnique(3);

            expect(samples.length).toBe(3);
            expect(new Set(samples).size).toBe(3); // All unique
        });

        it('should convert to array correctly', () => {
            const array = bag.toArray();
            expect(Array.isArray(array)).toBe(true);
            expect(array.length).toBe(4);
        });

        it('should get priority statistics', () => {
            const stats = bag.getPriorityStats();

            expect(stats).toHaveProperty('min');
            expect(stats).toHaveProperty('max');
            expect(stats).toHaveProperty('average');
            expect(stats).toHaveProperty('count');
            expect(stats.count).toBe(4);
            expect(stats.min).toBe(0.3);
            expect(stats.max).toBe(0.9);
        });

        it('should check containment correctly', () => {
            expect(bag.contains('item1')).toBe(true);
            expect(bag.contains('nonexistent')).toBe(false);
        });

        it('should get item priority', () => {
            const priority = bag.getPriority('item1');
            expect(priority).toBe(0.8);

            const notFound = bag.getPriority('nonexistent');
            expect(notFound).toBeNull();
        });

        it('should update item priority', () => {
            const updated = bag.updatePriority('item1', 0.2);
            expect(updated).toBe(true);

            const newPriority = bag.getPriority('item1');
            expect(newPriority).toBe(0.2);
        });
    });

    describe('Statistical Sampling Properties', () => {
        it('should demonstrate fair priority-based sampling', () => {
            const testBag = new Bag(100);

            // Add items with significantly different priorities
            const highPriorityItems = ['A', 'B', 'C'];
            const lowPriorityItems = ['X', 'Y', 'Z'];

            highPriorityItems.forEach(item => testBag.put(item, 0.9));
            lowPriorityItems.forEach(item => testBag.put(item, 0.1));

            // Sample many times
            const samples = [];
            for (let i = 0; i < 1000; i++) {
                const sample = testBag.sample();
                if (sample) samples.push(sample);
            }

            const highPrioritySamples = samples.filter(s => highPriorityItems.includes(s)).length;
            const lowPrioritySamples = samples.filter(s => lowPriorityItems.includes(s)).length;

            // High priority items should be sampled much more frequently
            expect(highPrioritySamples).toBeGreaterThan(lowPrioritySamples * 3);
        });

        it('should maintain sampling distribution across different priority levels', () => {
            const testBag = new Bag(50);

            // Add items across priority spectrum
            testBag.put('very_low', 0.1);
            testBag.put('low', 0.3);
            testBag.put('medium', 0.5);
            testBag.put('high', 0.7);
            testBag.put('very_high', 0.9);

            const samples = [];
            for (let i = 0; i < 500; i++) {
                const sample = testBag.sample();
                if (sample) samples.push(sample);
            }

            // Count samples for each priority level
            const counts = {};
            samples.forEach(item => {
                counts[item] = (counts[item] || 0) + 1;
            });

            // Higher priority items should have higher sample counts
            expect(counts['very_high'] || 0).toBeGreaterThan(counts['very_low'] || 0);
            expect(counts['high'] || 0).toBeGreaterThan(counts['low'] || 0);
        });

        it('should handle edge case of single item', () => {
            bag.put('only_item', 0.5);

            for (let i = 0; i < 10; i++) {
                const sample = bag.sample();
                expect(sample).toBe('only_item');
            }
        });

        it('should handle edge case of zero capacity', () => {
            const zeroBag = new Bag(0);
            expect(zeroBag.capacity).toBe(0); // Verify capacity is set correctly

            zeroBag.put('item1', 0.8);

            expect(zeroBag.size()).toBe(0); // Should not store any items
            expect(zeroBag.sample()).toBeNull();
        });
    });

    describe('Performance Characteristics', () => {
        it('should handle large numbers of items efficiently', () => {
            const largeBag = new Bag(1000);

            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                largeBag.put(`item${i}`, Math.random());
            }
            const insertTime = performance.now() - startTime;

            expect(insertTime).toBeLessThan(100); // Should be fast

            const sampleStartTime = performance.now();
            for (let i = 0; i < 100; i++) {
                largeBag.sample();
            }
            const sampleTime = performance.now() - sampleStartTime;

            expect(sampleTime).toBeLessThan(50); // Sampling should be fast
        });
    });
});