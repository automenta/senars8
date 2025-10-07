class Component {
  constructor(name, core) {
    this.name = name;
    this.core = core;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Set up handlers during initialization
    if (typeof this.setupHandlers === 'function') {
      this.setupHandlers();
    }
    
    this.initialized = true;
  }

  async start() {
    // Run custom start logic if provided
    if (typeof this.onStart === 'function') {
      await this.onStart();
    }
  }

  async stop() {
    // Run custom stop logic if provided
    if (typeof this.onStop === 'function') {
      await this.onStop();
    }
  }

  // Helper methods using core
  emit(event, data) {
    return this.core.emit(event, data);
  }

  request(command, data) {
    return this.core.request(command, data);
  }
}

export default Component;