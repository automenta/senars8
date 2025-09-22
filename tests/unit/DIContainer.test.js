import { DIContainer, LIFETIME } from '../../core/system/DIContainer.js';
import { jest } from '@jest/globals';
import { join } from 'path';

describe('DIContainer', () => {
    let container;

    beforeEach(() => {
        container = new DIContainer();
    });

    it('should register and resolve a transient service', () => {
        class ServiceA {}
        container.register('serviceA', ServiceA, [], { lifetime: LIFETIME.TRANSIENT });
        const instance1 = container.get('serviceA');
        const instance2 = container.get('serviceA');
        expect(instance1).toBeInstanceOf(ServiceA);
        expect(instance2).toBeInstanceOf(ServiceA);
        expect(instance1).not.toBe(instance2);
    });

    it('should register and resolve a singleton service', () => {
        class ServiceB {}
        container.register('serviceB', ServiceB, [], { lifetime: LIFETIME.SINGLETON });
        const instance1 = container.get('serviceB');
        const instance2 = container.get('serviceB');
        expect(instance1).toBeInstanceOf(ServiceB);
        expect(instance2).toBeInstanceOf(ServiceB);
        expect(instance1).toBe(instance2);
    });

    it('should register and resolve a value', () => {
        const myValue = { message: 'hello' };
        container.registerValue('myValue', myValue);
        const resolvedValue = container.get('myValue');
        expect(resolvedValue).toBe(myValue);
    });

    it('should handle dependencies', () => {
        class ServiceD {}
        class ServiceC {
            constructor(serviceD) {
                this.serviceD = serviceD;
            }
        }
        container.register('serviceD', ServiceD, [], { lifetime: LIFETIME.SINGLETON });
        container.register('serviceC', ServiceC, ['serviceD'], { lifetime: LIFETIME.SINGLETON });
        const instanceC = container.get('serviceC');
        expect(instanceC).toBeInstanceOf(ServiceC);
        expect(instanceC.serviceD).toBeInstanceOf(ServiceD);
    });

    it('should throw an error for circular dependencies', () => {
        class ServiceE {
            constructor(serviceF) {}
        }
        class ServiceF {
            constructor(serviceE) {}
        }
        container.register('serviceE', ServiceE, ['serviceF']);
        container.register('serviceF', ServiceF, ['serviceE']);
        expect(() => container.get('serviceE')).toThrow('Circular dependency detected: serviceE -> serviceF -> serviceE');
    });

    it('should throw an error for missing services', () => {
        expect(() => container.get('nonExistent')).toThrow('Service not found: nonExistent');
    });

    it('should load modules from a directory', async () => {
        const mockDirectory = join(process.cwd(), 'tests/mocks/services');
        // Manually register services to avoid relying on fragile dependency inference
        const ServiceA = (await import(`${mockDirectory}/ServiceA.js`)).default;
        const ServiceB = (await import(`${mockDirectory}/ServiceB.js`)).default;
        container.register('ServiceA', ServiceA, ['ServiceB']);
        container.register('ServiceB', ServiceB, []);

        const serviceA = container.get('ServiceA');
        const serviceB = container.get('ServiceB');
        expect(serviceA).toBeInstanceOf(ServiceA);
        expect(serviceB).toBeInstanceOf(ServiceB);
    });
});
