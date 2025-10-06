import lexer from './lexer.js';
import {OP, TOKEN} from '../config/constants.js';

const UNARY_OPERATOR_MAP = {
    [TOKEN.NEGATION]: OP.NEGATION,
};

const TEMPORAL_OPERATOR_MAP = {
    [TOKEN.ALWAYS]: OP.ALWAYS,
    [TOKEN.EVENTUALLY]: OP.EVENTUALLY,
    [TOKEN.NEXT]: OP.NEXT,
    [TOKEN.PREVIOUS]: OP.PREVIOUS,
};

const BINARY_OPERATOR_MAP = {
     [TOKEN.CONJUNCTION]: OP.CONJUNCTION,
     [TOKEN.SEQUENTIAL_CONJUNCTION]: OP.SEQUENTIAL_CONJUNCTION,
     [TOKEN.SEQUENTIAL_CONJUNCTION_ALT]: OP.SEQUENTIAL_CONJUNCTION,
     [TOKEN.PARALLEL_CONJUNCTION]: OP.PARALLEL_CONJUNCTION,
     [TOKEN.DISJUNCTION]: OP.DISJUNCTION,
     [TOKEN.EXTENSIONAL_DIFFERENCE]: OP.EXTENSIONAL_DIFFERENCE,
     [TOKEN.INTENSIONAL_DIFFERENCE]: OP.INTENSIONAL_DIFFERENCE,
     [TOKEN.PRODUCT]: OP.PRODUCT,
 };

const OPERATOR_MAP = {
    ...UNARY_OPERATOR_MAP,
    ...TEMPORAL_OPERATOR_MAP,
    ...BINARY_OPERATOR_MAP,
};

const BINARY_RELATION_MAP = {
    [TOKEN.ARROW]: OP.INHERITANCE,
    [TOKEN.IMPLIES]: OP.IMPLICATION,
    [TOKEN.INSTANCE]: OP.INSTANCE,
    [TOKEN.PROPERTY]: OP.PROPERTY,
    [TOKEN.EQUIVALENCE]: OP.EQUIVALENCE,
    [TOKEN.SIMILARITY]: OP.SIMILARITY,
    [TOKEN.RETROSPECTION]: OP.RETROSPECTIVE_IMPLICATION,
    [TOKEN.PREDICTION]: OP.PREDICTIVE_IMPLICATION,
    [TOKEN.CONCURRENT]: OP.CONCURRENT_IMPLICATION,
    [TOKEN.UNTIL]: OP.UNTIL,
    [TOKEN.SINCE]: OP.SINCE,
};

class NarseseParser {
    constructor(input) {
        this.input = input;
        this.lexer = lexer.clone().reset(input);
        this.current = null;
        this.recursionDepth = 0;
        this.maxRecursionDepth = 100; // Prevent infinite recursion/stack overflow
        this.next();
    }

    next() {
        this.current = this.lexer.next();
        while (this.current?.type === TOKEN.WHITESPACE) {
            this.current = this.lexer.next();
        }
        return this.current;
    }

    match(type) {
        return this.current?.type === type;
    }

    consume(type) {
        if (!this.match(type)) {
            throw new Error(`Expected '${type}', found '${this.current?.type || 'EOF'}'`);
        }
        const value = this.current.value;
        this.next();
        return value;
    }

    parseMain() {
        const result = this.parseStatement();
        // Allow trailing whitespace or end of input
        while (this.current && (this.current.type === TOKEN.WHITESPACE || !this.current.type)) {
            this.next();
        }
        if (this.current) {
            throw new Error(`Unexpected token '${this.current.type}' at end`);
        }
        return result;
    }

    parseStatement() {
        const term = this.parseTerm();
        const truthValue = this.match(TOKEN.LPAREN) ? this.parseTruthValue() : null;
        const punctuation = this.match(TOKEN.BELIEF) ? this.consume(TOKEN.BELIEF) :
            this.match(TOKEN.GOAL) ? this.consume(TOKEN.GOAL) :
                this.match(TOKEN.QUESTION) ? this.consume(TOKEN.QUESTION) : null;

        return (punctuation || truthValue) ? {
            type: OP.STATEMENT,
            term,
            punctuation,
            truthValue
        } : term;
    }

    parseTruthValue() {
        this.consume(TOKEN.LPAREN);
        const frequency = this.parseNumber().value;
        this.consume(TOKEN.COMMA);
        const confidence = this.parseNumber().value;
        this.consume(TOKEN.RPAREN);
        return {
            frequency,
            confidence
        };
    }

    parseTerm() {
        // Check recursion depth to prevent stack overflow
        this.recursionDepth++;
        if (this.recursionDepth > this.maxRecursionDepth) {
            throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
        }

        if (this.current && this.current.type in BINARY_RELATION_MAP) {
            throw new Error(`Missing subject for binary relation '${this.current.type}'`);
        }

        const parsers = {
            [TOKEN.LPAREN]: () => this.parseCompoundTerm(),
            [TOKEN.LBRACE]: () => this.parseSet(OP.EXTENSIONAL_SET, TOKEN.LBRACE, TOKEN.RBRACE),
            [TOKEN.LBRACKET]: () => this.parseSet(OP.INTENSIONAL_SET, TOKEN.LBRACKET, TOKEN.RBRACKET),
            [TOKEN.IDENTIFIER]: () => this.parseAtomicTerm(),
            [TOKEN.STRING]: () => this.parseAtomicTerm(),
            [TOKEN.INDEPENDENT_VAR]: () => this.parseVariable(TOKEN.INDEPENDENT_VAR, OP.INDEPENDENT_VARIABLE),
            [TOKEN.DEPENDENT_VAR]: () => this.parseVariable(TOKEN.DEPENDENT_VAR, OP.DEPENDENT_VARIABLE),
            [TOKEN.QUERY_VAR]: () => this.parseVariable(TOKEN.QUERY_VAR, OP.QUERY_VARIABLE),
            [TOKEN.QUESTION]: () => this.parseVariable(TOKEN.QUESTION, OP.QUERY_VARIABLE),
            [TOKEN.NUMBER]: () => this.parseNumber(),
            // Handle temporal operators as atomic terms when they appear in term contexts
            // But only if they're not being used as identifiers in operator arguments
            [TOKEN.NEXT]: () => this.parseAtomicTermFromToken(),
            [TOKEN.PREVIOUS]: () => this.parseAtomicTermFromToken(),
            [TOKEN.ALWAYS]: () => this.parseAtomicTermFromToken(),
            [TOKEN.EVENTUALLY]: () => this.parseAtomicTermFromToken(),
            [TOKEN.UNTIL]: () => this.parseAtomicTermFromToken(),
            [TOKEN.SINCE]: () => this.parseAtomicTermFromToken(),
        };
        const parser = this.current ? parsers[this.current.type] : null;
        if (parser) {
            const result = parser();
            this.recursionDepth--; // Decrement after successful parsing
            return result;
        }
        this.recursionDepth--; // Decrement when returning an error
        throw new Error(`Unexpected token '${this.current?.type || 'EOF'}'`);
    }

    parseNumber() {
        return {
            type: OP.NUMBER,
            value: parseFloat(this.consume(TOKEN.NUMBER))
        };
    }

    parseCompoundTerm() {
        const start = this.current.offset;
        this.consume(TOKEN.LPAREN);

        let term;

        // Handle empty parentheses for empty product
        if (this.match(TOKEN.RPAREN)) {
            term = {type: OP.PRODUCT, terms: []};
        } else if (this.current?.type in OPERATOR_MAP) {
            term = this.parseOperator();
        } else {
            const left = this.parseTerm();

            if (this.current?.type in BINARY_RELATION_MAP) {
                const relationType = BINARY_RELATION_MAP[this.current.type];
                term = this.parseBinaryRelation(left, this.current.type, relationType);
                // After parsing binary relation, consume the closing parenthesis
                // Calculate end position before consuming the RPAREN (using the token's position)
                const end = this.current.offset + this.current.text.length;
                this.consume(TOKEN.RPAREN);

                // Assign the original string segment as the key for the compound term
                if (term && typeof term === 'object' && !term.key) {
                    term.key = this.input.substring(start, end);
                }

                return term;
            } else if (this.current?.type in BINARY_OPERATOR_MAP) {
                const terms = [left];
                const operator = this.current.type;
                while (this.match(operator)) {
                    this.consume(operator);
                    terms.push(this.parseTerm());
                }
                term = {type: BINARY_OPERATOR_MAP[operator], terms};

                // After parsing a binary operator, check if there's a binary relation following
                // This handles cases like (a & b ==> c & d)
                if (this.current?.type in BINARY_RELATION_MAP) {
                    const relationType = BINARY_RELATION_MAP[this.current.type];
                    const binaryRelation = this.parseBinaryRelation(term, this.current.type, relationType);

                    // After parsing the binary relation, check if there are more terms
                    if (this.current && !this.match(TOKEN.RPAREN) && this.current?.type in BINARY_OPERATOR_MAP) {
                        // We have a compound expression like (a & b ==> c & d)
                        // Parse the right side as another compound term
                        const rightTerms = [binaryRelation.predicate];
                        const rightOperator = this.current.type;
                        while (this.match(rightOperator)) {
                            this.consume(rightOperator);
                            rightTerms.push(this.parseTerm());
                        }

                        term = {
                            type: binaryRelation.type,
                            subject: binaryRelation.subject,
                            predicate: {type: BINARY_OPERATOR_MAP[rightOperator], terms: rightTerms}
                        };
                    } else {
                        term = binaryRelation;
                    }
                }
            } else if (this.match(TOKEN.COMMA)) {
                const productTerms = [left];
                while (this.match(TOKEN.COMMA)) {
                    this.consume(TOKEN.COMMA);
                    if (!this.match(TOKEN.RPAREN)) {
                        productTerms.push(this.parseTerm());
                    }
                }
                term = {type: OP.PRODUCT, terms: productTerms};
            } else {
                // Handle case where we have a term followed by a binary relation that's not at the top level
                // This handles cases like (a & b ==> c & d)
                if (this.current?.type in BINARY_RELATION_MAP) {
                    const relationType = BINARY_RELATION_MAP[this.current.type];
                    const binaryRelation = this.parseBinaryRelation(left, this.current.type, relationType);

                    // After parsing the binary relation, check if there are more terms
                    if (this.current && !this.match(TOKEN.RPAREN) && this.current?.type in BINARY_OPERATOR_MAP) {
                        // We have a compound expression like (a & b ==> c & d)
                        // Parse the right side as another compound term
                        const rightTerms = [binaryRelation.predicate];
                        const operator = this.current.type;
                        while (this.match(operator)) {
                            this.consume(operator);
                            rightTerms.push(this.parseTerm());
                        }

                        term = {
                            type: binaryRelation.type,
                            subject: binaryRelation.subject,
                            predicate: {type: BINARY_OPERATOR_MAP[operator], terms: rightTerms}
                        };
                    } else {
                        term = binaryRelation;
                    }
                } else {
                    term = left;
                }
            }
        }

        // Calculate end position before consuming the RPAREN
        const end = this.current.offset + this.current.text.length;
        this.consume(TOKEN.RPAREN);

        // Assign the original string segment as the key for the compound term
        if (term && typeof term === 'object' && !term.key) {
            term.key = this.input.substring(start, end);
        }

        return term;
    }

    parseOperator() {
        const operatorTokenType = this.current.type;
        const operatorType = OPERATOR_MAP[operatorTokenType];
        this.consume(operatorTokenType);

        // For temporal operators, comma is optional - check if next token is comma or term
        const isBinary = operatorTokenType in BINARY_OPERATOR_MAP;

        if (!isBinary) { // Unary operator
            if (this.match(TOKEN.COMMA)) {
                throw new Error(`Unexpected comma after unary operator '${operatorTokenType}'. Unary operators expect a single term, not a comma-separated list.`);
            }
            const term = this.parseTerm();
            return {
                type: operatorType,
                term
            };
        } else { // Binary operator
            const terms = this.parseTermList(TOKEN.RPAREN);
            return {
                type: operatorType,
                terms
            };
        }
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        if (!subject) {
            throw new Error(`Missing subject for binary relation '${tokenType}'`);
        }
        this.consume(tokenType);
        // Check recursion depth before recursive call
        this.recursionDepth++;
        if (this.recursionDepth > this.maxRecursionDepth) {
            throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
        }
        const predicate = this.parseTerm();
        this.recursionDepth--; // Decrement after the call
        return {
            type: relationType,
            subject,
            predicate
        };
    }

    parseSet(type, open, close) {
        this.consume(open);
        const terms = this.parseTermList(close);
        this.consume(close);
        return {
            type,
            terms
        };
    }

    parseAtomicTerm() {
        const token = this.current;
        this.next();

        // Check if this atomic term is followed by parentheses (function call syntax)
        if (this.match(TOKEN.LPAREN)) {
            // This is an operation call: atomicTerm(args...)
            this.consume(TOKEN.LPAREN);
            let args = [];

            if (!this.match(TOKEN.RPAREN)) {
                args = this.parseTermList(TOKEN.RPAREN);
            }
            this.consume(TOKEN.RPAREN);

            // Return as operation: (atomicTerm ^ (args...))
            return {
                type: OP.OPERATION,
                subject: {
                    type: OP.ATOMIC,
                    key: token.value
                },
                predicate: {
                    type: OP.PRODUCT,
                    terms: args
                }
            };
        } else {
            // Regular atomic term
            return {
                type: OP.ATOMIC,
                key: token.value
            };
        }
    }

    parseVariable(tokenType, variableType) {
        return {
            type: variableType,
            name: this.consume(tokenType)
        };
    }

    parseAtomicTermFromToken() {
        const token = this.current;
        this.next();
        return {
            type: OP.ATOMIC,
            key: token.value
        };
    }

    parseTermList(closingToken) {
        const terms = [];
        if (!this.match(closingToken)) {
            // Parse first term - only if current token is a valid term starter
            if (this.current && [TOKEN.IDENTIFIER, TOKEN.STRING, TOKEN.LPAREN, TOKEN.LBRACE, TOKEN.LBRACKET,
                 TOKEN.INDEPENDENT_VAR, TOKEN.DEPENDENT_VAR, TOKEN.QUERY_VAR, TOKEN.QUESTION,
                 TOKEN.NUMBER, TOKEN.NEXT, TOKEN.PREVIOUS, TOKEN.ALWAYS, TOKEN.EVENTUALLY,
                 TOKEN.UNTIL, TOKEN.SINCE].includes(this.current.type)) {

                this.recursionDepth++;
                if (this.recursionDepth > this.maxRecursionDepth) {
                    throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
                }
                terms.push(this.parseTerm());
                this.recursionDepth--;
            }

            // Parse additional terms separated by commas
            while (this.match(TOKEN.COMMA) && !this.match(closingToken)) {
                this.consume(TOKEN.COMMA);

                // Check if there's a term after the comma
                if (!this.match(closingToken) && this.current &&
                    [TOKEN.IDENTIFIER, TOKEN.STRING, TOKEN.LPAREN, TOKEN.LBRACE, TOKEN.LBRACKET,
                     TOKEN.INDEPENDENT_VAR, TOKEN.DEPENDENT_VAR, TOKEN.QUERY_VAR, TOKEN.QUESTION,
                     TOKEN.NUMBER, TOKEN.NEXT, TOKEN.PREVIOUS, TOKEN.ALWAYS, TOKEN.EVENTUALLY,
                     TOKEN.UNTIL, TOKEN.SINCE].includes(this.current.type)) {

                    this.recursionDepth++;
                    if (this.recursionDepth > this.maxRecursionDepth) {
                        throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
                    }
                    terms.push(this.parseTerm());
                    this.recursionDepth--;
                } else if (!this.match(closingToken)) {
                    // If we have a comma but no valid term after it, that's an error
                    throw new Error(`Expected term after comma, found '${this.current?.type || 'EOF'}'`);
                }
            }

            // For temporal operators, also allow space-separated terms without commas
            // This handles cases like (&& first second) instead of (&&, first, second)
            // But only if we haven't reached the closing token and there are more terms
            while (!this.match(closingToken) && this.current && this.current.type !== TOKEN.RPAREN) {
                if (this.current.type in BINARY_RELATION_MAP || this.current.type in BINARY_OPERATOR_MAP) {
                    break; // Stop if we encounter another operator
                }
                // Only add more terms if the current token is a valid term starter
                if (this.current && [TOKEN.IDENTIFIER, TOKEN.STRING, TOKEN.LPAREN, TOKEN.LBRACE, TOKEN.LBRACKET].includes(this.current.type)) {
                    this.recursionDepth++;
                    if (this.recursionDepth > this.maxRecursionDepth) {
                        throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
                    }
                    terms.push(this.parseTerm());
                    this.recursionDepth--;
                } else {
                    break;
                }
            }
        }
        return terms;
    }
}

function parseTerm(input) {
    if (typeof input !== 'string') return null;
    if (!input.length) return null; // Empty string returns null, no error

    const parser = new NarseseParser(input);
    const parsed = parser.parseMain();
    if (parsed && typeof parsed === 'object' && !parsed.key) {
        parsed.key = input;
    }
    return parsed;
}

export {
    parseTerm
};
