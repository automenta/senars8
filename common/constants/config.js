/**
 * Shared, unified configuration constants for the entire Senars project.
 * This file serves as the single source of truth for default settings.
 */
export const CONFIG = {
    // --- Connection Settings ---
    CONNECTION: {
        WEBSOCKET_URL: 'ws://localhost:8080',
        CRDT_WEBSOCKET_URL: 'ws://localhost:8080/crdt',
        RECONNECT_DELAY: 3000,
        MAX_RECONNECT_ATTEMPTS: 10,
        MAX_RECONNECT_DELAY: 30000,
        MESSAGE_TIMEOUT: 15000,
    },

    // --- Core NARS Settings ---
    CORE: {
        CYCLE_DELAY_MS: 50,
        FOCUS_SET_SIZE: 20,
        META_TASK_PRIORITY: 0.9,
        ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1,
        MAX_GOALS_TO_EXECUTE: 3,
        RECENCY_DECAY_FACTOR: 10000,
        SIMILARITY_OFFSET: 0.1,
        SIMILARITY_SCALE: 1.1,
        DEFAULT_TRUTH_VALUE: {
            frequency: 1.0,
            confidence: 0.9
        },
    },

    // --- Language Model (LM) Settings ---
    LM: {
        LLM_PROVIDER: 'xenova',
        OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
        FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
        TEXT_GENERATION_MODEL: 'Xenova/distilgpt2',
        QA_MODEL: 'Xenova/distilbert-base-uncased-distilled-squad',
        EMBEDDING_BATCH_SIZE: 10,
        EMBEDDING_BATCH_DELAY_MS: 100,
        EMBEDDING_MAX_CONCURRENCY: 4,
        HYPOTHESIS_CONFIGS: [
            { type: 'general', num: 2 },
            { type: 'creative', num: 1 },
            { type: 'sophisticated', num: 1 }
        ],
    },

    // --- Memory Settings ---
    MEMORY: {
        FORGETTING_STRATEGY_NAME: 'TimeBased',
        FORGETTING_STRATEGY_OPTIONS: {
            shortTerm: {
                expirationThreshold: BigInt(24) * BigInt(3600 * 1000), // 1 day
                importanceThresholds: { priority: 0.7, confidence: 0.7 }
            },
            longTerm: {
                expirationThreshold: BigInt(30) * BigInt(24) * BigInt(3600 * 1000), // 30 days
                importanceThresholds: { priority: 0.8, confidence: 0.8 }
            }
        },
        MAINTENANCE_CYCLE_FREQUENCY: 10,
        CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
        CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9,
    },

    // --- Reasoner Settings ---
    REASONER: {
        STRATEGY: 'BagSampling',
    },

    // --- Planner Settings ---
    PLANNER: {
        STRATEGY: 'HTN',
        MAX_DEPTH: 10,
        CONFIG: {
            heuristicWeights: {
                complexity: 0.4,
                confidence: 0.3,
                semantic: 0.3
            }
        }
    },

    // --- Web UI Settings ---
    UI: {
        MAX_MESSAGE_HISTORY: 50,
        MAX_NOTIFICATIONS: 100,
        DEFAULT_NOTIFICATION_DURATION: 5000,
        LAYOUT_STORAGE_KEY: 'senars-ide-layout',
    },

    // --- Terminal UI (TUI) Settings ---
    TUI: {
        UPDATE_INTERVAL: 1000,
        ENABLE_COLOR: true,
        ENABLE_LOGGING: true,
    },

    // --- Agent Server Settings ---
    AGENT: {
        DEFAULT_PORT: 8080,
        MAX_CONNECTIONS: 100,
    },
};