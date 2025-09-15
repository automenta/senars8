import { CONTRADICTION_TYPES } from '../../contradiction-types.js';

function analyzeFrequencyConflict(task1, task2, _parsed1, _parsed2) {
    const freqConflict = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8;
    const highConfidence = task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8;
    if (freqConflict && highConfidence) {
        return {
            type: CONTRADICTION_TYPES.FREQUENCY_CONFLICT,
            details: `High confidence frequency conflict for "${task1.termKey}"`
        };
    }
    return null;
}

export default analyzeFrequencyConflict;
