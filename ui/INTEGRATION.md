# @ui/**, @core/**, @agent/** Integration Documentation

## Overview

This document describes the implementation of the UI/Agent/Core integration modules that provide enhanced functionality
to the SeNARS IDE.

## Implemented Features

### 1. Alias-Based Imports

- **@ui/**: Points to UI components and utilities (`/ui/src`)
- **@core/**: Points to Core module functionality (`/core`)
- **@agent/**: Points to Agent module functionality (`/agent`)

### 2. Agent Integration Service

- `agentIntegration.js` provides high-level interface between UI and backend agent
- Supports operations like processing Narsese, getting agent state, and sending commands
- Includes validation and error handling for agent operations

### 3. Enhanced Core Integration Utilities

- `coreIntegration.js` provides utilities for processing core data for UI display
- Functions include Narsese validation, task creation, and data formatting
- Integration with agent service for real-time data processing

### 4. Component Updates

- **StatusPanel**: Enhanced to show detailed agent information
- **ControlPanel**: Updated to use agent integration service
- **TaskContext**: Integrated with agent services for task management
- Various other UI components now leverage the new integration layer

## Key Files

### Services

- `services/agentIntegration.js`: High-level agent integration layer
- `services/agentService.js`: Backend agent communication service
- `utils/coreIntegration.js`: Core module integration utilities

### UI Components

- `features/system/StatusPanel.jsx`: Shows agent status and statistics
- `features/system/ControlPanel.jsx`: Agent control operations
- `context/TaskContext.jsx`: Task management with agent integration

## Usage Examples

### Processing Narsese

```javascript
import { processNarseseThroughAgent } from '@ui/utils/coreIntegration';

try {
  const result = await processNarseseThroughAgent('some Narsese statement.');
  console.log('Result:', result);
} catch (error) {
  console.error('Error processing Narsese:', error.message);
}
```

### Getting Agent Information

```javascript
import agentIntegrationService from '@ui/services/agentIntegration';

const agentInfo = agentIntegrationService.getAgentInfo();
console.log('Agent active:', agentInfo.isActive);
console.log('Beliefs count:', agentInfo.beliefsCount);
```

### Validating Narsese Statements

```javascript
import { validateNarseseStatement } from '@ui/utils/coreIntegration';

const validation = validateNarseseStatement('Some statement.');
if (validation.valid) {
  console.log('Valid statement:', validation.parsed);
} else {
  console.error('Invalid statement:', validation.error);
}
```

## Architecture

The integration follows a layered architecture:

1. **UI Layer**: React components using `@ui/**` imports
2. **Integration Layer**: Services providing high-level APIs using `@core/**` and `@agent/**`
3. **Core Layer**: Core module providing NARS functionality
4. **Agent Layer**: Agent module managing NARS cycles and reasoning

## Error Handling

The system includes comprehensive error handling:

- Input validation for all user inputs
- Network error handling for agent communication
- Graceful degradation when services are unavailable
- User-friendly error messages through notification service

## Testing

Core functionality is tested in the existing test suite. Integration tests are challenging due to complex dependencies
in the core modules but the service-level tests pass successfully.