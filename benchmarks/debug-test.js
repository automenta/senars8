// benchmarks/debug-test.js
const {parseTerm} = require('../src/parser/narseseParser');

async function debugTest() {
    console.log('Debugging Term parsing...');
    
    try {
        // Test parsing with correct format
        const term1 = parseTerm('Socrates');
        console.log('Parsed term1:', term1);
        
        if (term1) {
            console.log('Term1 key:', term1.key);
            console.log('Term1 type:', term1.type);
        } else {
            console.log('Failed to parse term1');
        }
        
        const term2 = parseTerm('(Socrates --> man)');
        console.log('Parsed term2:', term2);
        
        if (term2) {
            console.log('Term2 key:', term2.key);
            console.log('Term2 type:', term2.type);
        } else {
            console.log('Failed to parse term2');
        }
        
        const term3 = parseTerm('(man --> mortal)');
        console.log('Parsed term3:', term3);
        
        if (term3) {
            console.log('Term3 key:', term3.key);
            console.log('Term3 type:', term3.type);
        } else {
            console.log('Failed to parse term3');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

if (require.main === module) {
    debugTest();
}