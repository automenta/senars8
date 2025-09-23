import React from 'react';
import {render, screen} from '@testing-library/react';
import {ConnectionProvider} from 'context/ConnectionContext';
import {SettingsProvider} from 'context/SettingsContext';
import StatusPanel from 'features/system/StatusPanel';

describe('StatusPanel', () => {
    it('renders disconnected status by default', () => {
        render(
            <SettingsProvider>
                <ConnectionProvider>
                    <StatusPanel/>
                </ConnectionProvider>
            </SettingsProvider>
        );

        expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });
});
