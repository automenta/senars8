const lexer = require('../src/parser/lexer');

// Test the lexer with a negation
const input = '(--,, cat)';
console.log('Input:', input);

const lexerInstance = lexer.clone();
lexerInstance.reset(input);

let token;
while (token = lexerInstance.next()) {
    console.log('Token:', token);
}