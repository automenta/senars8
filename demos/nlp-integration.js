const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const CONSTITUTION_TASKS = require('../src/system/Constitution');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');

/**
 * Natural Language Processing Demo
 * Tests the system's ability to integrate with language models for semantic understanding.
 * This demo can also serve as a unit test for the LM integration.
 */
async function nlpDemo() {
    console.log("=== Natural Language Processing Demo ===");

    // Initialize system components
    const lm = new LM();
    const memory = new Memory();

    // Load Constitution
    memory.addTasks(CONSTITUTION_TASKS);

    // Bootstrap constitutional terms
    const termPromises = CONSTITUTION_TASKS.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const newTerms = (await Promise.all(termPromises)).filter(Boolean);
    newTerms.forEach(term => memory.addTerm(term));

    // Test LM term bootstrapping
    console.log("Testing LM term bootstrapping...");
    const testTerms = [
        "artificial_intelligence",
        "machine_learning",
        "natural_language_processing",
        "deep_learning",
        "neural_network"
    ];

    const bootstrapResults = [];
    for (const termKey of testTerms) {
        try {
            console.log(`Bootstrapping term: ${termKey}`);
            const term = await lm.bootstrapTerm(termKey);
            memory.addTerm(term);
            bootstrapResults.push({termKey, success: true, complexity: term.complexity});
            console.log(`✓ Successfully bootstrapped: ${termKey} (complexity: ${term.complexity})`);
        } catch (error) {
            bootstrapResults.push({termKey, success: false, error: error.message});
            console.log(`✗ Failed to bootstrap: ${termKey} (${error.message})`);
        }
    }

    // Test semantic similarity between related terms
    console.log("\nTesting semantic similarity...");
    const aiTerm = memory.getTerm("artificial_intelligence");
    const mlTerm = memory.getTerm("machine_learning");

    if (aiTerm && mlTerm && aiTerm.embedding && mlTerm.embedding) {
        // Simple dot product for similarity (simplified version)
        let similarity = 0;
        for (let i = 0; i < aiTerm.embedding.length; i++) {
            similarity += aiTerm.embedding[i] * mlTerm.embedding[i];
        }

        console.log(`Semantic similarity between 'artificial_intelligence' and 'machine_learning': ${similarity.toPrecision(4)}`);

        if (similarity > 0.3) {
            console.log("✓ Semantic similarity is reasonable");
        } else {
            console.log("⚠ Semantic similarity is lower than expected");
        }
    } else {
        console.log("✗ Could not compute semantic similarity (missing embeddings)");
    }

    // Test complex term bootstrapping
    console.log("\nTesting complex term bootstrapping...");
    const complexTerms = [
        "(artificial_intelligence --> computer_science)",
        "(machine_learning --> artificial_intelligence)",
        "((*, neural_network, deep_learning) --> advanced_ml)"
    ];

    const complexBootstrapResults = [];
    for (const termKey of complexTerms) {
        try {
            console.log(`Bootstrapping complex term: ${termKey}`);
            const term = await lm.bootstrapTerm(termKey);
            memory.addTerm(term);
            complexBootstrapResults.push({termKey, success: true, complexity: term.complexity});
            console.log(`✓ Successfully bootstrapped: ${termKey} (complexity: ${term.complexity})`);
        } catch (error) {
            complexBootstrapResults.push({termKey, success: false, error: error.message});
            console.log(`✗ Failed to bootstrap: ${termKey} (${error.message})`);
        }
    }

    console.log("\n=== Verification ===");
    const totalTerms = memory.terms.size;
    const successfulBootstraps = bootstrapResults.filter(r => r.success).length;
    const successfulComplexBootstraps = complexBootstrapResults.filter(r => r.success).length;

    console.log(`Total terms in memory: ${totalTerms}`);
    console.log(`Successfully bootstrapped simple terms: ${successfulBootstraps}/${testTerms.length}`);
    console.log(`Successfully bootstrapped complex terms: ${successfulComplexBootstraps}/${complexTerms.length}`);

    const success = successfulBootstraps > 0;
    if (success) {
        console.log("✓ LM integration is working correctly");
    } else {
        console.log("✗ LM integration has issues");
    }

    console.log("\n=== NLP Demo Complete ===");
    return {
        totalTerms,
        successfulBootstraps,
        successfulComplexBootstraps,
        success
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    nlpDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = nlpDemo;