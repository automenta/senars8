export default {
    LM_HYPOTHESIS_CONFIGS: [
        {type: 'general', num: 2},
        {type: 'creative', num: 1},
        {type: 'sophisticated', num: 1}
    ],
    FEATURE_EXTRACTION_MODEL: 'Xenova/all-MiniLM-L6-v2',
    TEXT_GENERATION_MODEL: 'Xenova/distilgpt2',
    QA_MODEL: 'Xenova/distilbert-base-uncased-distilled-squad',
    EMBEDDING_BATCH_SIZE: 10,
    EMBEDDING_BATCH_DELAY_MS: 100
};
