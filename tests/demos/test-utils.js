import MockLM from '../mocks/MockLM.js';
import { join } from 'path';

export function createDemoTest(demoName, demoFn, useMockLM = false) {
    test(`${demoName} should run without errors`, async () => {
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
    });
}
