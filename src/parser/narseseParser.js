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
        this.lexer = lexer.clone();
        this.lexer.reset(input);
        this.current = null;
        this.next();
    }

    next() {
        this.current = this.lexer.next();
        while (this.current && this.current.type === TOKEN.WHITESPACE) {
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
        if (this.match(TOKEN.BELIEF)) {
            punctuation = this.consume(TOKEN.BELIEF);
        } else if (this.match(TOKEN.GOAL)) {
            punctuation = this.consume(TOKEN.GOAL);
        } else if (this.match(TOKEN.QUESTION)) {
            punctuation = this.consume(TOKEN.QUESTION);
        }

        let truthValue = null;
        if (this.match(TOKEN.LPAREN)) {
            truthValue = this.parseTruthValue();
        }

        if (punctuation || truthValue) {
            return {
                type: OP.STATEMENT,
                term,
                punctuation,
                truthValue
            };
        }

        return term;
    }

    parseTruthValue() {
        this.consume(TOKEN.LPAREN);
        const frequency = this.parseNumber();
        this.consume(TOKEN.COMMA);
        const confidence = this.parseNumber();
        this.consume(TOKEN.RPAREN);
        return {
            frequency,
            confidence
        };
    }

    parseTerm() {
        if (this.match(TOKEN.LPAREN)) {
            return this.parseCompoundTerm();
        } else if (this.match(TOKEN.LBRACE)) {
            return this.parseExtensionalSet();
        } else if (this.match(TOKEN.LBRACKET)) {
            return this.parseIntensionalSet();
        } else if (this.match(TOKEN.IDENTIFIER) || this.match(TOKEN.STRING)) {
            return this.parseAtomicTerm();
        } else if (this.match(TOKEN.INDEPENDENT_VAR)) {
            return this.parseIndependentVariable();
        } else if (this.match(TOKEN.DEPENDENT_VAR)) {
            return this.parseDependentVariable();
        } else if (this.match(TOKEN.QUERY_VAR)) {
            return this.parseQueryVariable();
        } else if (this.match(TOKEN.NUMBER)) {
            return this.parseNumber();
        }
        throw new Error(`Unexpected token '${this.current ? this.current.type : 'EOF'}' when parsing term`);
    }

    parseNumber() {
        const value = this.consume(TOKEN.NUMBER);
        return {
            type: OP.NUMBER,
            value: parseFloat(value)
        };
    }

    parseCompoundTerm() {
        this.consume(TOKEN.LPAREN);

        if (this.matchOperator()) {
            return this.parseOperator();
        }

        const subject = this.parseTerm();
        const relationType = BINARY_RELATION_MAP[this.current?.type];

        if (relationType) {
            return this.parseBinaryRelation(subject, this.current.type, relationType);
        }

        this.consume(TOKEN.RPAREN);
        return subject;
    }

    matchOperator() {
        return this.current && this.current.type in OPERATOR_MAP;
    }

    parseOperator() {
        const operatorToken = this.current;
        const operatorType = operatorToken.type;
        this.next(); // Consume the operator token
        this.consume(TOKEN.COMMA);

        const isBinary = operatorType in BINARY_OPERATOR_MAP;
        const result = isBinary ?
            {
                terms: this.parseTermList()
            } :
            {
                term: this.parseTerm()
            };

        this.consume(TOKEN.RPAREN);

        return {
            type: OPERATOR_MAP[operatorType],
            ...result
        };
    }

    parseBinaryRelation(subject, tokenType, relationType) {
        this.consume(tokenType);
        const predicate = this.parseTerm();
        this.consume(TOKEN.RPAREN);
        return {
            type: relationType,
            subject,
            predicate
        };
    }

    parseExtensionalSet() {
        this.consume(TOKEN.LBRACE);
        const terms = this.parseTermList();
        this.consume(TOKEN.RBRACE);
        return {
            type: OP.EXTENSIONAL_SET,
            terms
        };
    }

    parseIntensionalSet() {
        this.consume(TOKEN.LBRACKET);
        const terms = this.parseTermList();
        this.consume(TOKEN.RBRACKET);
        return {
            type: OP.INTENSIONAL_SET,
            terms
        };
    }

    parseAtomicTerm() {
        const token = this.current;
        this.next(); // consume token
        return {
            type: OP.ATOMIC,
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
        return this.parseVariable(TOKEN.INDEPENDENT_VAR, OP.INDEPENDENT_VARIABLE);
    }

    parseDependentVariable() {
        return this.parseVariable(TOKEN.DEPENDENT_VAR, OP.DEPENDENT_VARIABLE);
    }

    parseQueryVariable() {
        return this.parseVariable(TOKEN.QUERY_VAR, OP.QUERY_VARIABLE);
    }

    parseTermList() {
        const terms = [];

        if (!this.match(TOKEN.RPAREN) && !this.match(TOKEN.RBRACE) && !this.match(TOKEN.RBRACKET)) {
            terms.push(this.parseTerm());

            while (this.match(TOKEN.COMMA)) {
                this.consume(TOKEN.COMMA);
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
