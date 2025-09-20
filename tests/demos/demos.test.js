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
    jest.setTimeout(30000);

    test('basic-demo should run without errors', async () => {
        await basicDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
                expect(system.introspection).toBeDefined();
            }
        });
    });

    test('math-inference-demo should run without errors', async () => {
        await mathInferenceDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('nlp-integration-demo should run without errors', async () => {
        await nlpIntegrationDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('showcase-demo should run without errors', async () => {
        await showcaseDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('advanced-hypothesis-generation-demo should run without errors', async () => {
        await advancedHypothesisGenerationDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('advanced-lm-demo should run without errors', async () => {
        await advancedLMDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('advanced-truth-value-revision-demo should run without errors', async () => {
        await advancedTruthValueRevisionDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('analyzer-demo should run without errors', async () => {
        await analyzerDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('comprehensive-action-demo should run without errors', async () => {
        await comprehensiveActionDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('comprehensive-contradiction-demo should run without errors', async () => {
        await comprehensiveContradictionDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('comprehensive-system-demo should run without errors', async () => {
        await comprehensiveSystemDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('debug-contradictions-demo should run without errors', async () => {
        await debugContradictionsDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('enhanced-narsese-demo should run without errors', async () => {
        await enhancedNarseseDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('enhanced-perception-demo should run without errors', async () => {
        await enhancedPerceptionDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('enhanced-temporal-reasoning-demo should run without errors', async () => {
        await enhancedTemporalReasoningDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('extended-inference-rules-demo should run without errors', async () => {
        await extendedInferenceRulesDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('forgetting-mechanism-demo should run without errors', async () => {
        await forgettingMechanismDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('library-usage-demo should run without errors', async () => {
        await libraryUsageDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });

    test('strategy-comparison-demo should run without errors', async () => {
        await strategyComparisonDemo({
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        });
    });
});