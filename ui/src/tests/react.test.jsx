import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {vi, describe, it, expect, beforeEach} from 'vitest';
import App from '../App';
import {ThemeProvider} from '../context/ThemeProvider';
import {AgentProvider} from '../context/AgentProvider';
import {NotificationProvider} from '../context/NotificationContext';
import {SearchProvider} from '../context/SearchContext';


















describe('App Component Integration Tests', () => {
  const renderApp = () => {
    return render(
      <ThemeProvider>
        <AgentProvider>
          <NotificationProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </NotificationProvider>
        </AgentProvider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and displays main app structure', () => {
    expect(() => renderApp()).not.toThrow();

    // Check that main app elements are present
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();

    // Check that the app container is present with correct attributes
    const appContainer = document.querySelector('.app-container');
    expect(appContainer).toBeInTheDocument();
    expect(appContainer).toHaveAttribute('data-theme');
  });

  it('renders all provider layers correctly', () => {
    renderApp();

    // Verify that the app renders with all the expected structure
    // This tests that all providers are working together correctly
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });
});

// Additional tests for provider hierarchy
describe('React Context Provider Hierarchy', () => {
  it('provides all required contexts to child components', () => {
    // This test ensures the provider order is correct to prevent context errors
    expect(() => render(
      <ThemeProvider>
        <AgentProvider>
          <NotificationProvider>
            <SearchProvider>
              <App />
            </SearchProvider>
          </NotificationProvider>
        </AgentProvider>
      </ThemeProvider>
    )).not.toThrow();
  });
});