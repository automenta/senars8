const {
    parseTerm
} = require('../src/parser/narseseParser');

const testCases = [
    'cat',
    '(cat --> animal)',
    '(cat ==> mammal)',
    '(&, cat, dog)',
    '(&/, cat, dog)',
    '(&|, cat, dog)',
    '(--, cat)',
    '{cat, dog, bird}',
    '[furry, mammal, pet]',
    'cat.',
    '(cat --> animal)!',
    '(&/, (cat --> animal), (dog --> mammal))',
    '(cat =/> dog)',
    '(cat =\\> dog)',
    '(cat =<> dog)',
    '(cat <=> dog)',
    '(cat <-> dog)',
];

console.log('Testing enhanced Narsese parser:\n');

for (const testCase of testCases) {
    try {
        const result = parseTerm(testCase);
        console.log(`Input:  ${testCase}`);
        console.log(`Output: ${JSON.stringify(result, null, 2)}`);
        console.log('---');
    } catch (error) {
        console.log(`Input:  ${testCase}`);
        console.log(`Error:  ${error.message}`);
        console.log('---');
    }
}
