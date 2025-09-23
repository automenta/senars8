import MockLM from '../mocks/MockLM.js';

export function createDemoTest(demoName, demoFn, useMockLM = false) {
    test(`${demoName} should run without errors`, async () => {
        const options = {
            assertions: (system) => {
                expect(system).toBeDefined();
            }
        };

        if (useMockLM) {
            options.components = {lm: new MockLM()};
        }

        await demoFn(options);
    });
}
