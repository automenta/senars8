const { handleError } = require('../utils/error-handler');
const { error, debug } = require('../utils/logger');

class ExplanationGenerator {
    constructor(generateFunction) {
        this._generate = generateFunction;
    }

    async explain(termKey, config = {}) {
        const {type = 'simple', context = null, promptTemplate = null} = config;
        if (!promptTemplate && (!termKey || typeof termKey !== 'string')) {
            return {error: "Cannot explain an empty term."};
        }

        debug(`Explaining term: ${termKey} with type: ${type}`);
        const finalPrompt = promptTemplate ? promptTemplate : this._getExplanationPrompt(termKey, config);
        const fullPrompt = context ? `Context: ${context}\n${finalPrompt}` : finalPrompt;

        try {
            const explanationText = await this._generate(fullPrompt, {max_new_tokens: 300});
            if (!explanationText) {
                error('Explanation generation failed');
                return {error: `Explanation generation failed.`};
            }
            debug('Explanation generated successfully');
            return {term: termKey, explanation: explanationText};
        } catch (err) {
            error('Error generating explanation:', err);
            return {error: `Failed to generate explanation: ${err.message}`};
        }
    }

    _getExplanationPrompt(termKey, {type, relatedTerms = [], audience = 'intermediate'}) {
        debug(`Getting explanation prompt for: ${termKey}`);
        const prompts = {
            simple: `Explain what "${termKey}" means.`,
            structured: `Provide a structured explanation of "${termKey}" with Definition, Key Components, and Examples.`,
            comparison: `Explain "${termKey}" by comparing it with: ${relatedTerms.join(', ')}.`,
        }
        return prompts[type] || prompts.simple;
    }
}

module.exports = ExplanationGenerator;
