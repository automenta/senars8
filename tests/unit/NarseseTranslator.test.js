import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import NarseseTranslator from '../../core/utils/NarseseTranslator.js';
import {OP, PUNCTUATION} from '../../core/config/constants.js';
import * as logger from '../../core/utils/logger.js';

describe('NarseseTranslator', () => {
    let translator;
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        });
        translator = new NarseseTranslator();
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('should create a new NarseseTranslator instance', () => {
        expect(translator).toBeInstanceOf(NarseseTranslator);
    });

    test('should convert boolean result to Narsese belief', () => {
        const belief = translator.resultToNarseseBelief(true, 'test_operation');
        expect(belief.term).toBe('(test_operation --> success)');
        expect(belief.truth.frequency).toBe(0.9);
        expect(belief.truth.confidence).toBe(0.9);
        expect(belief.punctuation).toBe(PUNCTUATION.BELIEF);
    });

    test('should convert string result to Narsese belief', () => {
        const belief = translator.resultToNarseseBelief('hello', 'greet');
        expect(belief.term).toBe('(greet --> hello)');
    });

    test('should convert number result to Narsese belief', () => {
        const belief = translator.resultToNarseseBelief(42, 'calculate');
        expect(belief.term).toBe('(calculate --> 42)');
    });

    test('should convert object result to Narsese belief', () => {
        const result = {status: 'ok', value: 100};
        const belief = translator.resultToNarseseBelief(result, 'process');
        expect(belief.term).toContain('process');
        expect(belief.term).toContain('status');
        expect(belief.term).toContain('value');
    });

    test('should handle error results', () => {
        const result = {error: 'something went wrong'};
        const belief = translator.resultToNarseseBelief(result, 'failing_op');
        expect(belief.term).toContain('error');
        expect(belief.term).toContain('something went wrong');
    });

    test('should create Narsese goal from action', () => {
        const goal = translator.createNarseseGoal('move', ['north']);
        expect(goal.term).toBe('move(north)');
        expect(goal.punctuation).toBe(PUNCTUATION.GOAL);
    });

    test('should create Narsese goal with multiple args', () => {
        const goal = translator.createNarseseGoal('pickup', ['book', 'table']);
        expect(goal.term).toBe('pickup(book, table)');
    });

    test('should extract arguments from Narsese goal', () => {
        const narseseGoal = {
            term: {
                type: OP.OPERATION,
                subject: {type: OP.ATOMIC, key: 'move'},
                predicate: {
                    type: OP.PRODUCT,
                    terms: [
                        {type: OP.ATOMIC, key: 'north'}
                    ]
                }
            }
        };

        const extracted = translator.extractArgumentsFromGoal(narseseGoal);
        expect(extracted.operationName).toBe('move');
        expect(extracted.args).toEqual(['north']);
    });

    test('should extract multiple arguments from Narsese goal', () => {
        const narseseGoal = {
            term: {
                type: OP.OPERATION,
                subject: {type: OP.ATOMIC, key: 'pickup'},
                predicate: {
                    type: OP.PRODUCT,
                    terms: [
                        {type: OP.ATOMIC, key: 'book'},
                        {type: OP.ATOMIC, key: 'shelf'}
                    ]
                }
            }
        };

        const extracted = translator.extractArgumentsFromGoal(narseseGoal);
        expect(extracted.operationName).toBe('pickup');
        expect(extracted.args).toEqual(['book', 'shelf']);
    });

    test('should handle single argument without PRODUCT', () => {
        const narseseGoal = {
            term: {
                type: OP.OPERATION,
                subject: {type: OP.ATOMIC, key: 'read'},
                predicate: {type: OP.ATOMIC, key: 'book'}
            }
        };

        const extracted = translator.extractArgumentsFromGoal(narseseGoal);
        expect(extracted.operationName).toBe('read');
        expect(extracted.args).toEqual(['book']);
    });

    test('should handle non-operation terms', () => {
        const narseseGoal = {
            term: {
                type: OP.INHERITANCE,
                subject: {type: OP.ATOMIC, key: 'bird'},
                predicate: {type: OP.ATOMIC, key: 'animal'}
            }
        };

        const extracted = translator.extractArgumentsFromGoal(narseseGoal);
        expect(extracted.operationName).toBeNull();
        expect(extracted.args).toEqual([]);
    });

    test('should validate source term in resultToNarseseBelief', () => {
        expect(() => {
            translator.resultToNarseseBelief('result', '');
        }).toThrow('Source term must be a non-empty string');

        expect(() => {
            translator.resultToNarseseBelief('result', null);
        }).toThrow('Source term must be a non-empty string');
    });

    test('should validate truth values in resultToNarseseBelief', () => {
        expect(() => {
            translator.resultToNarseseBelief('result', 'test', {frequency: 1.5});
        }).toThrow('Frequency must be a number between 0 and 1');

        expect(() => {
            translator.resultToNarseseBelief('result', 'test', {confidence: -0.1});
        }).toThrow('Confidence must be a number between 0 and 1');
    });

    test('should convert Narsese belief back to value', () => {
        const narseseBelief = {
            term: '(animal --> living)'
        };

        const value = translator.narseseToValue(narseseBelief);
        expect(value).toEqual({
            subject: 'animal',
            predicate: 'living'
        });
    });

    test('should handle invalid Narsese goal in extractArgumentsFromGoal', () => {
        expect(() => {
            translator.extractArgumentsFromGoal(null);
        }).toThrow('Invalid Narsese goal: missing term');

        expect(() => {
            translator.extractArgumentsFromGoal({});
        }).toThrow('Invalid Narsese goal: missing term');
    });
});