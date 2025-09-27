import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../App.jsx');

test('renders mock app', () => {
  render(<App />);
  expect(screen.getByText('Hello, World!')).toBeInTheDocument();
});
