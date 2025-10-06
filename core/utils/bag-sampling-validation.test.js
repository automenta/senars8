import { describe, it, expect } from 'vitest';
import Bag from './bag.js';

describe('Bag Sampling Distribution Validation', () => {
    describe('Fair Priority-Based Sampling', () => {
        it('should demonstrate statistical fairness across priority levels', () => {
            const bag = new Bag(100);

            // Add items with evenly distributed priorities
            const priorityLevels = [0.1, 0.3, 0.5, 0.7, 0.9];
            const itemsPerLevel = 20;

            const expectedCounts = {};
            const itemGroups = {};

            priorityLevels.forEach((priority, index) => {
                const groupName = `group_${index}`;
                itemGroups[groupName] = [];
                expectedCounts[groupName] = 0;

                for (let i = 0; i < itemsPerLevel; i++) {
                    const item = `${groupName}_item_${i}`;
                    itemGroups[groupName].push(item);
                    bag.put(item, priority);
                    expectedCounts[groupName] += priority * 1000; // Scale for sampling
                }
            });

            // Sample many times to get statistical distribution
            const samples = [];
            const sampleSize = 5000;

            for (let i = 0; i < sampleSize; i++) {
                const sample = bag.sample();
                if (sample) samples.push(sample);
            }

            // Count samples per group
            const actualCounts = {};
            priorityLevels.forEach((_, index) => {
                const groupName = `group_${index}`;
                actualCounts[groupName] = samples.filter(s => s.startsWith(groupName)).length;
            });

            // Calculate expected vs actual ratios
            const totalExpected = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
            const totalActual = Object.values(actualCounts).reduce((sum, count) => sum + count, 0);

            // Verify that higher priority groups get more samples
            for (let i = 1; i < priorityLevels.length; i++) {
                const lowerGroup = `group_${i-1}`;
                const higherGroup = `group_${i}`;

                const lowerRatio = actualCounts[lowerGroup] / expectedCounts[lowerGroup];
                const higherRatio = actualCounts[higherGroup] / expectedCounts[higherGroup];

                // Higher priority groups should have higher sampling ratios
                expect(higherRatio).toBeGreaterThan(lowerRatio * 0.8); // Allow some variance
            }

            // Verify overall fairness - no group should be completely starved
            Object.values(actualCounts).forEach(count => {
                expect(count).toBeGreaterThan(sampleSize * 0.02); // At least 2% of samples
            });
        });

        it('should maintain consistent sampling ratios over time', () => {
            const bag = new Bag(50);

            // Add items with known priority distribution
            bag.put('low_priority', 0.1);
            bag.put('medium_priority', 0.5);
            bag.put('high_priority', 0.9);

            const sampleRuns = 10;
            const samplesPerRun = 100;
            const ratios = [];

            for (let run = 0; run < sampleRuns; run++) {
                const runSamples = [];
                for (let i = 0; i < samplesPerRun; i++) {
                    const sample = bag.sample();
                    if (sample) runSamples.push(sample);
                }

                const highCount = runSamples.filter(s => s === 'high_priority').length;
                const mediumCount = runSamples.filter(s => s === 'medium_priority').length;
                const lowCount = runSamples.filter(s => s === 'low_priority').length;

                const highRatio = highCount / samplesPerRun;
                const mediumRatio = mediumCount / samplesPerRun;
                const lowRatio = lowCount / samplesPerRun;

                ratios.push({highRatio, mediumRatio, lowRatio});

                // Clear bag and refill for next run
                bag.clear();
                bag.put('low_priority', 0.1);
                bag.put('medium_priority', 0.5);
                bag.put('high_priority', 0.9);
            }

            // Calculate average ratios
            const avgHighRatio = ratios.reduce((sum, r) => sum + r.highRatio, 0) / ratios.length;
            const avgMediumRatio = ratios.reduce((sum, r) => sum + r.mediumRatio, 0) / ratios.length;
            const avgLowRatio = ratios.reduce((sum, r) => sum + r.lowRatio, 0) / ratios.length;

            // Verify expected relationships
            expect(avgHighRatio).toBeGreaterThan(avgMediumRatio);
            expect(avgMediumRatio).toBeGreaterThan(avgLowRatio);

            // Verify consistency (low variance between runs)
            const highVariance = calculateVariance(ratios.map(r => r.highRatio));
            const mediumVariance = calculateVariance(ratios.map(r => r.mediumRatio));
            const lowVariance = calculateVariance(ratios.map(r => r.lowRatio));

            expect(highVariance).toBeLessThan(0.01); // Low variance indicates consistency
            expect(mediumVariance).toBeLessThan(0.01);
            expect(lowVariance).toBeLessThan(0.01);
        });

        it('should handle dynamic priority updates correctly', () => {
            const bag = new Bag(20);

            // Initial setup
            bag.put('item1', 0.3);
            bag.put('item2', 0.7);
            bag.put('item3', 0.5);

            // Sample to establish baseline
            const baselineSamples = [];
            for (let i = 0; i < 300; i++) {
                const sample = bag.sample();
                if (sample) baselineSamples.push(sample);
            }

            const baselineHighCount = baselineSamples.filter(s => s === 'item2').length;

            // Update priority of item2 (originally 0.7, now 0.2)
            bag.updatePriority('item2', 0.2);

            // Sample after priority update
            const updatedSamples = [];
            for (let i = 0; i < 300; i++) {
                const sample = bag.sample();
                if (sample) updatedSamples.push(sample);
            }

            const updatedHighCount = updatedSamples.filter(s => s === 'item2').length;

            // After priority reduction, item2 should be sampled less frequently
            expect(updatedHighCount).toBeLessThan(baselineHighCount);
        });

        it('should demonstrate proper statistical distribution with many priority levels', () => {
            const bag = new Bag(100);

            // Create 10 priority levels from 0.1 to 1.0
            const priorityLevels = Array.from({length: 10}, (_, i) => (i + 1) * 0.1);
            const itemsPerLevel = 10;

            // Add items for each priority level
            priorityLevels.forEach((priority, levelIndex) => {
                for (let i = 0; i < itemsPerLevel; i++) {
                    bag.put(`level_${levelIndex}_item_${i}`, priority);
                }
            });

            // Sample extensively
            const samples = [];
            for (let i = 0; i < 2000; i++) {
                const sample = bag.sample();
                if (sample) samples.push(sample);
            }

            // Analyze distribution by priority level
            const levelCounts = {};
            priorityLevels.forEach((_, levelIndex) => {
                levelCounts[levelIndex] = samples.filter(s => s.startsWith(`level_${levelIndex}_`)).length;
            });

            // Higher priority levels should have more samples
            for (let i = 1; i < priorityLevels.length; i++) {
                expect(levelCounts[i]).toBeGreaterThanOrEqual(levelCounts[i-1] * 0.7); // Allow some variance
            }

            // Verify that all levels get some samples (no starvation)
            Object.values(levelCounts).forEach(count => {
                expect(count).toBeGreaterThan(10); // Each level should get at least some samples
            });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        it('should handle single item priority changes correctly', () => {
            const bag = new Bag(10);

            bag.put('single_item', 0.5);

            // Should always sample the same item
            for (let i = 0; i < 50; i++) {
                expect(bag.sample()).toBe('single_item');
            }

            // Update priority
            bag.updatePriority('single_item', 0.8);

            // Should still sample the same item
            for (let i = 0; i < 50; i++) {
                expect(bag.sample()).toBe('single_item');
            }
        });

        it('should handle capacity exactly at limit', () => {
            const bag = new Bag(3);

            bag.put('item1', 0.8);
            bag.put('item2', 0.6);
            bag.put('item3', 0.4);

            expect(bag.size()).toBe(3);

            // Adding lower priority item should not increase size
            bag.put('item4', 0.2);
            expect(bag.size()).toBe(3);

            // Adding higher priority item should replace lowest
            bag.put('item5', 0.9);
            expect(bag.size()).toBe(3);

            const items = bag.toArray();
            expect(items).toContain('item5'); // Should contain the high priority item
            expect(items).not.toContain('item3'); // Should not contain the lowest priority item
        });

        it('should handle floating point precision in priority calculations', () => {
            const bag = new Bag(10);

            // Add items with very close priorities
            bag.put('item1', 0.5000000001);
            bag.put('item2', 0.5000000002);
            bag.put('item3', 0.5000000003);

            const samples = [];
            for (let i = 0; i < 300; i++) {
                const sample = bag.sample();
                if (sample) samples.push(sample);
            }

            // All items should be sampled (no precision issues)
            const uniqueSamples = new Set(samples);
            expect(uniqueSamples.size).toBe(3);
        });
    });

    describe('Performance Validation', () => {
        it('should maintain performance with large numbers of items', () => {
            const bag = new Bag(1000);

            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                bag.put(`item${i}`, Math.random());
            }
            const insertTime = performance.now() - startTime;

            expect(insertTime).toBeLessThan(100); // Should be fast

            const sampleStartTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                bag.sample();
            }
            const sampleTime = performance.now() - sampleStartTime;

            expect(sampleTime).toBeLessThan(100); // Sampling should be fast
        });

        it('should handle rapid priority updates efficiently', () => {
            const bag = new Bag(100);

            // Fill bag
            for (let i = 0; i < 100; i++) {
                bag.put(`item${i}`, Math.random());
            }

            const startTime = performance.now();
            for (let i = 0; i < 50; i++) {
                bag.updatePriority(`item${i}`, Math.random());
            }
            const updateTime = performance.now() - startTime;

            expect(updateTime).toBeLessThan(50); // Updates should be fast
        });
    });
});

// Helper function to calculate variance
function calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}