import { parseTerm, validateTermKey } from '../../core/parser/index.js';
import { OP } from '../../core/config/constants.js';

describe('Operation Operator Parser', () => {
    test('should parse basic operation operator', () => {
        const result = parseTerm('move()');
        expect(result).toBeDefined();
        expect(result.type).toBe(OP.OPERATION);
        expect(result.subject).toBeDefined();
        expect(result.predicate).toBeDefined();
        expect(result.predicate.type).toBe(OP.PRODUCT);
    });

    test('should parse operation with arguments', () => {
        const result = parseTerm('move(left)');
        expect(result).toBeDefined();
        expect(result.type).toBe(OP.OPERATION);
        expect(result.subject).toBeDefined();
        expect(result.predicate).toBeDefined();
        expect(result.predicate.type).toBe(OP.PRODUCT);
        expect(result.predicate.terms).toBeDefined();
        expect(result.predicate.terms.length).toBe(1);
    });

    test('should parse operation with multiple arguments', () => {
        const result = parseTerm('open(door, kitchen)');
        expect(result).toBeDefined();
        expect(result.type).toBe(OP.OPERATION);
        expect(result.subject).toBeDefined();
        expect(result.predicate).toBeDefined();
        expect(result.predicate.type).toBe(OP.PRODUCT);
        expect(result.predicate.terms).toBeDefined();
        expect(result.predicate.terms.length).toBe(2); // door and kitchen
    });

    test('should generate proper term key for operation', () => {
        const result = parseTerm('move()');
        // Testing that the operation can be processed without error and key matches
        expect(result).toBeDefined();
        expect(result.type).toBe(OP.OPERATION);
        expect(result.key).toBe('move()'); // Check round-trip
    });

    test('should validate operation syntax properly', () => {
        // Valid operations
        expect(validateTermKey('move()')).toBe(true);
        expect(validateTermKey('move(left)')).toBe(true);
        expect(validateTermKey('open(door, kitchen)')).toBe(true);
    });

    test('should handle nested expressions with operation', () => {
        const result = parseTerm('(move() ==> at)');
        expect(result).toBeDefined();
        expect(result.type).toBe(OP.IMPLICATION);
        expect(result.subject.type).toBe(OP.OPERATION);
        expect(result.predicate.type).toBe(OP.ATOMIC);
    });

    test('should support product shorthand including empty product ()', () => {
        // Test empty product shorthand
        const result1 = parseTerm('()');
        expect(result1).toBeDefined();
        expect(result1.type).toBe(OP.PRODUCT);
        expect(Array.isArray(result1.terms)).toBe(true);
        expect(result1.terms.length).toBe(0);
        
        // Test product with arguments
        const result2 = parseTerm('(left, right)');
        expect(result2).toBeDefined();
        expect(result2.type).toBe(OP.PRODUCT);
        expect(Array.isArray(result2.terms)).toBe(true);
        expect(result2.terms.length).toBe(2);
    });
});