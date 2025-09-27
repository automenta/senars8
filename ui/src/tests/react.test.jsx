import React from 'react';
import {expect, test} from 'vitest';

test('should import react without errors', () => {
    expect(React).toBeDefined();
});