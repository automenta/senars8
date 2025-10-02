import {afterEach, beforeEach, describe, test, vi} from 'vitest';
import {createDemoTest} from './test-utils.js';
import * as logger from '../../core/utils/logger.js';
import basicDemo from './basic-demo.js';
import mathInferenceDemo from './math-inference-demo.js';
import nlpIntegrationDemo from './nlp-integration-demo.js';
import showcaseDemo from './showcase-demo.js';
import advancedHypothesisGenerationDemo from './advanced-hypothesis-generation-demo.js';
import advancedLMDemo from './advanced-lm-demo.js';
import advancedTruthValueRevisionDemo from './advanced-truth-value-revision-demo.js';
import analyzerDemo from './analyzer-demo.js';
import comprehensiveActionDemo from './comprehensive-action-demo.js';
import comprehensiveContradictionDemo from './comprehensive-contradiction-demo.js';
import comprehensiveSystemDemo from './comprehensive-system-demo.js';
import debugContradictionsDemo from './debug-contradictions-demo.js';
import enhancedNarseseDemo from './enhanced-narsese-demo.js';
import enhancedPerceptionDemo from './enhanced-perception-demo.js';
import enhancedTemporalReasoningDemo from './enhanced-temporal-reasoning-demo.js';
import extendedInferenceRulesDemo from './extended-inference-rules-demo.js';
import forgettingMechanismDemo from './forgetting-mechanism-demo.js';
import libraryUsageDemo from './library-usage-demo.js';
import strategyComparisonDemo from './strategy-comparison-demo.js';

describe('Demos as Tests', () => {
    let errorSpy;
    let warnSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
    });

    const demos = [
        {name: 'basic-demo', fn: basicDemo, mock: true},
        {name: 'math-inference-demo', fn: mathInferenceDemo, mock: true},
        {name: 'nlp-integration-demo', fn: nlpIntegrationDemo, mock: true},
        {name: 'showcase-demo', fn: showcaseDemo, mock: true},
        {name: 'advanced-hypothesis-generation-demo', fn: advancedHypothesisGenerationDemo, mock: true},
        {name: 'advanced-lm-demo', fn: advancedLMDemo, mock: false},
        {name: 'advanced-truth-value-revision-demo', fn: advancedTruthValueRevisionDemo, mock: true},
        {name: 'analyzer-demo', fn: analyzerDemo, mock: true},
        {name: 'comprehensive-action-demo', fn: comprehensiveActionDemo, mock: true},
        {name: 'comprehensive-contradiction-demo', fn: comprehensiveContradictionDemo, mock: true},
        {name: 'comprehensive-system-demo', fn: comprehensiveSystemDemo, mock: true},
        {name: 'debug-contradictions-demo', fn: debugContradictionsDemo, mock: true},
        {name: 'enhanced-narsese-demo', fn: enhancedNarseseDemo, mock: true},
        {name: 'enhanced-perception-demo', fn: enhancedPerceptionDemo, mock: false},
        {name: 'enhanced-temporal-reasoning-demo', fn: enhancedTemporalReasoningDemo, mock: true},
        {name: 'extended-inference-rules-demo', fn: extendedInferenceRulesDemo, mock: true},
        {name: 'forgetting-mechanism-demo', fn: forgettingMechanismDemo, mock: true},
        {name: 'library-usage-demo', fn: libraryUsageDemo, mock: true},
        {name: 'strategy-comparison-demo', fn: strategyComparisonDemo, mock: true},
    ];

    for (const demo of demos) {
        test(
            `${demo.name} should run without errors`,
            async () => {
                await createDemoTest(demo.fn, demo.mock);
            },
            {timeout: 300000}
        );
    }
});