import Component from './Component.js';

class Plugins extends Component {
    constructor(core) {
        super('plugins', core);
        this.plugins = new Map();
        this.instances = new Map();
        this.metadata = new Map();
    }

    register(pluginName, pluginFactory, metadata = {}) {
        this.plugins.set(pluginName, pluginFactory);
        this.metadata.set(pluginName, {
            ...metadata,
            registeredAt: Date.now()
        });
    }

    async load(pluginName) {
        const factory = this.plugins.get(pluginName);
        if (!factory) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        try {
            const plugin = await factory(this.core);
            this.instances.set(pluginName, plugin);
            this.core.register(pluginName, plugin);

            if (typeof plugin.initialize === 'function') {
                await plugin.initialize();
            }

            const meta = this.metadata.get(pluginName) || {};
            meta.loadedAt = Date.now();
            meta.status = 'active';
            this.metadata.set(pluginName, meta);

            this.core.emit('plugin:loaded', {
                name: pluginName,
                metadata: meta
            });

            return plugin;
        } catch (error) {
            console.error(`Failed to load plugin ${pluginName}:`, error);
            const meta = this.metadata.get(pluginName) || {};
            meta.status = 'error';
            meta.error = error.message;
            this.metadata.set(pluginName, meta);
            throw error;
        }
    }

    async unload(pluginName) {
        const plugin = this.instances.get(pluginName);
        if (plugin) {
            if (typeof plugin.stop === 'function') {
                await plugin.stop();
            }

            this.core.components.delete(pluginName);
            this.instances.delete(pluginName);

            const meta = this.metadata.get(pluginName) || {};
            meta.unloadedAt = Date.now();
            meta.status = 'unloaded';
            this.metadata.set(pluginName, meta);

            this.core.emit('plugin:unloaded', {name: pluginName});
        }
    }

    async reload(pluginName) {
        await this.unload(pluginName);
        return await this.load(pluginName);
    }

    getStatus(pluginName = null) {
        if (pluginName) {
            return {
                name: pluginName,
                loaded: this.instances.has(pluginName),
                metadata: this.metadata.get(pluginName) || null
            };
        }

        return Array.from(this.plugins.keys()).map(name => ({
            name,
            loaded: this.instances.has(name),
            metadata: this.metadata.get(name) || null
        }));
    }

    list() {
        return Array.from(this.plugins.keys());
    }

    async hotReloadAll() {
        const results = {};

        for (const [name, plugin] of this.instances) {
            try {
                await this.reload(name);
                results[name] = {status: 'success'};
            } catch (error) {
                results[name] = {status: 'error', error: error.message};
            }
        }

        return results;
    }
}

export default Plugins;