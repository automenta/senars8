import { describe, jest } from '@jest/globals';
import {createDemoTest} from './test-utils.js';
import basicDemo from '../demos/basic-demo.js';
import mathInferenceDemo from '../demos/math-inference-demo.js';
import nlpIntegrationDemo from '../demos/nlp-integration-demo.js';
import showcaseDemo from '../demos/showcase-demo.js';
import advancedHypothesisGenerationDemo from '../demos/advanced-hypothesis-generation-demo.js';
import advancedLMDemo from '../demos/advanced-lm-demo.js';
import advancedTruthValueRevisionDemo from '../demos/advanced-truth-value-revision-demo.js';
import analyzerDemo from '../demos/analyzer-demo.js';
import comprehensiveActionDemo from '../demos/comprehensive-action-demo.js';
import comprehensiveContradictionDemo from '../demos/comprehensive-contradiction-demo.js';
import comprehensiveSystemDemo from '../demos/comprehensive-system-demo.js';
import debugContradictionsDemo from '../demos/debug-contradictions-demo.js';
import enhancedNarseseDemo from '../demos/enhanced-narsese-demo.js';
import enhancedPerceptionDemo from '../demos/enhanced-perception-demo.js';
import enhancedTemporalReasoningDemo from '../demos/enhanced-temporal-reasoning-demo.js';
import extendedInferenceRulesDemo from '../demos/extended-inference-rules-demo.js';
import forgettingMechanismDemo from '../demos/forgetting-mechanism-demo.js';
import libraryUsageDemo from '../demos/library-usage-demo.js';
import strategyComparisonDemo from '../demos/strategy-comparison-demo.js';

describe('Demos as Tests', () => {
    // Set a longer timeout for demos since they may involve LLM calls
    jest.setTimeout(300000);

    createDemoTest('basic-demo', basicDemo, true);
    createDemoTest('math-inference-demo', mathInferenceDemo, true);
    createDemoTest('nlp-integration-demo', nlpIntegrationDemo, true);
    createDemoTest('showcase-demo', showcaseDemo, true);
    createDemoTest('advanced-hypothesis-generation-demo', advancedHypothesisGenerationDemo, true);
    createDemoTest('advanced-lm-demo', advancedLMDemo);
    createDemoTest('advanced-truth-value-revision-demo', advancedTruthValueRevisionDemo, true);
    createDemoTest('analyzer-demo', analyzerDemo, true);
    createDemoTest('comprehensive-action-demo', comprehensiveActionDemo, true);
    createDemoTest('comprehensive-contradiction-demo', comprehensiveContradictionDemo, true);
    createDemoTest('comprehensive-system-demo', comprehensiveSystemDemo, true);
    createDemoTest('debug-contradictions-demo', debugContradictionsDemo, true);
    createDemoTest('enhanced-narsese-demo', enhancedNarseseDemo, true);
    createDemoTest('enhanced-perception-demo', enhancedPerceptionDemo);
    createDemoTest('enhanced-temporal-reasoning-demo', enhancedTemporalReasoningDemo, true);
    createDemoTest('extended-inference-rules-demo', extendedInferenceRulesDemo, true);
    createDemoTest('forgetting-mechanism-demo', forgettingMechanismDemo, true);
    createDemoTest('library-usage-demo', libraryUsageDemo, true);
    createDemoTest('strategy-comparison-demo', strategyComparisonDemo, true);
});