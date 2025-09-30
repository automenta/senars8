import { join } from 'path';
import MockLM from '../mocks/MockLM.js';
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

const demos = [
    { name: 'basic-demo', fn: basicDemo },
    { name: 'math-inference-demo', fn: mathInferenceDemo },
    { name: 'nlp-integration-demo', fn: nlpIntegrationDemo },
    { name: 'showcase-demo', fn: showcaseDemo },
    { name: 'advanced-hypothesis-generation-demo', fn: advancedHypothesisGenerationDemo },
    { name: 'advanced-lm-demo', fn: advancedLMDemo },
    { name: 'advanced-truth-value-revision-demo', fn: advancedTruthValueRevisionDemo },
    { name: 'analyzer-demo', fn: analyzerDemo },
    { name: 'comprehensive-action-demo', fn: comprehensiveActionDemo },
    { name: 'comprehensive-contradiction-demo', fn: comprehensiveContradictionDemo },
    { name: 'comprehensive-system-demo', fn: comprehensiveSystemDemo },
    { name: 'debug-contradictions-demo', fn: debugContradictionsDemo },
    { name: 'enhanced-narsese-demo', fn: enhancedNarseseDemo },
    { name: 'enhanced-perception-demo', fn: enhancedPerceptionDemo },
    { name: 'enhanced-temporal-reasoning-demo', fn: enhancedTemporalReasoningDemo },
    { name: 'extended-inference-rules-demo', fn: extendedInferenceRulesDemo },
    { name: 'forgetting-mechanism-demo', fn: forgettingMechanismDemo },
    { name: 'library-usage-demo', fn: libraryUsageDemo },
    { name: 'strategy-comparison-demo', fn: strategyComparisonDemo },
];

export async function runAllDemos(useMockLM = true) {
    const options = {
        assertions: () => {}, // No-op for this context
        strategiesPath: join(process.cwd(), 'core/reasoner/strategies')
    };

    if (useMockLM) {
        options.components = { lm: new MockLM() };
    }

    for (const demo of demos) {
        console.log(`Running demo for heap analysis: ${demo.name}`);
        try {
            await demo.fn(options);
        } catch (error) {
            console.error(`Error running demo ${demo.name}:`, error);
        }
    }
}