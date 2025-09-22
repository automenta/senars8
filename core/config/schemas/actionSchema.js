export default {
    // Action Executor settings
    ACTION_EXECUTOR: {
        type: 'object',
        properties: {
            RESOURCES: {
                type: 'array'
            },
            CONSTRAINTS: {
                type: 'object'
            }
        },
        default: {
            RESOURCES: [{
                name: 'cpu',
                total: 100,
                unit: 'percent'
            }, {
                name: 'memory',
                total: 8192,
                unit: 'MB'
            }, {
                name: 'network',
                total: 1000,
                unit: 'Mbps'
            }],
            CONSTRAINTS: {
                resource_limit: {
                    type: 'function'
                },
                safety: {
                    type: 'function'
                }
            }
        }
    }
};