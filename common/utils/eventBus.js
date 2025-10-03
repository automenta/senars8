import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.listeners = new Map();
    this.addListener = this.on;
    this.removeListener = this.off;
  }

  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new WeakSet());
    }

    if (this.listeners.get(eventName).has(listener)) {
      console.warn(`Duplicate listener for event "${eventName}" detected.`);
      return this;
    }

    this.listeners.get(eventName).add(listener);
    super.on(eventName, listener);
    return this;
  }

  off(eventName, listener) {
    if (this.listeners.has(eventName)) {
        this.listeners.get(eventName).delete(listener);
    }
    super.off(eventName, listener);
    return this;
  }
}

export { EventBus };
export const eventBus = new EventBus();