import {afterEach, beforeEach, describe, it} from 'vitest';
import {expect} from 'chai';
import TemporalCache from '../../core/reasoner/temporal/TemporalCache.js';
import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

describe('TemporalCache', () => {
    let cache;

    beforeEach(() => {
        cache = new TemporalCache(10, 1000); // Small cache with 1 second TTL
    });

    afterEach(() => {
        cache.clear();
    });

    it('should initialize with correct defaults', () => {
        expect(cache.cache).toBeInstanceOf(Map);
        expect(cache.accessTimes).toBeInstanceOf(Map);
        expect(cache.hitCount).toBe(0);
        expect(cache.missCount).toBe(0);
        expect(cache.maxEntries).toBe(10);
        expect(cache.ttl).toBe(1000);
    });

    it('should cache and retrieve values', () => {
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];
        const value = ['test_result'];

        // Set a value
        const setResult = cache.set('TestModule', tasks, value);
        expect(setResult).toBe(true);

        // Retrieve the value
        const retrievedValue = cache.get('TestModule', tasks);
        expect(retrievedValue).toEqual(value);
        expect(cache.hitCount).toBe(1);
        expect(cache.missCount).toBe(0);
    });

    it('should return null for non-existent keys', () => {
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];

        const retrievedValue = cache.get('TestModule', tasks);
        expect(retrievedValue).toBeNull();
        expect(cache.hitCount).toBe(0);
        expect(cache.missCount).toBe(1);
    });

    it('should handle expired entries', async () => {
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];
        const value = ['test_result'];

        // Set a value
        cache.set('TestModule', tasks, value);
        expect(cache.get('TestModule', tasks)).toEqual(value);

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Entry should be expired and removed, resulting in a miss
        const retrievedValue = cache.get('TestModule', tasks);
        expect(retrievedValue).toBeNull();

        // After the initial hit, there should be one more miss when trying to retrieve the expired value
        expect(cache.missCount).toBe(1);
    });

    it('should evict old entries when capacity is reached', () => {
        // Fill up cache to max capacity
        for (let i = 0; i < 10; i++) {
            const tasks = [new Task(parseTerm(`A${i}`), '.', {frequency: 1, confidence: 0.9})];
            cache.set('TestModule', tasks, [`result${i}`]);
        }

        // Cache should be at max capacity
        expect(cache.cache.size).toBe(10);

        // Add one more entry - should trigger eviction
        const newTasks = [new Task(parseTerm('B'), '.', {frequency: 1, confidence: 0.9})];
        cache.set('TestModule', newTasks, ['new_result']);

        // Cache size should still be within bounds after eviction
        expect(cache.cache.size).toBeLessThanOrEqual(10);
    });

    it('should generate consistent cache keys', () => {
        const tasks1 = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];
        const tasks2 = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];

        // Create keys for the same tasks
        const key1 = cache._generateKey('TestModule', tasks1);
        const key2 = cache._generateKey('TestModule', tasks2);

        // Keys should be the same for identical tasks
        expect(key1).toBe(key2);
    });

    it('should return cache statistics', () => {
        const stats = cache.getStats();
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('hitCount');
        expect(stats).toHaveProperty('missCount');
        expect(stats).toHaveProperty('totalRequests');
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('effectiveness');
    });

    it('should preload values into cache', () => {
        const tasks = [new Task(parseTerm('A'), '.', {frequency: 1, confidence: 0.9})];
        const predictedValue = ['predicted'];

        // Preload a value
        const preloaded = cache.preload('TestModule', tasks, predictedValue);
        expect(preloaded).toBe(true);

        // Should be able to retrieve it
        const retrieved = cache.get('TestModule', tasks);
        expect(retrieved).toEqual(predictedValue);
    });

    it('should have methods for cache management', () => {
        expect(cache.clear).toBeInstanceOf(Function);
        expect(cache.cleanup).toBeInstanceOf(Function);
        expect(cache.getStats).toBeInstanceOf(Function);
    });
});