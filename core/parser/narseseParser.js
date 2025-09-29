import lexer from './lexer.js';
import {OP, TOKEN} from '../config/constants.js';

const UNARY_OPERATOR_MAP = {
    [TOKEN.NEGATION]: OP.NEGATION,
};

const PREFIX_OPERATOR_MAP = {
    [TOKEN.OPERATOR]: OP.OPERATION,
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
        this.lexer = lexer.clone().reset(input);
        this.current = null;
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
        };
        const parser = this.current ? parsers[this.current.type] : null;
        if (parser) return parser();
        throw new Error(`Unexpected token '${this.current?.type || 'EOF'}'`);
    }

    parseNumber() {
        return {
            type: OP.NUMBER,
            value: parseFloat(this.consume(TOKEN.NUMBER))
        };
    }

    parseCompoundTerm() {
        this.consume(TOKEN.LPAREN);
        let term;
        if (this.current?.type in PREFIX_OPERATOR_MAP) {
            term = this.parsePrefixTerm();
        } else if (this.current?.type in OPERATOR_MAP) {
            term = this.parseOperator();
        } else {
            let subject = null;
            if (!(this.current?.type in BINARY_RELATION_MAP)) {
                subject = this.parseTerm();
            }

            if (this.current?.type in BINARY_RELATION_MAP) {
                const relationType = BINARY_RELATION_MAP[this.current.type];
                term = this.parseBinaryRelation(subject, this.current.type, relationType);
            } else {
                term = subject;
            }
        }
        this.consume(TOKEN.RPAREN);
        return term;
    }

    parsePrefixTerm() {
        const operatorTokenType = this.current.type;
        const operatorTokenValue = this.current.value;
        this.consume(operatorTokenType);
        const term = this.parseTerm();
        return {
            type: PREFIX_OPERATOR_MAP[operatorTokenType],
            operator: operatorTokenValue,
            term,
        };
    }

    parseOperator() {
        const operatorTokenType = this.current.type;
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
            type: OPERATOR_MAP[operatorTokenType],
            ...result
        };
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        this.consume(tokenType);
        const predicate = this.match(TOKEN.RPAREN) ? null : this.parseTerm();
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
        return {
            type: OP.ATOMIC,
            key: token.value
        };
    }

    parseVariable(tokenType, variableType) {
        return {
            type: variableType,
            name: this.consume(tokenType)
        };
    }

    parseTermList(closingToken) {
        const terms = [];
        if (!this.match(closingToken)) {
            do {
                terms.push(this.parseTerm());
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
