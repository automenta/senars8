import {expect} from 'vitest';
import MockLM from '../mocks/MockLM.js';
import {join} from 'path';

export async function createDemoTest(demoFn, useMockLM = false) {
    const options = {
        assertions: (system) => {
            expect(system).toBeDefined();
        },
        strategiesPath: join(process.cwd(), 'core/reasoner/strategies')
    };

    if (useMockLM) {
        options.components = {lm: new MockLM()};
    }

    await demoFn(options);
}