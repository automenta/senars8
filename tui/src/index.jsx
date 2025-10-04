#!/usr/bin/env node

import {render} from 'ink';
import {default as React} from 'react';
import App from './App.jsx';

// Start the Ink application
render(React.createElement(App));