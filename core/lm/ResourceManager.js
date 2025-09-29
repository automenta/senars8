/**
 * ResourceManager handles resource allocation and deallocation
 */
class ResourceManager {
  constructor(initialResources = []) {
    this.resources = new Map();
    
    // Initialize with provided resources
    for (const resource of initialResources) {
      this.resources.set(resource.name, {
        ...resource,
        available: resource.total,
        reserved: 0
      });
    }
  }

  async checkAvailability(requirements = {}) {
    for (const [resourceName, requiredAmount] of Object.entries(requirements)) {
      const resource = this.resources.get(resourceName);
      
      if (!resource) {
        console.warn(`Resource ${resourceName} not managed by ResourceManager`);
        continue;
      }

      if (resource.available < requiredAmount) {
        return false;
      }
    }
    
    return true;
  }

  async reserve(requirements = {}) {
    for (const [resourceName, amount] of Object.entries(requirements)) {
      const resource = this.resources.get(resourceName);
      if (resource && resource.available >= amount) {
        resource.available -= amount;
        resource.reserved += amount;
      }
    }
  }

  async release(requirements = {}) {
    for (const [resourceName, amount] of Object.entries(requirements)) {
      const resource = this.resources.get(resourceName);
      if (resource && resource.reserved >= amount) {
        resource.available += amount;
        resource.reserved -= amount;
      }
    }
  }

  getAvailableResources() {
    return Array.from(this.resources.values()).map(r => ({
      name: r.name,
      available: r.available,
      total: r.total,
      unit: r.unit
    }));
  }
  
  getResources() {
    return Array.from(this.resources.values());
  }
}

export default ResourceManager;