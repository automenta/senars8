import {createUnifiedErrorHandler} from '../utils/unifiedErrorHandler.js';
import {debug} from '../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('QAService');

class QAService {
    constructor(generateFunction, getQAPipelineFunction) {
        this._generate = generateFunction;
        this._getQAPipeline = getQAPipelineFunction;
    }

    async answerQuestion(question, context = null) {
        if (!question) {
            return 'Cannot answer an empty question.';
        }

        return await errorHandler.execute(async () => {
            debug(`Answering question: ${question.substring(0, 50)}...`);
            if (context) {
                const qaPipeline = await this._getQAPipeline();
                const result = await qaPipeline(question, context);
                if (result?.answer) {
                    debug('Question answered using QA pipeline');
                    return result.answer;
                }
            }

            const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
            const answer = await this._generate(prompt);
            debug('Question answered using generation');
            return answer;
        }, `answerQuestion: ${question.substring(0, 50)}...`, `Failed to answer question: ${question}`);
    }
}

export default QAService;
