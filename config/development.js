/**
 * Development configuration for SeNARS
 * This file contains development-specific settings
 */

export const devConfig = {
    // Port configurations
    ports: {
        defaultWebPort: 3000,
        defaultWsPort: 8081,
        minPort: 8000,
        maxPort: 9000
    },
    
    // Development-specific settings
    dev: {
        hotReload: true,
        debugMode: true,
        verboseLogging: true,
        componentReload: true
    },
    
    // API configurations for development
    api: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        basePath: '/api/v1'
    },
    
    // WebSocket configurations
    websocket: {
        heartbeatInterval: 30000, // 30 seconds
        reconnectAttempts: 5,
        reconnectDelay: 1000, // 1 second
        maxPayloadSize: '10MB'
    },
    
    // UI-specific development settings
    ui: {
        theme: 'auto',
        animations: true,
        debugOverlay: false,
        performanceMonitor: true
    }
};

export default devConfig;