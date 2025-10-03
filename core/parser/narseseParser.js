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
        if (this.current) {
            throw new Error(`Unexpected token '${this.current.type}' at end`);
        }
        return result;
    }

    parseStatement() {
        const term = this.parseTerm();
        const punctuation = this.match(TOKEN.BELIEF) ? this.consume(TOKEN.BELIEF) :
            this.match(TOKEN.GOAL) ? this.consume(TOKEN.GOAL) :
                this.match(TOKEN.QUESTION) ? this.consume(TOKEN.QUESTION) : null;
        const truthValue = this.match(TOKEN.LPAREN) ? this.parseTruthValue() : null;

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
            } else if (this.current?.type in BINARY_OPERATOR_MAP) {
                const terms = [left];
                const operator = this.current.type;
                while (this.match(operator)) {
                    this.consume(operator);
                    terms.push(this.parseTerm());
                }
                term = {type: BINARY_OPERATOR_MAP[operator], terms};
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
                term = left;
            }
        }

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

        this.consume(TOKEN.COMMA);
        const isBinary = operatorTokenType in BINARY_OPERATOR_MAP;
        const result = isBinary ? {
            terms: this.parseTermList(TOKEN.RPAREN)
        } : {
            term: this.parseTerm()
        };
        // this.consume(TOKEN.RPAREN); // This was the bug
        return {
            type: operatorType,
            ...result
        };
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
        const predicate = this.match(TOKEN.RPAREN) ? null : this.parseTerm();
        this.recursionDepth--; // Decrement after the call
        // this.consume(TOKEN.RPAREN); // This was the bug
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
            do {
                // Check recursion depth before recursive call
                this.recursionDepth++;
                if (this.recursionDepth > this.maxRecursionDepth) {
                    throw new Error(`Recursion depth exceeded maximum of ${this.maxRecursionDepth}`);
                }
                terms.push(this.parseTerm());
                this.recursionDepth--; // Decrement after the call
            } while (this.match(TOKEN.COMMA) && this.consume(TOKEN.COMMA));
        }
        return terms;
    }
}

function parseTerm(input) {
    if (typeof input !== 'string' || !input.length) return null;
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
