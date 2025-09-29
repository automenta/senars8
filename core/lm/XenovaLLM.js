import {LLM} from '@langchain/core/language_models/llms';

class XenovaLLM extends LLM {
    constructor(pipeline, options = {}) {
        super(options);
        this.pipeline = pipeline;
        this.options = options;
    }

    async _call(prompt, options) {
        const generationOptions = {
            max_new_tokens: 100,
            ...this.options,
            ...options
        };

        const result = await this.pipeline(prompt, generationOptions);
        return result?.[0]?.generated_text.replace(prompt, '').trim() || '';
    }

    _llmType() {
        return 'xenova';
    }
}

export default XenovaLLM;
