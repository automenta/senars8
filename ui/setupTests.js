import {vi} from 'vitest';

vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useState: vi.fn(),
    };
});
