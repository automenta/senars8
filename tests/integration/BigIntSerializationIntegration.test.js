import {describe, expect, it} from 'vitest';

describe('BigInt Serialization Unit Tests', () => {
    const bigIntSerializer = (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    };

    const bigIntDeserializer = (key, value) => {
        if (typeof value === 'string' && /^\d+n?$/.test(value)) {
            return BigInt(value.replace('n', ''));
        }
        return value;
    };

    it('should serialize BigInt values to strings', () => {
        const testData = {
            id: 123,
            timestamp: BigInt(1640995200000), // Jan 1, 2022 in milliseconds
            count: BigInt(9007199254740992), // MAX_SAFE_INTEGER + 1
            name: 'test'
        };

        const serialized = JSON.stringify(testData, bigIntSerializer);
        const parsed = JSON.parse(serialized);

        expect(parsed.id).toBe(123);
        expect(parsed.name).toBe('test');
        expect(parsed.timestamp).toBe('1640995200000');
        expect(parsed.count).toBe('9007199254740992');
    });

    it('should deserialize BigInt strings back to BigInt', () => {
        const serializedData = JSON.stringify({
            timestamp: '1640995200000',
            count: '9007199254740992n',
            regularString: 'hello42'
        });

        const parsed = JSON.parse(serializedData, bigIntDeserializer);

        expect(parsed.timestamp).toBe(BigInt(1640995200000));
        expect(parsed.count).toBe(BigInt(9007199254740992));
        expect(parsed.regularString).toBe('hello42'); // Strings that don't match BigInt pattern remain strings
    });

    it('should handle round-trip serialization/deserialization', () => {
        const original = {
            taskId: BigInt(123456789),
            creationTime: BigInt(Date.now()),
            priority: 0.8,
            nested: {
                subId: BigInt(987654321),
                metadata: {
                    version: BigInt(1)
                }
            }
        };

        // Serialize
        const serialized = JSON.stringify(original, bigIntSerializer);
        // Deserialize
        const deserialized = JSON.parse(serialized, bigIntDeserializer);

        expect(deserialized.taskId).toBe(original.taskId);
        expect(deserialized.creationTime).toBe(original.creationTime);
        expect(deserialized.nested.subId).toBe(original.nested.subId);
        expect(deserialized.nested.metadata.version).toBe(original.nested.metadata.version);
        expect(deserialized.priority).toBe(0.8); // Non-BigInt values unchanged
    });

    it('should handle large BigInt values beyond MAX_SAFE_INTEGER', () => {
        const largeNumber = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1000);

        const testData = {
            largeValue: largeNumber,
            safeValue: BigInt(Number.MAX_SAFE_INTEGER)
        };

        const serialized = JSON.stringify(testData, bigIntSerializer);
        const deserialized = JSON.parse(serialized, bigIntDeserializer);

        expect(deserialized.largeValue).toBe(largeNumber);
        expect(deserialized.safeValue).toBe(BigInt(Number.MAX_SAFE_INTEGER));
        expect(() => BigInt(deserialized.largeValue)).not.toThrow(); // Should be valid BigInt
    });

    it('should preserve non-BigInt values during serialization', () => {
        const testData = {
            string: 'hello',
            number: 42,
            boolean: true,
            null: null,
            undefined: undefined,
            bigint: BigInt(123),
            array: [1, BigInt(2), 3],
            object: { nested: BigInt(456) }
        };

        const serialized = JSON.stringify(testData, bigIntSerializer);
        const deserialized = JSON.parse(serialized, bigIntDeserializer);

        expect(deserialized.string).toBe('hello');
        expect(deserialized.number).toBe(42);
        expect(deserialized.boolean).toBe(true);
        expect(deserialized.null).toBe(null);
        expect(deserialized.bigint).toBe(BigInt(123));
        expect(deserialized.array[0]).toBe(1);
        expect(deserialized.array[1]).toBe(BigInt(2));
        expect(deserialized.array[2]).toBe(3);
        expect(deserialized.object.nested).toBe(BigInt(456));
    });
});