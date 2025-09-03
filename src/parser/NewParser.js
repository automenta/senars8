const lexer = require('./lexer');

/**
 * A recursive descent parser for Narsese syntax that produces structured output
 * suitable for the Reasoner.
 */
class NewParser {
    constructor(input) {
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    /**
     * Advance to the next token
     */
    next() {
        this.current = this.lexer.next();
        // Skip whitespace tokens
        while (this.current && this.current.type === 'whitespace') {
            this.current = this.lexer.next();
        }
        return this.current;
    }

    /**
     * Check if current token matches expected type
     */
    match(type) {
        return this.current && this.current.type === type;
    }

    /**
     * Consume current token if it matches expected type, otherwise throw error
     */
    consume(type) {
        if (this.match(type)) {
            const value = this.current.value;
            this.next();
            return value;
        }
        throw new Error(`Expected token type '${type}', but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    /**
     * Parse the main entry point
     */
    parseMain() {
        const result = this.parseStatement();
        if (this.current) {
            throw new Error(`Unexpected token '${this.current.type}' at end of input`);
        }
        return result;
    }

    /**
     * Parse a statement (term with optional punctuation and truth value)
     */
    parseStatement() {
        const term = this.parseTerm();
        
        // Check for punctuation
        let punctuation = null;
        if (this.match('belief')) {
            punctuation = this.consume('belief');
        } else if (this.match('goal')) {
            punctuation = this.consume('goal');
        } else if (this.match('question')) {
            punctuation = this.consume('question');
        }
        
        // Check for truth value
        let truthValue = null;
        if (this.match('lparen')) {
            truthValue = this.parseTruthValue();
        }
        
        if (punctuation || truthValue) {
            return {
                type: 'Statement',
                term: term,
                punctuation: punctuation,
                truthValue: truthValue
            };
        }
        
        return term;
    }

    /**
     * Parse a truth value: (frequency, confidence)
     */
    parseTruthValue() {
        this.consume('lparen');
        const frequency = this.parseNumber();
        this.consume('comma');
        const confidence = this.parseNumber();
        this.consume('rparen');
        return { frequency, confidence };
    }

    /**
     * Parse a number
     */
    parseNumber() {
        if (this.match('number')) {
            return this.consume('number');
        }
        throw new Error(`Expected a number, but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    /**
     * Parse a term
     */
    parseTerm() {
        if (this.match('lparen')) {
            this.consume('lparen');
            
            // Check what operator follows immediately after the left parenthesis
            if (this.match('negation')) {
                // This is a negation: (--, term)
                this.consume('negation');
                // Skip the comma that follows the negation operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const term = this.parseTerm();
                this.consume('rparen');
                return { type: 'Negation', term };
            } else if (this.match('conjunction')) {
                // This is a conjunction: (&, term, term, ...)
                this.consume('conjunction');
                // Skip the comma that follows the conjunction operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'Conjunction', terms };
            } else if (this.match('sequentialConjunction')) {
                // This is a sequential conjunction: (&/, term, term, ...)
                this.consume('sequentialConjunction');
                // Skip the comma that follows the conjunction operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'SequentialConjunction', terms };
            } else if (this.match('parallelConjunction')) {
                // This is a parallel conjunction: (&|, term, term, ...)
                this.consume('parallelConjunction');
                // Skip the comma that follows the conjunction operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'ParallelConjunction', terms };
            } else if (this.match('product')) {
                // This is a product: (*, term, term, ...)
                this.consume('product');
                // Skip the comma that follows the product operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'Product', terms };
            } else if (this.match('disjunction')) {
                // This is a disjunction: (||, term, term, ...)
                this.consume('disjunction');
                // Skip the comma that follows the disjunction operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'Disjunction', terms };
            } else if (this.match('extensionalDifference')) {
                // This is an extensional difference: (#, term, term, ...)
                this.consume('extensionalDifference');
                // Skip the comma that follows the extensional difference operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'ExtensionalDifference', terms };
            } else if (this.match('intensionalDifference')) {
                // This is an intensional difference: (\\\\, term, term, ...)
                this.consume('intensionalDifference');
                // Skip the comma that follows the intensional difference operator
                if (this.match('comma')) {
                    this.consume('comma');
                }
                const terms = this.parseTermList();
                this.consume('rparen');
                return { type: 'IntensionalDifference', terms };
            } else {
                // This could be an inheritance, implication, instance, property, or parenthesized term
                const firstTerm = this.parseTerm();
                
                // Check what operator follows
                if (this.match('arrow')) {
                    // This is an inheritance: (term --> term)
                    this.consume('arrow');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Inheritance', subject: firstTerm, predicate };
                } else if (this.match('implies')) {
                    // This is an implication: (term ==> term)
                    this.consume('implies');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Implication', subject: firstTerm, predicate };
                } else if (this.match('instance')) {
                    // This is an instance: (term {-- term)
                    this.consume('instance');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Instance', subject: firstTerm, predicate };
                } else if (this.match('property')) {
                    // This is a property: (term --} term)
                    this.consume('property');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Property', subject: firstTerm, predicate };
                } else if (this.match('equivalence')) {
                    // This is an equivalence: (term <=> term)
                    this.consume('equivalence');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Equivalence', subject: firstTerm, predicate };
                } else if (this.match('similarity')) {
                    // This is a similarity: (term <-> term)
                    this.consume('similarity');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'Similarity', subject: firstTerm, predicate };
                } else if (this.match('retrospection')) {
                    // This is a retrospective implication: (term =/> term)
                    this.consume('retrospection');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'RetrospectiveImplication', subject: firstTerm, predicate };
                } else if (this.match('prediction')) {
                    // This is a predictive implication: (term =\\> term)
                    this.consume('prediction');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'PredictiveImplication', subject: firstTerm, predicate };
                } else if (this.match('concurrent')) {
                    // This is a concurrent implication: (term =<> term)
                    this.consume('concurrent');
                    const predicate = this.parseTerm();
                    this.consume('rparen');
                    return { type: 'ConcurrentImplication', subject: firstTerm, predicate };
                } else {
                    // This is a parenthesized term: (term)
                    this.consume('rparen');
                    return firstTerm;
                }
            }
        } else if (this.match('setExtension')) {
            // Extensional set: {term, term, ...}
            this.consume('setExtension');
            const terms = this.parseTermList();
            this.consume('rbrace');
            return { type: 'ExtensionalSet', terms };
        } else if (this.match('setIntension')) {
            // Intensional set: [term, term, ...]
            this.consume('setIntension');
            const terms = this.parseTermList();
            this.consume('rbracket');
            return { type: 'IntensionalSet', terms };
        } else if (this.match('identifier')) {
            // This is an atomic term
            const identifier = this.consume('identifier');
            return { type: 'Atomic', key: identifier };
        } else if (this.match('independentVar')) {
            // Independent variable: \\var
            const variable = this.consume('independentVar');
            return { type: 'IndependentVariable', name: variable };
        } else if (this.match('dependentVar')) {
            // Dependent variable: #var
            const variable = this.consume('dependentVar');
            return { type: 'DependentVariable', name: variable };
        } else if (this.match('queryVar')) {
            // Query variable: ?var
            const variable = this.consume('queryVar');
            return { type: 'QueryVariable', name: variable };
        } else {
            throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
        }
    }

    /**
     * Parse a comma-separated list of terms
     */
    parseTermList() {
        const terms = [];
        
        // Parse the first term
        if (!this.match('rparen') && !this.match('rbrace') && !this.match('rbracket')) {
            terms.push(this.parseTerm());
            
            // Parse remaining terms separated by commas
            while (this.match('comma')) {
                this.consume('comma');
                terms.push(this.parseTerm());
            }
        }
        
        return terms;
    }
}

/**
 * Parse a Narsese term string into a structured object.
 * @param {string} input - The Narsese term string to parse
 * @returns {object|null} The parsed structured object or null if parsing fails
 */
function parse(input) {
    if (typeof input !== 'string' || input.length === 0) {
        return null;
    }

    try {
        const parser = new NewParser(input);
        return parser.parseMain();
    } catch (error) {
        console.error('Parsing error:', error.message);
        return null;
    }
}

module.exports = { parse };