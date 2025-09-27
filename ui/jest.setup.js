
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
}));
