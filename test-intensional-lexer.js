const lexer = require('./src/parser/lexer');

// Test the lexer with an intensional difference
const input = '(\\, cat, dog)';
console.log('Input:', input);

const lexerInstance = lexer.clone();
lexerInstance.reset(input);

let token;
while (token = lexerInstance.next()) {
    console.log('Token:', token);
}