import {describe, expect, test} from 'vitest';
import {parseTerm} from '../../coreagent/parser/narseseParser.js';
import {OP} from '../../core/config/constants.js';

describe('Narsese Parser Infix and Error Handling', () => {
    test('should handle simple infix conjunction', () => {
        const input = '(a & b)';
        const expected = {
            type: OP.CONJUNCTION,
            terms: [
                {type: OP.ATOMIC, key: 'a'},
                {type: OP.ATOMIC, key: 'b'},
            ],
            key: '(a & b)',
        };
        expect(parseTerm(input)).toEqual(expected);
    });

    test('should handle chained infix conjunction', () => {
        const input = '(a & b & c)';
        const expected = {
            type: OP.CONJUNCTION,
            terms: [
                {type: OP.ATOMIC, key: 'a'},
                {type: OP.ATOMIC, key: 'b'},
                {type: OP.ATOMIC, key: 'c'},
            ],
            key: '(a & b & c)',
        };
        expect(parseTerm(input)).toEqual(expected);
    });

    test('should throw an error for missing subject in binary relation', () => {
        const input = '( --> b)';
        expect(() => parseTerm(input)).toThrow("Missing subject for binary relation 'arrow'");
    });

    test('should correctly parse a complex statement with multiple operators', () => {
        const input = '((a & b) --> c)';
        const expected = {
            type: OP.INHERITANCE,
            subject: {
                type: OP.CONJUNCTION,
                terms: [
                    {type: OP.ATOMIC, key: 'a'},
                    {type: OP.ATOMIC, key: 'b'},
                ],
                key: '(a & b)',
            },
            predicate: {type: OP.ATOMIC, key: 'c'},
            key: '((a & b) --> c)',
        };
        expect(parseTerm(input)).toEqual(expected);
    });
});