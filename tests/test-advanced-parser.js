const {parse} = require('../src/parser/NewParser');

// Test cases for the enhanced parser
const testCases = [
    // Basic atomic term
    "cat",

    // Inheritance
    "(cat --> animal)",

    // Implication
    "(cat ==> mammal)",

    // Conjunction
    "(&, cat, dog)",

    // Sequential conjunction
    "(&/, cat, dog)",

    // Parallel conjunction
    "(&|, cat, dog)",

    // Negation
    "(--, cat)",

    // Extensional set
    "{cat, dog, bird}",

    // Intensional set
    "[furry, mammal, pet]",

    // Statement with punctuation
    "cat.",
    "(cat --> animal)!",

    // Complex nested structure
    "(&/, (cat --> animal), (dog --> mammal))",

    // Temporal operators
    "(cat =/> dog)",  // Retrospective implication
    "(cat =\\> dog)",  // Predictive implication
    "(cat =<> dog)",  // Concurrent implication

    // Equivalence and similarity
    "(cat <=> dog)",  // Equivalence
    "(cat <-> dog)",  // Similarity
];

console.log("Testing enhanced Narsese parser:\n");

for (const testCase of testCases) {
    try {
        const result = parse(testCase);
        console.log(`Input:  ${testCase}`);
        console.log(`Output: ${JSON.stringify(result, null, 2)}`);
        console.log("---");
    } catch (error) {
        console.log(`Input:  ${testCase}`);
        console.log(`Error:  ${error.message}`);
        console.log("---");
    }
}