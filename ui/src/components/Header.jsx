import React from 'react';
import { GlobalSearch } from '@ui/components';

const Header = () => (
    <header className="app-header" role="banner">
        <h1>SeNARS IDE</h1>
        <div className="header-controls">
            <GlobalSearch />
        </div>
    </header>
);

export default Header;