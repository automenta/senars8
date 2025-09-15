export default {
    RESOURCES: [
        {name: 'cpu', total: 100, unit: 'percent'},
        {name: 'memory', total: 8192, unit: 'MB'},
        {name: 'network', total: 1000, unit: 'Mbps'}
    ],
    CONSTRAINTS: {
        resource_limit(action) {
            if (!action.resource_requirements) {
                return true;
            }
            for (const req of action.resource_requirements) {
                const resource = this.resources.get(req.name);
                if (!resource) {
                    return false; // Fails if resource is not registered
                }
                const currentlyReserved = resource.reservations.reduce((acc, res) => acc + res.amount, 0);
                if (currentlyReserved + req.amount > resource.total) {
                    return false; // Fails if resource is over-allocated
                }
            }
            return true;
        },
        safety(action) {
            const dangerousActions = ['delete_system', 'format_disk', 'shutdown_system'];
            return !dangerousActions.includes(action.name);
        }
    }
};
