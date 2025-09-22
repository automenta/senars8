export default {
    // System settings
    system: {
        type: 'object',
        properties: {
            BATCH_SIZE: {
                type: 'number',
                min: 1,
                max: 1000,
                default: 10
            },
            CONFIDENCE_REDUCTION_FACTOR: {
                type: 'number',
                min: 0,
                max: 1,
                default: 0.1
            }
        },
        default: {
            BATCH_SIZE: 10,
            CONFIDENCE_REDUCTION_FACTOR: 0.1
        }
    },

    // Language Model (LM) settings
    LM: {
        type: 'object',
        properties: {
            LLM_PROVIDER: {
                type: 'string',
                enum: ['xenova', 'ollama'],
                default: 'ollama'
            },
            OLLAMA_BASE_URL: {
                type: 'string',
                pattern: /^https?:\/\/.+/,
                default: 'http://127.0.0.1:11434'
            },
            FEATURE_EXTRACTION_MODEL: {
                type: 'string',
                default: 'Xenova/all-MiniLM-L6-v2'
            },
            TEXT_GENERATION_MODEL: {
                type: 'string',
                default: 'Xenova/distilgpt2'
            },
            QA_MODEL: {
                type: 'string',
                default: 'Xenova/distilbert-base-uncased-distilled-squad'
            },
            EMBEDDING_BATCH_SIZE: {
                type: 'number',
                min: 1,
                max: 100,
                default: 10
            },
            EMBEDDING_BATCH_DELAY_MS: {
                type: 'number',
                min: 0,
                max: 10000,
                default: 100
            }
        },
        default: {
            LLM_PROVIDER: 'ollama',
            OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
            FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
            TEXT_GENERATION_MODEL: 'Xenova/distilgpt2',
            QA_MODEL: 'Xenova/distilbert-base-uncased-distilled-squad',
            EMBEDDING_BATCH_SIZE: 10,
            EMBEDDING_BATCH_DELAY_MS: 100
        }
    }
};