class Messages {
  constructor() {
    this.events = new Map();    // Event listeners
    this.commands = new Map();  // Command handlers
    this.middleware = [];
    this.eventQueue = [];
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  async _applyMiddleware(type, data, next) {
    let index = 0;
    
    const dispatch = async (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      
      let fn = this.middleware[i];
      if (i === this.middleware.length) fn = next;
      
      if (!fn) return data;
      
      return await fn(type, data, () => dispatch(i + 1));
    };
    
    return await dispatch(0);
  }

  // Event methods
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  async emit(event, data) {
    // Add to internal queue for potential processing
    this.eventQueue.push({ event, data, timestamp: Date.now() });
    
    if (this.eventQueue.length > 1000) {
      this.eventQueue = this.eventQueue.slice(-500); // Keep last 500
    }
    
    const listeners = this.events.get(event);
    if (!listeners) return;

    const processedData = await this._applyMiddleware('event', data, async (d) => d);

    const promises = [];
    for (const callback of listeners) {
      promises.push(
        (async () => {
          try {
            await callback(processedData);
          } catch (e) {
            console.error(`Error in event listener for ${event}:`, e);
          }
        })()
      );
    }
    
    await Promise.all(promises);
  }

  // Command methods
  handle(command, handler) {
    this.commands.set(command, handler);
  }

  async request(command, data) {
    const handler = this.commands.get(command);
    if (!handler) {
      console.warn(`No handler registered for command: ${command}`);
      return null;
    }

    try {
      const processedData = await this._applyMiddleware('command', data, async (d) => d);
      return await handler(processedData);
    } catch (error) {
      console.error(`Error handling command ${command}:`, error);
      return null;
    }
  }

  off(event, callback) {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) listeners.splice(index, 1);
      if (listeners.length === 0) this.events.delete(event);
    }
  }

  clear() {
    this.events.clear();
    this.commands.clear();
    this.middleware = [];
    this.eventQueue = [];
  }
}

export { Messages };