export default {
    performance: {
        type: 'object',
        required: false,
        default: {
            ENABLE_INSTANCE_SHARING: false,
        },
        properties: {
            ENABLE_INSTANCE_SHARING: {
                type: 'boolean',
                required: false,
                default: false,
                description: 'Enables or disables the caching of Term and Task instances to reduce memory usage.'
            }
        }
    }
};