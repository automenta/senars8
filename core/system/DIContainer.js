class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    register(name, definition, dependencies = []) {
        this.services.set(name, { definition, dependencies, isValue: false });
    }

    registerValue(name, value) {
        this.services.set(name, { definition: value, dependencies: [], isValue: true });
    }

    singleton(name, definition, dependencies = []) {
        this.services.set(name, { definition, dependencies, singleton: true, isValue: false });
    }

    get(name) {
        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service not found: ${name}`);
        }

        if (service.isValue) {
            return service.definition;
        }

        if (service.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        const { definition, dependencies } = service;
        const resolvedDependencies = dependencies.map(dep => this.get(dep));
        const instance = new definition(...resolvedDependencies);

        if (service.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }
}

export default new DIContainer();
