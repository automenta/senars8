import {debug} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('LMTemporalPatternPredictor');

class LMTemporalPatternPredictor {
    /**
     * Creates an LM-powered temporal pattern predictor
     * @param {LM} lm - Language model instance
     */
    constructor(lm) {
        this.lm = lm;
        this.cache = null;
    }

    /**
     * Sets the temporal cache for preloading predictions
     * @param {TemporalCache} cache - Temporal cache instance
     */
    setCache(cache) {
        this.cache = cache;
    }

    /**
     * Predicts likely temporal patterns that might occur based on recent activity
     * @param {Task[]} recentTasks - Array of recently processed tasks
     * @returns {Array} Array of predicted temporal patterns
     */
    async predictTemporalPatterns(recentTasks) {
        if (!this.lm || !this.lm.generate) {
            debug('LM not available for temporal pattern prediction, returning empty array');
            return [];
        }

        return errorHandler.execute(async () => {
            // Analyze the recent tasks to identify patterns that might continue
            const tasksContext = this._createContextFromTasks(recentTasks);

            const prompt = `
            Analyze the following temporal patterns and predict what patterns are likely to occur next:
            
            ${tasksContext}
            
            Based on the temporal patterns in the provided tasks, predict likely upcoming temporal patterns.
            Return the prediction in JSON format with the following structure:
            {
                "predictedPatterns": [
                    {
                        "patternType": "periodic|sequential|cyclic",
                        "estimatedFrequency": "low|medium|high",
                        "estimatedConfidence": 0.0-1.0,
                        "predictedTask": "description of likely task"
                    }
                ],
                "temporalInferences": [
                    {
                        "task1": "task description",
                        "relationship": "before|after|during|contains|meets|met-by|overlaps",
                        "task2": "task description"
                    }
                ]
            }
            `;

            try {
                const result = await this.lm.generate(prompt, {
                    max_tokens: 500,
                    temperature: 0.3 // Lower temperature for more consistent predictions
                });

                if (!result) {
                    debug('No LM result for temporal pattern prediction');
                    return [];
                }

                // Try to parse the JSON response
                const parsedResult = this._parseLMResult(result);
                if (!parsedResult) {
                    debug('Failed to parse LM result for temporal pattern prediction');
                    return [];
                }

                // Preload cache with predictions if available
                if (this.cache && parsedResult.predictedPatterns && recentTasks.length > 0) {
                    this._preloadCacheWithPredictions(recentTasks, parsedResult);
                }

                debug(`LM predicted ${parsedResult.predictedPatterns?.length || 0} temporal patterns`);
                return parsedResult;
            } catch (error) {
                debug(`LM temporal pattern prediction failed: ${error.message}`);
                return []; // Return empty array on failure to maintain resilience
            }
        }, 'predictTemporalPatterns', []);
    }

    /**
     * Creates a context string from tasks for LM analysis
     * @param {Task[]} tasks - Array of tasks
     * @returns {string} Context string
     * @private
     */
    _createContextFromTasks(tasks) {
        if (!tasks || tasks.length === 0) return "No recent tasks to analyze.";

        // Extract temporal information from tasks
        const temporalInfo = tasks.map(task => {
            const stamp = task.state.stamp;
            return {
                termKey: task.termKey,
                occurrenceTime: stamp.occurrenceTime || 'N/A',
                endTime: stamp.endTime || 'N/A',
                punctuation: task.punctuation || 'N/A'
            };
        });

        return JSON.stringify(temporalInfo, null, 2);
    }

    /**
     * Parses the LM result to extract temporal predictions
     * @param {string} result - LM result string
     * @returns {Object|null} Parsed result object
     * @private
     */
    _parseLMResult(result) {
        try {
            // Look for JSON in the result (often wrapped in markdown code blocks)
            const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```|```([\s\S]*?)```|({[\s\S]*})/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[2] || jsonMatch[3]) : result;
            return JSON.parse(jsonStr.trim());
        } catch (error) {
            debug(`Failed to parse LM result as JSON: ${error.message}`);
            return null;
        }
    }

    /**
     * Preloads the cache with predicted patterns
     * @param {Task[]} tasks - Reference tasks
     * @param {Object} predictions - Parsed predictions from LM
     * @private
     */
    _preloadCacheWithPredictions(tasks, predictions) {
        if (predictions.temporalInferences) {
            for (const inference of predictions.temporalInferences) {
                // Preload an empty result for relationship inference (common high-cost operation)
                // This is a conservative approach - we're preloading the cache with an empty result
                // that will be calculated when actually needed
                this.cache.preload('TemporalRelationshipInference', tasks, [], {predicted: true});
            }
        }

        if (predictions.predictedPatterns) {
            for (const pattern of predictions.predictedPatterns) {
                // Preload pattern detection results based on prediction confidence
                this.cache.preload('TemporalPatternDetection', tasks, [], {
                    predicted: true,
                    estimatedConfidence: pattern.estimatedConfidence
                });
            }
        }
    }
}

export default LMTemporalPatternPredictor;