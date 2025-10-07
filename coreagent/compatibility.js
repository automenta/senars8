// Compatibility layer for coreagent system
// This file provides compatibility with the existing core/ system

// Import SystemCommands and SystemEvents from the core system
import {SystemCommands} from '../core/system/SystemCommands.js';
import {SystemEvents} from '../core/system/SystemEvents.js';

// Re-export for use in coreagent subsystems
export {SystemCommands, SystemEvents};

// Additional compatibility utilities
export const CompatibilityUtils = {
    // Convert coreagent events to core system events
    convertEvent(event, data) {
        return {event, data, timestamp: Date.now()};
    },

    // Convert coreagent commands to core system commands
    convertCommand(command, data) {
        return {command, data};
    },

    // Ensure backward compatibility for message formats
    normalizeMessage(message) {
        if (typeof message === 'string') {
            return {type: message, data: {}};
        }
        return message;
    }
};

export default {SystemCommands, SystemEvents, CompatibilityUtils};