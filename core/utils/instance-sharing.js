/**
 * @fileoverview Shared utilities for instance sharing across the system
 */

import config from '../config/index.js';
import InstanceManager from './InstanceManager.js';

/**
 * Creates a shared instance using the InstanceManager if enabled
 * @template T
 * @param {string} key - The unique key for the instance
 * @param {Function} constructor - Function to create new instance if not in cache
 * @param  {...any} args - Arguments to pass to constructor
 * @returns {T|null} The shared instance or null if creation failed
 */
export function createSharedInstance(key, constructor, ...args) {
    if (config.performance.ENABLE_INSTANCE_SHARING && InstanceManager.has(key)) {
        return InstanceManager.get(key);
    }

    try {
        const instance = new constructor(...args);
        if (config.performance.ENABLE_INSTANCE_SHARING) {
            InstanceManager.add(key, instance);
        }
        return instance;
    } catch {
        return null;
    }
}