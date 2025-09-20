import {debug, error} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/common.js';

const errorHandler = createModuleErrorHandler('ExplanationGenerator');

class ExplanationGenerator {
    constructor(generateFunction) {
        this._generate = generateFunction;
    }

    async explain(termKey, config = {}) {
        const {type = 'simple', context = null, promptTemplate = null} = config;
        if (!promptTemplate && !termKey) {
            return {error: 'Cannot explain an empty term.'};
        }

        debug(`Explaining term: ${termKey} with type: ${type}`);
        const finalPrompt = promptTemplate || this._getExplanationPrompt(termKey, config);
        const fullPrompt = context ? `Context: ${context}\n${finalPrompt}` : finalPrompt;

        return errorHandler.safeAsync(async () => {
            const explanationText = await this._generate(fullPrompt, {max_new_tokens: 300});
            if (!explanationText) {
                error('Explanation generation failed');
                return {error: 'Explanation generation failed.'};
            }
            debug('Explanation generated successfully');
            return {term: termKey, explanation: explanationText};
        }, 'explain', {error: 'Failed to generate explanation'});
    }

    _getExplanationPrompt(termKey, {type, relatedTerms = []}) {
        const prompts = {
            simple: `Explain what "${termKey}" means.`,
            structured: `Provide a structured explanation of "${termKey}" with Definition, Key Components, and Examples.`,
            comparison: `Explain "${termKey}" by comparing it with: ${relatedTerms.join(', ')}.`,
        };
        return prompts[type] || prompts.simple;
    }
}

export default ExplanationGenerator;
