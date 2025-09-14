import {handleErrorWithDefault} from '../utils/error-handler.js';
import {error, debug} from '../utils/logger.js';

class QAService {
    constructor(generateFunction, getQAPipelineFunction) {
        this._generate = generateFunction;
        this._getQAPipeline = getQAPipelineFunction;
    }

    async answerQuestion(question, context = null) {
        if (!question || typeof question !== 'string') {
            return "Cannot answer an empty question.";
        }

        try {
            debug(`Answering question: ${question.substring(0, 50)}...`);
            if (context) {
                const qaPipeline = await this._getQAPipeline();
                const result = await qaPipeline(question, context);
                if (result && result.answer) {
                    debug('Question answered using QA pipeline');
                    return result.answer;
                }
            }

            const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
            const answer = await this._generate(prompt);
            debug('Question answered using generation');
            return answer;
        } catch (err) {
            error('Error answering question:', err);
            return handleErrorWithDefault(err, 'Question answering error', `Failed to answer question: ${err.message}`);
        }
    }
}

export default QAService;
