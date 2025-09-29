/**
 * EventSystem provides a flexible event-driven architecture for extensibility
 */
class EventSystem {
  constructor() {
    this.listeners = new Map(); // event -> [callbacks]
    this.middleware = new Map(); // event -> [middleware functions]
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to execute when event occurs
   * @param {Object} options - Options like priority
   * @returns {Function} - Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const listener = {
      callback,
      priority: options.priority || 0,
      once: options.once || false
    };
    
    this.listeners.get(event).push(listener);
    
    // Sort by priority (higher priority first)
    this.listeners.get(event).sort((a, b) => b.priority - a.priority);
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    return this.on(event, callback, { once: true });
  }

  /**
   * Remove a listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.callback === callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   * @returns {Promise<boolean>} - Whether the event was handled
   */
  async emit(event, ...args) {
    if (!this.listeners.has(event)) return false;
    
    const listeners = [...this.listeners.get(event)]; // Create a copy to avoid modification during iteration
    const results = [];
    
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      try {
        const result = await Promise.resolve(listener.callback(...args));
        results.push(result);
        
        if (listener.once) {
          // Remove the listener after it's executed once
          this.off(event, listener.callback);
        }
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
        results.push(null); // Continue with other listeners even if one fails
      }
    }
    
    return results.length > 0;
  }

  /**
   * Clear all listeners for an event or all events
   * @param {string} [event] - Optional event name, if omitted clears all events
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} - Number of listeners
   */
  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Add middleware for an event
   * @param {string} event - Event name
   * @param {Function} middleware - Middleware function
   */
  use(event, middleware) {
    if (!this.middleware.has(event)) {
      this.middleware.set(event, []);
    }
    this.middleware.get(event).push(middleware);
  }
}

export default EventSystem;