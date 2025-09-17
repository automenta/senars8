import lexer from './lexer.js';
import {
    TERM_TYPES,
    TOKEN_TYPES
} from '../config/constants.js';

const UNARY_OPERATOR_MAP = {
    [TOKEN_TYPES.NEGATION]: TERM_TYPES.NEGATION,
};

const TEMPORAL_OPERATOR_MAP = {
    [TOKEN_TYPES.ALWAYS]: TERM_TYPES.ALWAYS,
    [TOKEN_TYPES.EVENTUALLY]: TERM_TYPES.EVENTUALLY,
    [TOKEN_TYPES.NEXT]: TERM_TYPES.NEXT,
    [TOKEN_TYPES.PREVIOUS]: TERM_TYPES.PREVIOUS,
};

const BINARY_OPERATOR_MAP = {
    [TOKEN_TYPES.CONJUNCTION]: TERM_TYPES.CONJUNCTION,
    [TOKEN_TYPES.SEQUENTIAL_CONJUNCTION]: TERM_TYPES.SEQUENTIAL_CONJUNCTION,
    [TOKEN_TYPES.PARALLEL_CONJUNCTION]: TERM_TYPES.PARALLEL_CONJUNCTION,
    [TOKEN_TYPES.DISJUNCTION]: TERM_TYPES.DISJUNCTION,
    [TOKEN_TYPES.EXTENSIONAL_DIFFERENCE]: TERM_TYPES.EXTENSIONAL_DIFFERENCE,
    [TOKEN_TYPES.INTENSIONAL_DIFFERENCE]: TERM_TYPES.INTENSIONAL_DIFFERENCE,
    [TOKEN_TYPES.PRODUCT]: TERM_TYPES.PRODUCT,
};

const OPERATOR_MAP = {
    ...UNARY_OPERATOR_MAP,
    ...TEMPORAL_OPERATOR_MAP,
    ...BINARY_OPERATOR_MAP,
};

const BINARY_RELATION_MAP = {
    [TOKEN_TYPES.ARROW]: TERM_TYPES.INHERITANCE,
    [TOKEN_TYPES.IMPLIES]: TERM_TYPES.IMPLICATION,
    [TOKEN_TYPES.INSTANCE]: TERM_TYPES.INSTANCE,
    [TOKEN_TYPES.PROPERTY]: TERM_TYPES.PROPERTY,
    [TOKEN_TYPES.EQUIVALENCE]: TERM_TYPES.EQUIVALENCE,
    [TOKEN_TYPES.SIMILARITY]: TERM_TYPES.SIMILARITY,
    [TOKEN_TYPES.RETROSPECTION]: TERM_TYPES.RETROSPECTIVE_IMPLICATION,
    [TOKEN_TYPES.PREDICTION]: TERM_TYPES.PREDICTIVE_IMPLICATION,
    [TOKEN_TYPES.CONCURRENT]: TERM_TYPES.CONCURRENT_IMPLICATION,
    [TOKEN_TYPES.UNTIL]: TERM_TYPES.UNTIL,
    [TOKEN_TYPES.SINCE]: TERM_TYPES.SINCE,
};

class NarseseParser {
    constructor(input) {
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    next() {
        this.current = this.lexer.next();
        while (this.current && this.current.type === TOKEN_TYPES.WHITESPACE) {
            this.current = this.lexer.next();
        }
        return this.current;
    }

    match(type) {
        return this.current && this.current.type === type;
    }

    consume(type) {
        if (this.match(type)) {
            const {
                value
            } = this.current;
            this.next();
            return value;
        }
        throw new Error(`Expected token type '${type}', but found '${this.current ? this.current.type : 'EOF'}'`);
    }

    parseMain() {
        const result = this.parseStatement();
        if (this.current) {
            throw new Error(`Unexpected token '${this.current.type}' at end of input`);
        }
        return result;
    }

    parseStatement() {
        const term = this.parseTerm();

        let punctuation = null;
        if (this.match(TOKEN_TYPES.BELIEF)) {
            punctuation = this.consume(TOKEN_TYPES.BELIEF);
        } else if (this.match(TOKEN_TYPES.GOAL)) {
            punctuation = this.consume(TOKEN_TYPES.GOAL);
        } else if (this.match(TOKEN_TYPES.QUESTION)) {
            punctuation = this.consume(TOKEN_TYPES.QUESTION);
        }

        let truthValue = null;
        if (this.match(TOKEN_TYPES.LPAREN)) {
            truthValue = this.parseTruthValue();
        }

        if (punctuation || truthValue) {
            return {
                type: TERM_TYPES.STATEMENT,
                term,
                punctuation,
                truthValue
            };
        }

        return term;
    }

    parseTruthValue() {
        this.consume(TOKEN_TYPES.LPAREN);
        const frequency = this.parseNumber();
        this.consume(TOKEN_TYPES.COMMA);
        const confidence = this.parseNumber();
        this.consume(TOKEN_TYPES.RPAREN);
        return {
            frequency,
            confidence
        };
    }

    parseTerm() {
        if (this.match(TOKEN_TYPES.LPAREN)) {
            return this.parseCompoundTerm();
        } else if (this.match(TOKEN_TYPES.LBRACE)) {
            return this.parseExtensionalSet();
        } else if (this.match(TOKEN_TYPES.LBRACKET)) {
            return this.parseIntensionalSet();
        } else if (this.match(TOKEN_TYPES.IDENTIFIER) || this.match(TOKEN_TYPES.STRING)) {
            return this.parseAtomicTerm();
        } else if (this.match(TOKEN_TYPES.INDEPENDENT_VAR)) {
            return this.parseIndependentVariable();
        } else if (this.match(TOKEN_TYPES.DEPENDENT_VAR)) {
            return this.parseDependentVariable();
        } else if (this.match(TOKEN_TYPES.QUERY_VAR)) {
            return this.parseQueryVariable();
        } else if (this.match(TOKEN_TYPES.NUMBER)) {
            return this.parseNumber();
        }
        throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
    }

    parseNumber() {
        const value = this.consume(TOKEN_TYPES.NUMBER);
        return {
            type: TERM_TYPES.NUMBER,
            value: parseFloat(value)
        };
    }

    parseCompoundTerm() {
        this.consume(TOKEN_TYPES.LPAREN);

        if (this.matchOperator()) {
            return this.parseOperator();
        }

        const subject = this.parseTerm();
        const relationType = BINARY_RELATION_MAP[this.current?.type];

        if (relationType) {
            return this.parseBinaryRelation(subject, this.current.type, relationType);
        }

        this.consume(TOKEN_TYPES.RPAREN);
        return subject;
    }

    matchOperator() {
        return this.current && this.current.type in OPERATOR_MAP;
    }

    parseOperator() {
        const operatorToken = this.current;
        const operatorType = operatorToken.type;
        this.next(); // Consume the operator token
        this.consume(TOKEN_TYPES.COMMA);

        const isBinary = operatorType in BINARY_OPERATOR_MAP;
        const result = isBinary ?
            {
                terms: this.parseTermList()
            } :
            {
                term: this.parseTerm()
            };

        this.consume(TOKEN_TYPES.RPAREN);

        return {
            type: OPERATOR_MAP[operatorType],
            ...result
        };
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        this.consume(tokenType);
        const predicate = this.parseTerm();
        this.consume(TOKEN_TYPES.RPAREN);
        return {
            type: relationType,
            subject,
            predicate
        };
    }

    parseExtensionalSet() {
        this.consume(TOKEN_TYPES.LBRACE);
        const terms = this.parseTermList();
        this.consume(TOKEN_TYPES.RBRACE);
        return {
            type: TERM_TYPES.EXTENSIONAL_SET,
            terms
        };
    }

    parseIntensionalSet() {
        this.consume(TOKEN_TYPES.LBRACKET);
        const terms = this.parseTermList();
        this.consume(TOKEN_TYPES.RBRACKET);
        return {
            type: TERM_TYPES.INTENSIONAL_SET,
            terms
        };
    }

    parseAtomicTerm() {
        const token = this.current;
        this.next(); // consume token
        return {
            type: TERM_TYPES.ATOMIC,
            key: token.value
        };
    }

    parseVariable(tokenType, variableType) {
        const variable = this.consume(tokenType);
        return {
            type: variableType,
            name: variable
        };
    }

    parseIndependentVariable() {
        return this.parseVariable(TOKEN_TYPES.INDEPENDENT_VAR, TERM_TYPES.INDEPENDENT_VARIABLE);
    }

    parseDependentVariable() {
        return this.parseVariable(TOKEN_TYPES.DEPENDENT_VAR, TERM_TYPES.DEPENDENT_VARIABLE);
    }

    parseQueryVariable() {
        return this.parseVariable(TOKEN_TYPES.QUERY_VAR, TERM_TYPES.QUERY_VARIABLE);
    }

    parseTermList() {
        const terms = [];

        if (!this.match(TOKEN_TYPES.RPAREN) && !this.match(TOKEN_TYPES.RBRACE) && !this.match(TOKEN_TYPES.RBRACKET)) {
            terms.push(this.parseTerm());

            while (this.match(TOKEN_TYPES.COMMA)) {
                this.consume(TOKEN_TYPES.COMMA);
                terms.push(this.parseTerm());
            }
        }

        return terms;
    }
}

function parseTerm(input) {
    if (typeof input !== 'string' || input.length === 0) {
        return null;
    }

    const parser = new NarseseParser(input);
    const parsed = parser.parseMain();
    if (parsed) {
        if (typeof parsed === 'object' && !parsed.key) {
            parsed.key = input;
        }
    }
    return parsed;
}

export {
    parseTerm
};
