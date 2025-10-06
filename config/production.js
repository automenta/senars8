/**
 * Production configuration for SeNARS
 * This file contains production-specific settings
 */

export const prodConfig = {
    // Port configurations
    ports: {
        defaultWebPort: 80,
        defaultWsPort: 8080,
        minPort: 8000,
        maxPort: 9000
    },
    
    // Production-specific settings
    prod: {
        hotReload: false,
        debugMode: false,
        verboseLogging: false,
        componentReload: false
    },
    
    // API configurations for production
    api: {
        timeout: 10000, // 10 seconds
        retryAttempts: 2,
        basePath: '/api/v1'
    },
    
    // WebSocket configurations
    websocket: {
        heartbeatInterval: 45000, // 45 seconds
        reconnectAttempts: 3,
        reconnectDelay: 2000, // 2 seconds
        maxPayloadSize: '5MB'
    },
    
    // UI-specific production settings
    ui: {
        theme: 'dark',
        animations: true,
        debugOverlay: false,
        performanceMonitor: false
    }
};

export default prodConfig;